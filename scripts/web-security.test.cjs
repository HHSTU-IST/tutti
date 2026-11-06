const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const { makeUser } = require("./test-util.cjs");

// 用临时账号表跑测试，不依赖也不修改 data/accounts.json。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-sec-"));
const accountsPath = path.join(tempDir, "accounts.json");
// env 必须先于 makeUser 落位——test-util lazily require auth.cjs，
// 而 auth.cjs 在加载时就把 ACCOUNTS_PATH/DATA_DIR 等固化成 const，晚设 env 无效。
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
// 会话、上传规则、作业文件都固定在临时目录：测试不写仓库数据，多个测试文件并行也不会互踩。
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");

fs.writeFileSync(
  accountsPath,
  JSON.stringify({
    version: 1,
    users: [
      makeUser("admin", "admin-pwd", "admin", []),
      makeUser("student", "student-pwd", "user", ["py"]),
      makeUser("ratelimit", "ratelimit-pwd", "user", ["py"]),
      // 口令在 git 历史里公开过的那个值：登录必须被拒绝（见 P0-3）。
      makeUser("legacy", "admin2026", "user", ["py"])
    ]
  })
);

const { startServer } = require("../web/server.js");
const { loadTopicBank } = require("./load-topic-bank.cjs");

let baseUrl = "";
let server = null;
let cookie = "";

async function call(pathname, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(baseUrl + pathname, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return { status: response.status, data, headers: response.headers };
}

async function login(username, password) {
  cookie = "";
  return call("/api/login", { method: "POST", body: { username, password } });
}

// startServer 现在认 0 为"系统分配临时端口"（不再被 || 落回 3000），
// 因此直接绑临时端口、再从 server.address().port 读回真实端口，多个测试文件并行也不会撞端口。
test.before(async () => {
  server = await startServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  if (server) server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("填空题答案不下发：options 为空、响应不含 correctAnswer/explain", async () => {
  await login("admin", "admin-pwd");

  const quiz = await call("/api/quiz", {
    method: "POST",
    body: { courseId: "py", topicKey: "var", count: 10, types: ["fill"] }
  });
  assert.equal(quiz.status, 200);
  assert.ok(quiz.data.questions.length > 0, "应返回至少一道填空题");

  quiz.data.questions.forEach(question => {
    assert.equal(question.type, "fill");
    assert.deepEqual(question.options, [], "填空 options 必须为空数组");
    assert.equal(question.correctAnswer, undefined, "填空题不得下发 correctAnswer");
    assert.equal(question.explain, undefined, "填空题不得下发 explain");
  });

  const serialized = JSON.stringify(quiz.data);
  assert.equal(serialized.includes('"correctAnswer"'), false, "响应 JSON 不得出现 correctAnswer 字段");
  assert.equal(serialized.includes('"explain"'), false, "响应 JSON 不得出现 explain 字段");
});

test("填空题答案文本不出现在下发题干中", async () => {
  const bank = loadTopicBank("py");
  const fillBank = (bank["var"] && bank["var"].fill) || [];
  assert.ok(fillBank.length > 0, "py/var 专题应有填空题");

  await login("admin", "admin-pwd");
  const quiz = await call("/api/quiz", {
    method: "POST",
    body: { courseId: "py", topicKey: "var", count: 10, types: ["fill"] }
  });
  assert.equal(quiz.status, 200);

  quiz.data.questions.forEach(question => {
    const parts = question.qid.split(":");
    const answer = String(fillBank[Number(parts[2])].answer);
    assert.equal(question.question.includes(answer), false, `答案 "${answer}" 不应出现在题干中`);
  });
});

test("填空题正确文本判对、错误文本判错", async () => {
  const bank = loadTopicBank("py");
  const fillBank = (bank["var"] && bank["var"].fill) || [];
  assert.ok(fillBank.length > 0, "py/var 专题应有填空题");

  await login("admin", "admin-pwd");
  const quiz = await call("/api/quiz", {
    method: "POST",
    body: { courseId: "py", topicKey: "var", count: 10, types: ["fill"] }
  });
  assert.equal(quiz.status, 200);

  const target = quiz.data.questions[0];
  const parts = target.qid.split(":");
  const answer = String(fillBank[Number(parts[2])].answer);

  const right = await call("/api/quiz/check", { method: "POST", body: { index: 0, value: answer } });
  assert.equal(right.status, 200);
  assert.equal(right.data.correct, true, `正确文本 "${answer}" 应判对`);
  assert.equal(right.data.correctText, answer);

  const wrong = await call("/api/quiz/check", { method: "POST", body: { index: 0, value: "绝不正确的答案_xyz" } });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.data.correct, false, "错误文本应判错");
});

test("路径穿越被拦截为 403，服务进程不崩溃", async () => {
  const encoded = await call("/..%2f..%2fdata%2faccounts.json");
  assert.equal(encoded.status, 403, "编码斜杠穿越应 403");

  const encodedDots = await call("/%2e%2e%2f%2e%2e%2fdata%2faccounts.json");
  assert.equal(encodedDots.status, 403, "编码点号穿越应 403");

  const alive = await call("/");
  assert.equal(alive.status, 200, "穿越请求之后服务应仍可正常响应");
});

test("非法 URL 编码（静态路径）返回 400 且不崩溃", async () => {
  const bad = await call("/%E0%A4%A");
  assert.equal(bad.status, 400, "非法 % 编码的静态路径应返回 400");

  const alive = await call("/");
  assert.equal(alive.status, 200, "非法编码之后服务应仍可正常响应");
});

test("非法 URL 编码的 API 路径返回 4xx 且不崩溃", async () => {
  cookie = "";
  const bad = await call("/api/%E0%A4%A");
  assert.ok(bad.status >= 400 && bad.status < 500, `API 非法编码应为 4xx，实际 ${bad.status}`);

  const alive = await call("/");
  assert.equal(alive.status, 200, "非法编码之后服务应仍可正常响应");
});

test("畸形 Host 头不再打死进程（CRITICAL 远程 DoS 回归）", async () => {
  // 走 raw socket：fetch 发不出 `Host: a b` 这种非法头，Node HTTP 解析器却会原样放行。
  // 修复前，这行请求会让 web/server.js 的 new URL(req.url, `http://${host}`) 抛
  // ERR_INVALID_URL 且未被捕获，直接把服务进程干掉。
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    const sock = net.connect(port, "127.0.0.1", () => {
      sock.write("GET / HTTP/1.1\r\nHost: a b\r\nConnection: close\r\n\r\n");
    });
    sock.on("data", () => {/* 有响应最好，没有也不算失败 */});
    sock.on("close", resolve);
    sock.on("error", resolve); // ECONNRESET 也算正常终止
    setTimeout(() => { try { sock.destroy(); } catch {} resolve(); }, 1500);
  });

  // 关键断言：进程还活着，后续合法请求能正常拿到 200。
  const alive = await call("/");
  assert.equal(alive.status, 200, "非法 Host 之后服务应仍可正常响应（进程没被打死）");
});

