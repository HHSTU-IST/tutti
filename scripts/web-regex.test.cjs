const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { makeUser } = require("./test-util.cjs");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-rx-"));
const accountsPath = path.join(tempDir, "accounts.json");
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_COOKIE_SECURE = "0";

const uploadRules = require("../web/lib/upload-rules.cjs");
const { DEFAULT_RULES, isReDoSProne, normalizeRules, checkFile, MAX_FILENAME_CHARS } = uploadRules;

// ---- 静态复杂度检测 ----

test("识别典型灾难性回溯：量词套量词", () => {
  ["(a+)+", "(\\w+)+", "(a*)*", "(.*)+x", "^(a+)+$", "(x+x+)+y"].forEach(p => {
    assert.equal(isReDoSProne(p), true, `${p} 应被判为 ReDoS`);
  });
});

test("常见安全写法不误判", () => {
  [".*", DEFAULT_RULES.filenamePattern, "^hw-\\d{2}\\.txt$", "(\\d{3}-)+", "[a-z]+", "^(?:pdf|docx)$", "a{2,5}b+"]
    .forEach(p => {
      assert.equal(isReDoSProne(p), false, `${p} 不该被误判`);
    });
});

test("normalizeRules 拒绝危险模式、放行安全模式", () => {
  assert.throws(
    () => normalizeRules({ allowedExtensions: [".pdf"], filenamePattern: "(a+)+", maxSizeMb: 5 }),
    /回溯/,
    "保存危险正则必须报错"
  );
  const safe = normalizeRules({ allowedExtensions: [".pdf"], filenamePattern: ".*", maxSizeMb: 5 });
  assert.equal(safe.filenamePattern, ".*", ".* 这类安全模式应放行");
});

test("手改进规则文件的危险模式：读取时被中和回默认规则", () => {
  // 绕过 writeRules 直接落一份含危险正则的文件（模拟有人在服务器上手动编辑）。
  fs.mkdirSync(path.dirname(process.env.TUTTI_RULES_PATH), { recursive: true });
  fs.writeFileSync(
    process.env.TUTTI_RULES_PATH,
    JSON.stringify({ allowedExtensions: [".pdf"], filenamePattern: "(a+)+", maxSizeMb: 5, filenameHint: "坏规则" })
  );

  const rules = uploadRules.readRules();
  assert.equal(rules.filenamePattern, DEFAULT_RULES.filenamePattern, "危险模式应触发回退，改用默认安全规则");
});

test("checkFile 先给文件名长度封顶，再跑正则", () => {
  const longName = "a".repeat(MAX_FILENAME_CHARS + 1) + ".pdf";
  const result = checkFile(longName, 1024, DEFAULT_RULES);
  assert.equal(result.ok, false);
  assert.match(result.error, /文件名过长/, "超长文件名应在进入正则前就被挡下");

  const ok = checkFile("2023010101_张三_py.pdf", 1024, DEFAULT_RULES);
  assert.equal(ok.ok, true, "正常长度合规文件名不受影响");
});

// ---- 集成：管理员存危险正则被 400，安全正则放行 ----

fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users: [makeUser("admin", "admin-pwd", "admin", [])] }));

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

test.before(async () => {
  server = await startServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await call("/api/login", { method: "POST", body: { username: "admin", password: "admin-pwd" } });
});

test.after(() => {
  if (server) server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("接口层：存 (a+)+ 被拒 400，存 .* 放行", async () => {
  const bad = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [".txt"], filenamePattern: "(a+)+", maxSizeMb: 2 }
  });
  assert.equal(bad.status, 400, "危险正则不应被保存");
  assert.match(String(bad.data.error || ""), /回溯/);

  const good = await call("/api/settings/upload", {
    method: "PUT",
    body: { allowedExtensions: [".txt"], filenamePattern: ".*", maxSizeMb: 2 }
  });
  assert.equal(good.status, 200, "安全正则应放行");
  assert.equal(good.data.rules.filenamePattern, ".*");

  // 生效后仍能正常上传一个小文件。
  const up = await call("/api/upload", {
    method: "POST",
    body: { courseId: "py", fileName: "anything.txt", contentBase64: Buffer.from("hi").toString("base64") }
  });
  assert.equal(up.status, 200);
});
