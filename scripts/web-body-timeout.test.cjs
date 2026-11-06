const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");

// 慢速上传（slow-loris）闸门槽位泄漏回归。
// 修复前：readJsonBody 只听 data/end/error，客户端只发半截 body 后静默挂起，
// promise 永不 settle → .finally(uploadGate.release) 不跑，闸门槽位被永久占用。
// 单独成文件（node:test 每文件独立进程）：这样能把 idle 超时压到 150ms
// 而不影响其它 web-* 测试对默认 30s 超时的期望。
process.env.TUTTI_BODY_TIMEOUT_MS = "150";
process.env.TUTTI_MAX_CONCURRENT_UPLOADS = "1";
process.env.TUTTI_COOKIE_SECURE = "0";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-loris-"));
const accountsPath = path.join(tempDir, "accounts.json");
fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users: [] }));
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");
process.env.TUTTI_UPLOADS_DIR = path.join(tempDir, "uploads");

const { startServer } = require("../web/server.js");

let server = null;
let port = 0;

test.before(async () => {
  server = await startServer({ port: 0, host: "127.0.0.1" });
  port = server.address().port;
});

test.after(() => {
  if (server) server.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function stallPartialUpload(ms) {
  return new Promise((resolve) => {
    const sock = net.connect(port, "127.0.0.1", () => {
      // 声称要传 1MB，实际只发 headers + 一小截 chunk，永不 end——就是 slow-loris。
      sock.write(
        "POST /api/upload HTTP/1.1\r\n" +
        `Host: 127.0.0.1:${port}\r\n` +
        "Content-Type: application/json\r\n" +
        "Content-Length: 1048576\r\n" +
        "Connection: keep-alive\r\n\r\n" +
        "{\"partial\":"
      );
    });
    sock.on("error", () => {/* 被服务端超时掐掉属预期，忽略 */});
    setTimeout(() => { try { sock.destroy(); } catch {} resolve(); }, ms);
  });
}

function simpleGet(pathname) {
  return new Promise((resolve, reject) => {
    const req = require("node:http").request(
      { host: "127.0.0.1", port, path: pathname, method: "GET" },
      res => {
        let body = "";
        res.on("data", c => body += c);
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("慢速上传只发半截 body 不会永久占用闸门：idle 超时后槽位一定释放", async () => {
  // 1) 起一条慢速连接，只发 headers + 一小截 body，永不 end。
  const stallPromise = stallPartialUpload(500);

  // 2) 等超过 TUTTI_BODY_TIMEOUT_MS(150ms) 的窗口，让服务端超时把 promise settle 掉。
  await new Promise(r => setTimeout(r, 300));

  // 3) 用一个不占闸门（非 /api/upload）的 GET 探测服务是否还活着（也验证 idle 计时没把主 socket 打挂）。
  const alive = await simpleGet("/api/health");
  assert.equal(alive.status, 200, "慢速上传被超时回收后服务应仍可正常响应");

  // 4) 关键：闸门槽位应已释放。用一个不带 session 的 POST 上传请求验证：
  //    闸门仍满 → 503；闸门空 → 401（未登录）。修复前此处会拿到 503。
  const second = await new Promise((resolve, reject) => {
    const req = require("node:http").request(
      { host: "127.0.0.1", port, path: "/api/upload", method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": 2 } },
      res => {
        let body = "";
        res.on("data", c => body += c);
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.end("{}");
  });

  await stallPromise;

  assert.notEqual(second.status, 503,
    `第二个上传请求不应拿到 503（闸门槽位应已被 idle 超时释放），实际 ${second.status}: ${second.body}`);
  assert.ok(second.status === 401 || second.status === 403 || second.status === 400,
    `未登录的上传应落 4xx，实际 ${second.status}`);
});
