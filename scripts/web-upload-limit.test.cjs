const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const uploadRules = require("../web/lib/upload-rules.cjs");
const { createUploadGate } = require("../web/lib/upload-gate.cjs");

const MB = 1024 * 1024;
function base64LengthOf(bytes) {
  return 4 * Math.ceil(bytes / 3);
}

// ---- 并发闸门：纯计数逻辑 ----

test("上传闸门占满后拒绝新请求，释放后可再入", () => {
  const gate = createUploadGate(2);
  assert.equal(gate.tryAcquire(), true, "第 1 路放行");
  assert.equal(gate.tryAcquire(), true, "第 2 路放行");
  assert.equal(gate.tryAcquire(), false, "超过上限应拒绝");
  assert.equal(gate.activeCount(), 2);

  gate.release();
  assert.equal(gate.tryAcquire(), true, "释放一路后应能再进");
  assert.equal(gate.activeCount(), 2, "仍占满");
  gate.release();
  gate.release();
  assert.equal(gate.activeCount(), 0, "全部释放后归零");
});

test("上传闸门不会把计数放成负数", () => {
  const gate = createUploadGate(1);
  gate.release();
  assert.equal(gate.activeCount(), 0, "空队列时多余 release 不应减到负数");
  assert.equal(gate.tryAcquire(), true, "计数没坏，仍能正常占坑");
});

// ---- body 上限按 maxSizeMb 推导 ----

test("body 上限能容下一个刚好 maxSizeMb 的文件（不会误杀合规大文件）", () => {
  [1, 10, 50, 200].forEach(maxSizeMb => {
    const cap = uploadRules.uploadBodyLimitBytes({ maxSizeMb });
    const needed = base64LengthOf(maxSizeMb * MB);
    assert.ok(cap >= needed, `maxSizeMb=${maxSizeMb} 时上限 ${cap} 应 >= base64 需求 ${needed}`);
  });
});

test("body 上限随 maxSizeMb 单调变大，且根因文案带上限数字", () => {
  assert.ok(uploadRules.uploadBodyLimitBytes({ maxSizeMb: 20 }) > uploadRules.uploadBodyLimitBytes({ maxSizeMb: 10 }));
  assert.match(uploadRules.describeUploadOversize({ maxSizeMb: 7 }), /7 MB/, "文案应点名当前大小上限");
});

// ---- 集成：超大上传给出 413 根因，合规小文件正常 200 ----

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-ull-"));
const accountsPath = path.join(tempDir, "accounts.json");

function makeUser(username, password, role, courses) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { username, role, courses, salt, hash: crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex") };
}

fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users: [makeUser("admin", "admin-pwd", "admin", [])] }));
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");
process.env.TUTTI_COOKIE_SECURE = "0";

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
  try { data = await response.json(); } catch { data = null; }
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

test("把 maxSizeMb 调到 1 后：小文件正常入库，超大文件被 413 按根因拒绝", async () => {
  await login("admin", "admin-pwd");
  const saved = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [".txt"], filenamePattern: "^hw-\\d{2}\\.txt$", filenameHint: "hw-两位数字.txt", maxSizeMb: 1 }
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.rules.maxSizeMb, 1, "接口应把当前大小上限如实回显");

  const ok = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-01.txt", contentBase64: Buffer.from("hello").toString("base64") }
  });
  assert.equal(ok.status, 200, "远小于上限的合规文件不该被新的动态上限误杀");

  // 5 MB → base64 约 6.7 MB，远超 maxSizeMb=1 推导出的 body 上限，应在传输层被挡下。
  const huge = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "hw-02.txt", contentBase64: Buffer.alloc(5 * MB, 7).toString("base64") }
  });
  assert.equal(huge.status, 413, "超大请求体应返回 413");
  assert.match(String(huge.data.error || ""), /1 MB/, "报错要点名当前 1 MB 上限这个根因，而不是泛泛的「请求体过大」");
});
