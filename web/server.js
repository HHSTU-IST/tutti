const http = require("http");
const fs = require("fs");
const path = require("path");

const banks = require("./lib/banks.cjs");
const auth = require("./lib/auth.cjs");
const uploadRules = require("./lib/upload-rules.cjs");
const rateLimit = require("./lib/rate-limit.cjs");
const { createUploadGate } = require("./lib/upload-gate.cjs");
const { ensureWritable, isInsideAppDir } = require("./lib/data-dir.cjs");
const { checkNodeVersion } = require("./lib/node-version.cjs");
const { markBoot, readState } = require("./lib/runtime-state.cjs");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY_BYTES = 1024 * 1024;
// 上传 body 上限不再写死：按当前规则的 maxSizeMb 现算（见 upload-rules.uploadBodyLimitBytes），
// 并用并发闸门兜住同时传输带来的内存峰值，而不是用一个和规则脱节的固定值卡死合规的大文件。
const uploadGate = createUploadGate();

// 是否采信 x-forwarded-for：默认否。只有确信站在可信反向代理后面（平台会覆盖该头）才设
// TUTTI_TRUST_PROXY=1。直连时它可由客户端伪造，盲信等于把限流 key 交给攻击者挑。
const TRUST_PROXY = rateLimit.trustProxyEnabled();
// 登录失败限流：按「IP + 用户名」挡单账号爆破，另有一条更高的按 IP 兜底挡凭证喷洒。
const loginThrottle = rateLimit.createLoginThrottle();

function clientIp(req) {
  return rateLimit.resolveClientIp(req, TRUST_PROXY);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readJsonBody(req, limitBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let settled = false;

    req.on("data", chunk => {
      // 已判定超限或已处理：直接丢弃后续数据，raw 不再增长，内存被卡在 limitBytes 附近。
      if (settled) return;
      raw += chunk;
      if (raw.length > limitBytes) {
        settled = true;
        const error = new Error("请求体过大");
        error.code = "PAYLOAD_TOO_LARGE";
        // 这里不 destroy：过早拆连接会让客户端只看到 ECONNRESET，收不到带根因的响应。
        reject(error);
      }
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("请求体不是合法 JSON"));
      }
    });

    req.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error("请求读取中断"));
    });
  });
}

// 上传超大：先把带根因的 413 写出去，但保持连接、把客户端剩余上传字节排空丢弃
// （data 事件在 settled 后直接 return，不缓冲、内存有界）。
// 不能 destroy、也不能 Connection: close——那会在客户端还在上传时把连接掐断，
// 让它只收到 ECONNRESET 而读不到这个响应。等它传完，自然读到我们先前写好的 413。
function respondUploadError(res, req, error) {
  if (error && error.code === "PAYLOAD_TOO_LARGE") {
    if (!res.headersSent) {
      const body = JSON.stringify({ error: uploadRules.describeUploadOversize() });
      res.writeHead(413, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store"
      });
      res.end(body);
    }
    req.resume();
    return undefined;
  }
  return sendJson(res, 400, { error: error.message });
}

function currentSession(req) {
  const cookies = auth.parseCookies(req.headers.cookie);
  return auth.getSession(cookies[auth.SESSION_COOKIE]);
}

function requireSession(req, res) {
  const session = currentSession(req);
  if (!session) {
    sendJson(res, 401, { error: "未登录或登录已过期" });
    return null;
  }
  return session;
}

// 付费判定始终在服务端完成：未开通课程直接 403，题目根本不会下发到浏览器。
function canAccess(session, courseId) {
  return session.isAdmin || session.unlocked.includes(courseId);
}

// 账号不存在时也照跑一次 pbkdf2 的量级，让「用户名不存在」与「密码错误」耗时接近，
// 堵住用响应时间枚举有效用户名这条路。盐固定即可，结果本来就要丢弃。
const TIMING_GUARD_SALT = "00000000000000000000000000000000";

