const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const net = require("net");

// 用临时账号表跑测试，不依赖也不修改 data/accounts.json。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-sec-"));
const accountsPath = path.join(tempDir, "accounts.json");

function makeUser(username, password, role, courses) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    username,
    role,
    courses,
    salt,
    hash: crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex")
  };
}

fs.writeFileSync(
  accountsPath,
  JSON.stringify({
    version: 1,
    users: [
      makeUser("admin", "admin-pwd", "admin", []),
      makeUser("student", "student-pwd", "user", ["py"]),
      makeUser("ratelimit", "ratelimit-pwd", "user", ["py"])
    ]
  })
);
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");

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

// server.js 的 startServer 用 `options.port || PORT`，传 0 会被当成 3000，
// 多个测试文件并行跑时会端口冲突，这里先向内核要一个空闲端口再监听。
function getFreePort() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

test.before(async () => {
  const port = await getFreePort();
  server = await startServer({ port, host: "127.0.0.1" });
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
        assert.equal(web.correctAnswer, mini.correctAnswer, `${entry.id}/${topicKey} fill 答案不一致`);
        assert.deepEqual(web.options, mini.options, `${entry.id}/${topicKey} fill options 不一致`);
        compared += 1;
      });
    });
  });
  assert.ok(compared > 0, "没有比对任何填空题");
});