test("登录连续失败 5 次后第 6 次返回 429，锁定期间正确密码也被拒", async () => {
  cookie = "";
  for (let i = 0; i < 5; i += 1) {
    const result = await call("/api/login", {
      method: "POST",
      body: { username: "ratelimit", password: "wrong-pwd" }
    });
    assert.equal(result.status, 401, `第 ${i + 1} 次错误密码应为 401`);
  }

  const sixth = await call("/api/login", {
    method: "POST",
    body: { username: "ratelimit", password: "wrong-pwd" }
  });
  assert.equal(sixth.status, 429, "第 6 次应触发限流返回 429");

  const correctDuringLock = await call("/api/login", {
    method: "POST",
    body: { username: "ratelimit", password: "ratelimit-pwd" }
  });
  assert.equal(correctDuringLock.status, 429, "锁定期间即使密码正确也应返回 429");
});

test("base64 严格校验：非法与空内容返回 400", async () => {
  await login("admin", "admin-pwd");

  const illegal = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-01.txt", contentBase64: "@@@" }
  });
  assert.equal(illegal.status, 400, "非法 base64 应返回 400");
  assert.match(illegal.data.error, /base64/);

  const empty = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-01.txt", contentBase64: "" }
  });
  assert.equal(empty.status, 400, "空 base64 应返回 400");
  assert.match(empty.data.error, /缺少文件内容/);
});