async function handleLogin(req, res, body) {
  const ip = clientIp(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const gate = loginThrottle.check(ip, username);
  if (gate.blocked) {
    return sendJson(res, 429, {
      error: gate.scope === "ip"
        ? "该来源短时间登录失败过多，请稍后再试"
        : "尝试次数过多，请稍后再试"
    });
  }

  const user = auth.findUser(username);
  let passwordOk = false;
  try {
    // 命中泄露口令的账号即使验对也在下面 403 拒绝，这里只管「密码对不对」。
    passwordOk = user ? await auth.verifyPasswordAsync(user, password) : false;
    // 无论账号是否存在都消耗一次同量级的 pbkdf2，抹平时间差。
    if (!user) await auth.hashPasswordAsync(password, TIMING_GUARD_SALT);
  } catch (error) {
    // pbkdf2 理论上不会在这条路径抛错；真抛了就按验密失败处理（fail closed），不外泄细节。
    passwordOk = false;
  }

  if (!user || !passwordOk) {
    loginThrottle.recordFailure(ip, username);
    return sendJson(res, 401, { error: "用户名或密码错误" });
  }

  // 口令曾随 data/accounts.json 提交进 git 历史（已被还原成明文），验对也不能发会话：先轮换再用。
  if (!auth.ALLOW_LEAKED_PASSWORDS && (await auth.isLeakedPasswordAsync(user))) {
    auth.revokeSessionsForUsernames([user.username]);
    return sendJson(res, 403, {
      error: "该账号仍在使用已公开的默认密码，已停用。请管理员执行：node scripts/manage-accounts.cjs passwd "
        + `${user.username} --random`
    });
  }

  loginThrottle.recordSuccess(ip, username);
  const token = auth.createSession(user);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Set-Cookie": auth.sessionCookie(token, Math.floor(auth.SESSION_TTL_MS / 1000)),
    "Cache-Control": "no-store"
  });
  return res.end(JSON.stringify({ ok: true, user: auth.publicUser(user) }));
}

function handleLogout(req, res) {
  const cookies = auth.parseCookies(req.headers.cookie);
  auth.destroySession(cookies[auth.SESSION_COOKIE]);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Set-Cookie": auth.expiredCookie()
  });
  return res.end(JSON.stringify({ ok: true }));
}

function handleHealth() {
  const state = readState() || {};

  return {
    status: "ok",
    // 重新发布后 boots 若从 1 重新计数、firstBootAt 变了，说明数据目录被平台重建过。
    dataDirBoots: Number(state.boots) || 0,
    dataDirFirstBootAt: state.firstBootAt || "",
    uptimeSec: Math.round(process.uptime()),
    courses: banks.catalog.length
  };
}

function handleCourses(session) {
  return banks.catalog.map(course => ({
    id: course.id,
    title: course.title,
    topicCount: course.topicCount,
    questionTotal: course.questionTotal,
    unlocked: canAccess(session, course.id)
  }));
}

function handleTopics(session, courseId) {
  if (!canAccess(session, courseId)) return { status: 403, payload: { error: "该课程尚未开通" } };

  const course = banks.getCourse(courseId);
  if (!course) return { status: 404, payload: { error: "课程不存在" } };

  return {
    status: 200,
    payload: {
      id: course.id,
      title: course.title,
      topics: [{ key: banks.ALL_TOPICS, name: "全部专题（混合）", ...sumCounts(course.topics) }].concat(course.topics)
    }
  };
}

function sumCounts(topics) {
  return topics.reduce(
    (acc, topic) => ({
      single: acc.single + topic.single,
      judge: acc.judge + topic.judge,
      fill: acc.fill + topic.fill
    }),
    { single: 0, judge: 0, fill: 0 }
  );
}

