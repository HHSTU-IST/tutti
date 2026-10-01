const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

// 用临时账号表跑测试，不依赖也不修改 data/accounts.json。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-web-"));
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
    users: [makeUser("admin", "admin-pwd", "admin", []), makeUser("student", "student-pwd", "user", ["py"])]
  })
);
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
// 会话、上传规则、作业文件都固定在临时目录：测试不写仓库数据，多个测试文件并行也不会互踩。
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");

const { startServer } = require("../web/server.js");

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

  return { status: response.status, data };
}

async function login(username, password) {
  cookie = "";
  return call("/api/login", { method: "POST", body: { username, password } });
}

test.before(async () => {
  server = await startServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  if (server) server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("健康检查免登录可用，且不泄露服务器路径", async () => {
  cookie = "";
  const health = await call("/api/health");

  assert.equal(health.status, 200);
  assert.equal(health.data.status, "ok");
  assert.equal(typeof health.data.dataDirBoots, "number");
  assert.equal(typeof health.data.uptimeSec, "number");

  const serialized = JSON.stringify(health.data);
  assert.equal(serialized.includes(tempDir), false, "健康检查不应回显数据目录路径");
  assert.equal(serialized.includes("node"), false, "健康检查不应回显运行时细节");
});

test("未登录时接口返回 401", async () => {
  cookie = "";
  const me = await call("/api/me");
  assert.equal(me.status, 401);
});

test("密码错误时登录失败", async () => {
  const result = await login("student", "wrong-pwd");
  assert.equal(result.status, 401);
});

test("普通账号只解锁已付费课程", async () => {
  const result = await login("student", "student-pwd");
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.user.unlocked, ["py"]);

  const courses = await call("/api/courses");
  const map = Object.fromEntries(courses.data.courses.map(course => [course.id, course.unlocked]));
  assert.equal(map.py, true);
  assert.equal(map.ml, false);
});

test("未付费课程的专题与组卷都被服务端拦截", async () => {
  await login("student", "student-pwd");

  const topics = await call("/api/courses/ml/topics");
  assert.equal(topics.status, 403);

  const quiz = await call("/api/quiz", { method: "POST", body: { courseId: "ml", topicKey: "base", count: 3 } });
  assert.equal(quiz.status, 403);
});

test("下发的题目不含答案与解析", async () => {
  await login("student", "student-pwd");

  const quiz = await call("/api/quiz", { method: "POST", body: { courseId: "py", topicKey: "var", count: 5 } });
  assert.equal(quiz.status, 200);
  assert.ok(quiz.data.questions.length > 0);

  quiz.data.questions.forEach(question => {
    assert.equal(question.correctAnswer, undefined);
    assert.equal(question.explain, undefined);
    assert.ok(question.question.length > 0);
  });
});

test("判题在服务端完成，正确答案判对并返回解析", async () => {
  await login("student", "student-pwd");

  const quiz = await call("/api/quiz", { method: "POST", body: { courseId: "py", topicKey: "var", count: 5, types: ["single"] } });
  assert.equal(quiz.status, 200);

  const target = quiz.data.questions[0];
  assert.equal(target.type, "single");

  const wrong = await call("/api/quiz/check", { method: "POST", body: { index: 0, value: "Z" } });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.data.correct, false);

  const right = await call("/api/quiz/check", {
    method: "POST",
    body: { index: 0, value: wrong.data.correctValue }
  });
  assert.equal(right.status, 200);
  assert.equal(right.data.correct, true);
  assert.ok(right.data.explain.length > 0);
});

test("管理员账号解锁全部题库", async () => {
  const result = await login("admin", "admin-pwd");
  assert.equal(result.status, 200);
  assert.equal(result.data.user.isAdmin, true);
  assert.equal(result.data.user.unlocked.length, 4);

  const courses = await call("/api/courses");
  assert.ok(courses.data.courses.every(course => course.unlocked));

  const quiz = await call("/api/quiz", { method: "POST", body: { courseId: "cv", topicKey: "__all__", count: 5 } });
  assert.equal(quiz.status, 200);
  assert.equal(quiz.data.questions.length, 5);
});

test("网页版引擎与小程序引擎行为一致", () => {
  const webEngine = require("../web/lib/engine.cjs");
  const { loadQuizEngine } = require("./load-quiz-engine.cjs");
  const miniEngine = loadQuizEngine();
  const { buildCatalogFromRepo } = require("../web/lib/catalog.cjs");

  // 洗牌会改变选项顺序，所以比对「正确答案的文本」与「选项文本集合」这两项洗牌无关的结果。
  function fingerprint(engine, question, type) {
    const normalized = engine.normalizeQuestion(question, type, "专题", "topic");
    const correct = normalized.options.find(option => option.value === normalized.correctAnswer);
    return JSON.stringify({
      typeName: normalized.typeName,
      correctText: correct ? correct.text : "",
      options: normalized.options.map(option => option.text).sort()
    });
  }

  let compared = 0;
  buildCatalogFromRepo().forEach(entry => {
    Object.keys(entry.bank).forEach(topicKey => {
      ["single", "judge", "fill"].forEach(type => {
        (entry.bank[topicKey][type] || []).slice(0, 3).forEach(question => {
          assert.equal(
            fingerprint(webEngine, question, type),
            fingerprint(miniEngine, question, type),
            `${entry.id}/${topicKey}/${type} 与小程序引擎结果不一致`
          );
          compared += 1;
        });
      });
    });
  });

  assert.ok(compared > 0, "没有比对任何题目");
});

