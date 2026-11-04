const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 单独成文件（node:test 每文件独立进程）：这样能把 IP 兜底阈值调低而不污染其它限流用例，
// 也让这里的桶从干净状态开始，判断阈值命中不受顺序影响。
process.env.TUTTI_LOGIN_IP_FAIL_LIMIT = "3";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-rl-ip-"));
const accountsPath = path.join(tempDir, "accounts.json");
fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users: [] }));
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_COOKIE_SECURE = "0";

const { startServer } = require("../web/server.js");

let baseUrl = "";
let server = null;

async function login(username, password) {
  const response = await fetch(baseUrl + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, data };
}

test.before(async () => {
  server = await startServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  if (server) server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("凭证喷洒：每个账号只试一次，靠 IP 兜底在第 4 个账号处拦下", async () => {
  // 单账号阈值是 5，这里每个用户名只失败一次，user 闸门永远碰不到；
  // 但同一来源 IP 的失败累计到 3 就触发兜底，第 4 个新账号也被拒。
  for (const name of ["spray-a", "spray-b", "spray-c"]) {
    const result = await login(name, "whatever-wrong");
    assert.equal(result.status, 401, `${name} 第一次失败应 401（单账号桶还没到 5）`);
  }

  const fourth = await login("spray-d", "whatever-wrong");
  assert.equal(fourth.status, 429, "累计到 IP 兜底阈值后，即使换了新账号也应拦下");
  assert.match(String(fourth.data.error || ""), /该来源/, "IP 兜底应给出来源级别的提示，区别于单账号提示");
});