function handleQuiz(session, body) {
  const courseId = String(body.courseId || "");
  if (!canAccess(session, courseId)) return { status: 403, payload: { error: "该课程尚未开通" } };

  const course = banks.getCourse(courseId);
  if (!course) return { status: 404, payload: { error: "课程不存在" } };

  const topicKey = String(body.topicKey || banks.ALL_TOPICS);
  const count = Math.max(1, Math.min(100, Number(body.count) || 10));
  const types = Array.isArray(body.types) && body.types.length ? body.types : banks.TYPES;

  const quiz = banks.createQuiz(courseId, topicKey, count, types);
  if (!quiz || !quiz.items.length) return { status: 400, payload: { error: "该专题暂无可用题目" } };

  // 正确答案与解析只留在服务端会话里，浏览器拿到的是不含答案的题目。
  auth.setSessionQuiz(session.token, quiz);

  return {
    status: 200,
    payload: {
      courseId,
      courseTitle: course.title,
      topicKey,
      total: quiz.items.length,
      questions: quiz.items.map(banks.toClientQuestion)
    }
  };
}

function handleCheck(session, body) {
  const quiz = auth.getSessionQuiz(session.token);
  if (!quiz) return { status: 400, payload: { error: "当前没有进行中的练习" } };

  const index = Number(body.index);
  const item = quiz.items[index];
  if (!item) return { status: 400, payload: { error: "题目序号无效" } };

  const result = banks.gradeAnswer(item, body.value);

  return {
    status: 200,
    payload: {
      index,
      correct: result.correct,
      correctText: result.correctText,
      correctValue: result.correctValue,
      explain: item.explain || "暂无解析"
    }
  };
}

// 上传规则所有人可读，但只有管理员能改。
function handleReadUploadRules(session) {
  return {
    rules: uploadRules.describeRules(uploadRules.readRules()),
    canEdit: Boolean(session.isAdmin)
  };
}

function handleUpdateUploadRules(session, body) {
  if (!session.isAdmin) return { status: 403, payload: { error: "仅管理员可修改上传规则" } };

  try {
    return { status: 200, payload: { rules: uploadRules.describeRules(uploadRules.writeRules(body)) } };
  } catch (error) {
    return { status: 400, payload: { error: error.message } };
  }
}

function handleUpload(session, body) {
  const courseId = String(body.courseId || "");
  if (!canAccess(session, courseId)) return { status: 403, payload: { error: "该课程尚未开通" } };

  if (typeof body.contentBase64 !== "string" || !body.contentBase64.trim()) {
    return { status: 400, payload: { error: "缺少文件内容" } };
  }

  const contentBase64 = body.contentBase64.trim();
  if (contentBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64)) {
    return { status: 400, payload: { error: "文件内容不是合法的 base64 编码" } };
  }

  const content = Buffer.from(contentBase64, "base64");
  if (!content.length) {
    return { status: 400, payload: { error: "文件内容为空" } };
  }

  try {
    const record = uploadRules.saveUpload({
      courseId,
      username: session.username,
      fileName: String(body.fileName || ""),
      sizeBytes: content.length,
      content
    });
    return { status: 200, payload: { ok: true, upload: record } };
  } catch (error) {
    return { status: error.status || 400, payload: { error: error.message } };
  }
}

// 删上传记录：允许删自己的，管理员可删任何一条。越权与不存在的 id 分别返回 403 / 404。
function handleDeleteUpload(session, id) {
  try {
    const upload = uploadRules.deleteUpload({
      id,
      username: session.username,
      isAdmin: session.isAdmin
    });
    return { status: 200, payload: { ok: true, upload } };
  } catch (error) {
    return { status: error.status || 400, payload: { error: error.message } };
  }
}