test("上传规则所有人可读，只有管理员能改", async () => {
  await login("student", "student-pwd");
  const readable = await call("/api/settings/upload");
  assert.equal(readable.status, 200);
  assert.equal(readable.data.canEdit, false);
  assert.ok(readable.data.rules.allowedExtensions.length > 0);

  const rejected = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [".zip"], filenamePattern: ".*", maxSizeMb: 5 }
  });
  assert.equal(rejected.status, 403);

  await login("admin", "admin-pwd");
  const editable = await call("/api/settings/upload");
  assert.equal(editable.data.canEdit, true);
});

test("管理员修改规则后对新上传立即生效", async () => {
  await login("admin", "admin-pwd");

  const saved = await call("/api/settings/upload", {
    method: "PUT",
    body: {
      allowedExtensions: [".txt"],
      filenamePattern: "^hw-\\d{2}\\.txt$",
      filenameHint: "hw-两位数字.txt，例如 hw-01.txt",
      maxSizeMb: 1
    }
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.data.rules.allowedExtensions, [".txt"]);

  const content = Buffer.from("hello").toString("base64");

  const badExtension = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-01.pdf", contentBase64: content }
  });
  assert.equal(badExtension.status, 400);
  assert.match(badExtension.data.error, /不支持的文件格式/);

  const badName = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "作业.txt", contentBase64: content }
  });
  assert.equal(badName.status, 400);
  assert.match(badName.data.error, /文件名不符合要求/);

  const badPath = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "../hw-01.txt", contentBase64: content }
  });
  assert.equal(badPath.status, 400);

  const good = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-01.txt", contentBase64: content }
  });
  assert.equal(good.status, 200);
  assert.equal(good.data.upload.originalName, "hw-01.txt");
  assert.ok(fs.existsSync(path.join(process.env.TUTTI_UPLOADS_DIR, good.data.upload.storedName)));
});

test("非法规则会被拒绝，不会写入", async () => {
  await login("admin", "admin-pwd");

  const badPattern = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [".txt"], filenamePattern: "([", maxSizeMb: 1 }
  });
  assert.equal(badPattern.status, 400);

  const noExtension = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [], filenamePattern: ".*", maxSizeMb: 1 }
  });
  assert.equal(noExtension.status, 400);

  const stillWorks = await call("/api/settings/upload");
  assert.deepEqual(stillWorks.data.rules.allowedExtensions, [".txt"]);
});

test("未开通课程不能上传", async () => {
  await login("student", "student-pwd");

  const result = await call("/api/upload", {
    method: "POST",
    body: { courseId: "ml", fileName: "hw-01.txt", contentBase64: Buffer.from("x").toString("base64") }
  });
  assert.equal(result.status, 403);
});

test("退出登录后会话失效", async () => {
  await login("student", "student-pwd");
  await call("/api/logout", { method: "POST" });
  const me = await call("/api/me");
  assert.equal(me.status, 401);
});

test("删除上传记录：只能删自己的，管理员可删任意一条", async () => {
  // 前面的用例已把规则改成 hw-两位数字.txt，这里顺着用。
  const content = Buffer.from("homework").toString("base64");

  await login("admin", "admin-pwd");
  const adminUpload = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-09.txt", contentBase64: content }
  });
  assert.equal(adminUpload.status, 200);
  const adminFile = path.join(process.env.TUTTI_UPLOADS_DIR, adminUpload.data.upload.storedName);
  assert.ok(fs.existsSync(adminFile));

  // 学员删不掉别人的记录，也删不掉盘上的文件。
  await login("student", "student-pwd");
  const forbidden = await call(`/api/uploads/${encodeURIComponent(adminUpload.data.upload.id)}`, { method: "DELETE" });
  assert.equal(forbidden.status, 403);
  assert.ok(fs.existsSync(adminFile), "越权删除不应动到文件");

  const ownUpload = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-10.txt", contentBase64: content }
  });
  const ownFile = path.join(process.env.TUTTI_UPLOADS_DIR, ownUpload.data.upload.storedName);

  const removed = await call(`/api/uploads/${encodeURIComponent(ownUpload.data.upload.id)}`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.equal(fs.existsSync(ownFile), false, "删除记录时盘上的文件也要删掉");

  const list = await call("/api/uploads");
  assert.equal(
    list.data.uploads.some(upload => upload.id === ownUpload.data.upload.id),
    false,
    "删掉的记录不应再出现在列表里"
  );

  // 不存在的 id、以及把路径穿越写进 id 的请求，都只是「记录不存在」。
  const missing = await call("/api/uploads/1700000000-abcdef-hw-01.txt", { method: "DELETE" });
  assert.equal(missing.status, 404);

  const traversal = await call("/api/uploads/..%2F..%2Faccounts.json", { method: "DELETE" });
  assert.equal(traversal.status, 404);
  assert.ok(fs.existsSync(accountsPath), "路径穿越写法不能删到上传目录外的文件");

  await login("admin", "admin-pwd");
  const adminRemoved = await call(`/api/uploads/${encodeURIComponent(adminUpload.data.upload.id)}`, { method: "DELETE" });
  assert.equal(adminRemoved.status, 200, "管理员应能删掉学员的记录");
  assert.equal(fs.existsSync(adminFile), false);
});