test("登录 Cookie 默认携带 Secure 标记", async () => {
  cookie = "";
  const result = await call("/api/login", {
    method: "POST",
    body: { username: "admin", password: "admin-pwd" }
  });
  assert.equal(result.status, 200);
  const setCookie = result.headers.get("set-cookie");
  assert.match(setCookie, /Secure/, "默认 Set-Cookie 应含 Secure");
});

test("TUTTI_COOKIE_SECURE=0 时关闭 Secure 标记", () => {
  const authPath = require.resolve("../web/lib/auth.cjs");
  const prev = process.env.TUTTI_COOKIE_SECURE;

  delete require.cache[authPath];
  process.env.TUTTI_COOKIE_SECURE = "0";
  const authOff = require("../web/lib/auth.cjs");
  assert.doesNotMatch(authOff.sessionCookie("tok", 100), /Secure/, "关闭后 Cookie 不应含 Secure");

  // 还原环境与模块缓存，避免影响其它用例。
  delete require.cache[authPath];
  if (prev === undefined) delete process.env.TUTTI_COOKIE_SECURE;
  else process.env.TUTTI_COOKIE_SECURE = prev;
  require("../web/lib/auth.cjs");
});

test("题目 id 唯一化：两端引擎多次生成均不重复", () => {
  const webEngine = require("../web/lib/engine.cjs");
  const { loadQuizEngine } = require("./load-quiz-engine.cjs");
  const miniEngine = loadQuizEngine();
  const sample = { question: "填空 ____", answer: "答案", topic: "t" };

  const webIds = new Set(
    Array.from({ length: 20 }, () => webEngine.normalizeQuestion(sample, "fill", "专题", "t").id)
  );
  assert.equal(webIds.size, 20, "网页引擎 20 次生成 id 应全部唯一");

  const miniIds = new Set(
    Array.from({ length: 20 }, () => miniEngine.normalizeQuestion(sample, "fill", "专题", "t").id)
  );
  assert.equal(miniIds.size, 20, "小程序引擎 20 次生成 id 应全部唯一");
});

test("fill 分支两端引擎 correctAnswer 与 options 一致", () => {
  const webEngine = require("../web/lib/engine.cjs");
  const { loadQuizEngine } = require("./load-quiz-engine.cjs");
  const miniEngine = loadQuizEngine();
  const { buildCatalogFromRepo } = require("../web/lib/catalog.cjs");

  let compared = 0;
  buildCatalogFromRepo().forEach(entry => {
    Object.keys(entry.bank).forEach(topicKey => {
      (entry.bank[topicKey].fill || []).slice(0, 3).forEach(question => {
        const web = webEngine.normalizeQuestion(question, "fill", "专题", topicKey);
        const mini = miniEngine.normalizeQuestion(question, "fill", "专题", topicKey);
        assert.equal(typeof web.correctAnswer, "string", `${entry.id}/${topicKey} fill correctAnswer 必须是字符串`);
        assert.ok(web.correctAnswer.length > 0, `${entry.id}/${topicKey} fill correctAnswer 不能为空`);
        assert.equal(web.correctAnswer, mini.correctAnswer, `${entry.id}/${topicKey} fill 答案不一致`);
        assert.deepEqual(web.options, mini.options, `${entry.id}/${topicKey} fill options 不一致`);
        // getQuestionText 里那条 "____" → "______" 的加宽规则也得两端同步，
        // 否则小程序上看到的空格长度和网页/试卷不一致，学员按网页背答案会误判。
        assert.equal(
          webEngine.getQuestionText(question, "fill"),
          miniEngine.getQuestionText(question, "fill"),
          `${entry.id}/${topicKey} fill getQuestionText 不一致（"____" 加宽规则漂移？）`
        );
        compared += 1;
      });
    });
  });
  assert.ok(compared > 0, "没有比对任何填空题");
});

test("口令命中 git 历史里公开过的值：验对也拒绝登录（403），不发会话", async () => {
  const blocked = await login("legacy", "admin2026");

  assert.equal(blocked.status, 403, "泄露口令不该换到会话");
  assert.match(String(blocked.data && blocked.data.error || ""), /默认密码/, "要告诉管理员怎么修");
  assert.equal(cookie, "", "403 不应带 Set-Cookie");

  const ok = await login("student", "student-pwd");
  assert.equal(ok.status, 200, "正常账号登录不受影响");
});