async function handleApi(req, res, pathname, body) {
  if (pathname === "/api/login" && req.method === "POST") {
    return await handleLogin(req, res, body);
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    return handleLogout(req, res);
  }

  // 给平台做健康检查用；不暴露路径与版本，只报告「这个数据目录被保留了吗」。
  if (pathname === "/api/health") {
    return sendJson(res, 200, handleHealth());
  }

  const session = requireSession(req, res);
  if (!session) return undefined;

  if (pathname === "/api/me") {
    return sendJson(res, 200, {
      username: session.username,
      role: session.role,
      isAdmin: session.isAdmin,
      unlocked: session.unlocked
    });
  }

  if (pathname === "/api/courses") {
    return sendJson(res, 200, { courses: handleCourses(session) });
  }

  const topicsMatch = /^\/api\/courses\/([\w-]+)\/topics$/.exec(pathname);
  if (topicsMatch) {
    const result = handleTopics(session, topicsMatch[1]);
    return sendJson(res, result.status, result.payload);
  }

  if (pathname === "/api/settings/upload") {
    if (req.method === "PUT") {
      const result = handleUpdateUploadRules(session, body);
      return sendJson(res, result.status, result.payload);
    }
    return sendJson(res, 200, handleReadUploadRules(session));
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    const result = handleUpload(session, body);
    return sendJson(res, result.status, result.payload);
  }

  if (pathname === "/api/uploads") {
    return sendJson(res, 200, {
      uploads: uploadRules.listUploads({ username: session.username, isAdmin: session.isAdmin })
    });
  }

  // 删一条上传记录：DELETE /api/uploads/<记录 id>。id 就是落盘文件名（时间戳-随机串-安全名），
  // 所以不做字符白名单，只要求它不是带斜杠的多段路径。
  const uploadMatch = /^\/api\/uploads\/([^/]+)$/.exec(pathname);
  if (uploadMatch && req.method === "DELETE") {
    const result = handleDeleteUpload(session, decodeURIComponent(uploadMatch[1]));
    return sendJson(res, result.status, result.payload);
  }

  if (pathname === "/api/quiz" && req.method === "POST") {
    const result = handleQuiz(session, body);
    return sendJson(res, result.status, result.payload);
  }

  if (pathname === "/api/quiz/check" && req.method === "POST") {
    const result = handleCheck(session, body);
    return sendJson(res, result.status, result.payload);
  }

  return sendJson(res, 404, { error: "接口不存在" });
}

function serveStatic(req, res, pathname) {
  let relative;
  try {
    relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return sendJson(res, 400, { error: "请求路径编码不合法" });
  }

  const filePath = path.join(PUBLIC_DIR, relative);
  const rel = path.relative(PUBLIC_DIR, filePath);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not Found");
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": content.length
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (!pathname.startsWith("/api/")) {
    return serveStatic(req, res, pathname);
  }

  // 上传单独一条路：先过并发闸门兜内存，body 上限按当前规则现算；
  // 传输层挡下的超大请求回一句和 maxSizeMb 一致的根因，而不是干巴巴的「请求体过大」。
  if (pathname === "/api/upload" && req.method === "POST") {
    if (!uploadGate.tryAcquire()) {
      return sendJson(res, 503, { error: "上传通道繁忙，请稍后重试" });
    }

    readJsonBody(req, uploadRules.uploadBodyLimitBytes())
      .then(body => handleApi(req, res, pathname, body))
      .catch(error => respondUploadError(res, req, error))
      .finally(() => uploadGate.release());
    return;
  }

  readJsonBody(req, MAX_BODY_BYTES)
    .then(body => handleApi(req, res, pathname, body))
    .catch(error => sendJson(res, 400, { error: error.message }));
  return;
});

// 把「这套部署该注意什么」整理成结构化、可断言的清单，日志和自检都从这里取，避免各说各话。
// storeInfo 允许注入，好让单元测试不依赖真实环境变量/模块加载态。
function deploymentWarnings(storeInfo) {
  const store = storeInfo || auth.sessionStoreInfo();
  const warnings = [];

  // 进行中的练习（含每题正确答案、判题进度）只在单个进程内存里，从不落盘、也不跨实例共享——
  // 这是刻意取舍：它生命周期短（重启重开即可），落盘反而把答案写进磁盘扩大泄露面。
  // 代价就是：多实例轮询会让「在 A 组卷、判题打到 B」直接报「没有进行中的练习」。
  warnings.push({
    code: "quiz-single-instance",
    message: "进行中的练习只存本进程内存、不跨实例共享：多实例负载均衡请开启会话粘滞（同一浏览器固定路由到同一实例），否则答题可能中途丢失。本网页版按单实例设计。"
  });

  if (store.store === "memory") {
    warnings.push({
      code: "memory-session",
      message: "会话只存进程内存：重启即全员掉线，多实例之间也不共享登录态。生产请设 TUTTI_SESSION_STORE=file 并让各实例共用同一 TUTTI_DATA_DIR。"
    });
  }

  return warnings;
}

