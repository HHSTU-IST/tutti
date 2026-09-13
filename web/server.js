const http = require("http");
const fs = require("fs");
const path = require("path");

const banks = require("./lib/banks.cjs");
const auth = require("./lib/auth.cjs");
const uploadRules = require("./lib/upload-rules.cjs");
const { ensureWritable, isInsideAppDir } = require("./lib/data-dir.cjs");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY_BYTES = 1024 * 1024;
// 上传走 base64，体积会膨胀约 1/3，单独放宽上限。
const UPLOAD_BODY_LIMIT = 25 * 1024 * 1024;

// 登录失败限流：按「IP + 用户名」计数，连续失败超过阈值后短时锁定，防爆破。
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_LOCK_MS = 60 * 1000;
const loginFailures = new Map();

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function pruneLoginFailures(now) {
  loginFailures.forEach((record, key) => {
    if (now - record.lastAttempt >= LOGIN_LOCK_MS) loginFailures.delete(key);
  });
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
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > limitBytes) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
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

function handleLogin(req, res, body) {
  const username = String(body.username || "").trim();
  const key = `${clientIp(req)}:${username}`;
  const now = Date.now();
  pruneLoginFailures(now);

  const failure = loginFailures.get(key);
  if (failure && failure.count >= LOGIN_FAIL_LIMIT && now - failure.lastAttempt < LOGIN_LOCK_MS) {
    return sendJson(res, 429, { error: "尝试次数过多，请稍后再试" });
  }

  const user = auth.findUser(username);
  if (!user || !auth.verifyPassword(user, String(body.password || ""))) {
    loginFailures.set(key, { count: (failure ? failure.count : 0) + 1, lastAttempt: now });
    return sendJson(res, 401, { error: "用户名或密码错误" });
  }

  loginFailures.delete(key);
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

async function handleApi(req, res, pathname, body) {
  if (pathname === "/api/login" && req.method === "POST") {
    return handleLogin(req, res, body);
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    return handleLogout(req, res);
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

  if (pathname.startsWith("/api/")) {
    readJsonBody(req, pathname === "/api/upload" ? UPLOAD_BODY_LIMIT : MAX_BODY_BYTES)
      .then(body => handleApi(req, res, pathname, body))
      .catch(error => sendJson(res, 400, { error: error.message }));
    return;
  }

  return serveStatic(req, res, pathname);
});

// 启动即把「数据放哪、会话怎么存、有没有默认密码」打到日志里，
// 这三项是网页版部署最容易漏且出事后最难查的地方。
function logDeploymentDiagnostics() {
  const store = auth.sessionStoreInfo();

  console.log(`运行数据目录: ${store.dataDir}`);
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

  const defaultPasswordUsers = auth.findUsersWithDefaultPassword();
  if (defaultPasswordUsers.length) {
    console.warn(`[安全告警] 以下账号仍在使用默认密码：${defaultPasswordUsers.join("、")}`);
    console.warn("  处理：node scripts/manage-accounts.cjs passwd <账号> --random，再重跑 node scripts/build-web-bundle.cjs 并重新发布。");
  }
}

function startServer(options = {}) {
  return new Promise(resolve => {
    const listener = server.listen(options.port || PORT, options.host || HOST, () => resolve(listener));
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

module.exports = { startServer };