// 启动即把「数据放哪、会话怎么存、有没有默认密码」打到日志里，
// 这三项是网页版部署最容易漏且出事后最难查的地方。
function logDeploymentDiagnostics() {
  const store = auth.sessionStoreInfo();
  const node = checkNodeVersion();

  console.log(`Node 版本: ${node.current}（要求 ${node.required}）`);
  if (!node.ok) {
    // 服务本身只用内置模块，低版本还能跑；但同项目的构建与自检脚本会失败，先说清楚。
    console.warn(`  [告警] ${node.message}`);
  }

  const boot = markBoot();
  console.log(
    `运行数据目录: ${store.dataDir}（第 ${boot.boots} 次启动，首次 ${boot.firstBootAt}）`
  );
  if (!ensureWritable(store.dataDir)) {
    console.warn("  [告警] 目录不可写：上传规则、学员作业与登录会话都会存不住。请用 TUTTI_DATA_DIR 指向可写目录。");
  } else if (isInsideAppDir(store.dataDir)) {
    console.warn("  [告警] 目录在应用目录内：重新发布时数据会被一并覆盖。请用 TUTTI_DATA_DIR 指向持久化目录。");
  }

  console.log(
    store.store === "file"
      ? `会话存储: 文件（${store.dir}），重启不掉线`
      : "会话存储: 进程内存，重启即全员掉线（TUTTI_SESSION_STORE=file 可改为落盘）"
  );

  const limits = rateLimit.DEFAULTS;
  if (TRUST_PROXY) {
    console.warn("登录限流: 采信 x-forwarded-for（TUTTI_TRUST_PROXY 已开）——仅当确信站在会覆盖该头的可信反代后面才可这样，否则客户端能伪造它绕过限流。");
  } else {
    console.log(`登录限流: 只认连接来源 IP（忽略 x-forwarded-for）；单账号连续失败 ${limits.userLimit} 次锁 ${Math.round(limits.userWindowMs / 1000)} 秒，单来源累计失败 ${limits.ipLimit} 次触发兜底。`);
  }

  deploymentWarnings(store).forEach(item => console.warn(`  [部署提示:${item.code}] ${item.message}`));

  const defaultPasswordUsers = auth.findUsersWithDefaultPassword();
  if (defaultPasswordUsers.length) {
    if (auth.ALLOW_LEAKED_PASSWORDS) {
      console.warn(`[安全告警] 以下账号仍在使用已公开的默认密码：${defaultPasswordUsers.join("、")}`);
      console.warn("  已用 TUTTI_ALLOW_LEAKED_PASSWORDS=1 放行登录（只适合本地演示，线上去掉这个变量）。");
      return;
    }

    const revoked = auth.revokeSessionsForUsernames(defaultPasswordUsers);
    console.warn(`[安全阻断] 以下账号的口令在 git 历史里公开过，已停用：${defaultPasswordUsers.join("、")}`);
    console.warn(`  已吊销它们已有的会话：${revoked} 个。`);
    console.warn("  处理：node scripts/manage-accounts.cjs passwd <账号> --random，然后重启服务。");
  }
}

function startServer(options = {}) {
  return new Promise(resolve => {
    // 用 ?? 而非 ||：显式传 0 要表示"让系统分配临时端口"，不能被当成 falsy 落回默认 3000，
    // 否则并发测试只能"先探一个空闲端口、关掉、再抢占"，端口会在关与抢之间被别人占用（EADDRINUSE）。
    const listener = server.listen(options.port ?? PORT, options.host ?? HOST, () => resolve(listener));
  });
}

if (require.main === module) {
  startServer().then(listener => {
    console.log(`刷题助手网页版已启动: http://localhost:${listener.address().port}`);
    console.log(`课程: ${banks.catalog.map(course => `${course.id}(${course.questionTotal})`).join("  ")}`);
    console.log("");
    logDeploymentDiagnostics();
  });
}

module.exports = { startServer, deploymentWarnings };
