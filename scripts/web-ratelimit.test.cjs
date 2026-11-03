const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const net = require("net");

// 单元测试直接驱动限流模块（注入假时钟，不用等真实时间窗），
// 集成测试再起一个真服务验证「伪造 x-forwarded-for 绕不过限流」。
const rateLimit = require("../web/lib/rate-limit.cjs");

// ---- rate-limit.cjs 单元行为 ----

test("按 IP+用户名：连续失败到达阈值才封锁，成功清零后重新计数", () => {
  let clock = 1_000_000;
  const throttle = rateLimit.createLoginThrottle({
    userLimit: 5,
    userWindowMs: 60_000,
    ipLimit: 1000,
    ipWindowMs: 60_000,
    now: () => clock
  });

  for (let i = 0; i < 4; i += 1) {
    assert.equal(throttle.check("1.1.1.1", "bob").blocked, false, "第 " + (i + 1) + " 次失败后仍应放行");
    throttle.recordFailure("1.1.1.1", "bob");
  }
  assert.equal(throttle.check("1.1.1.1", "bob").blocked, false, "第 5 次（尚未累计到 5）仍放行");
  throttle.recordFailure("1.1.1.1", "bob");

  const blocked = throttle.check("1.1.1.1", "bob");
  assert.equal(blocked.blocked, true, "累计 5 次失败后第 6 次应封锁");
  assert.equal(blocked.scope, "user", "这是单账号爆破，命中的是 user 闸门");

  // 换个用户不受影响，证明 key 是 IP+用户名而非纯 IP。
  assert.equal(throttle.check("1.1.1.1", "alice").blocked, false, "同 IP 的另一账号不该被连坐");
});

test("一次登录成功清空该「IP+用户名」的失败计数", () => {
  let clock = 1_000_000;
  const throttle = rateLimit.createLoginThrottle({
    userLimit: 3, userWindowMs: 60_000, ipLimit: 1000, ipWindowMs: 60_000, now: () => clock
  });

  throttle.recordFailure("9.9.9.9", "carol");
  throttle.recordFailure("9.9.9.9", "carol");
  throttle.recordSuccess("9.9.9.9", "carol");
  // 清零后再来两次失败，仍不该封锁（否则会累计到 4 ≥ 3）。
  throttle.recordFailure("9.9.9.9", "carol");
  throttle.recordFailure("9.9.9.9", "carol");
  assert.equal(throttle.check("9.9.9.9", "carol").blocked, false, "成功后应重新从 0 计");
});

test("时间窗过期后失败计数自动失效", () => {
  let clock = 1_000_000;
  const throttle = rateLimit.createLoginThrottle({
    userLimit: 2, userWindowMs: 60_000, ipLimit: 1000, ipWindowMs: 60_000, now: () => clock
  });

  throttle.recordFailure("5.5.5.5", "dave");
  throttle.recordFailure("5.5.5.5", "dave");
  assert.equal(throttle.check("5.5.5.5", "dave").blocked, true, "锁定期内应封锁");

  clock += 60_001; // 越过时间窗
  assert.equal(throttle.check("5.5.5.5", "dave").blocked, false, "过期后应重新放行");
});

test("按 IP 的全局兜底：跨大量用户名累计也能封锁", () => {
  let clock = 1_000_000;
  const throttle = rateLimit.createLoginThrottle({
    userLimit: 50, // 单账号阈值很高，让每个喷洒账号都碰不到，只有 IP 兜底能拦
    userWindowMs: 60_000,
    ipLimit: 3,
    ipWindowMs: 60_000,
    now: () => clock
  });

  ["e1", "e2", "e3"].forEach(name => {
    assert.equal(throttle.check("7.7.7.7", name).blocked, false);
    throttle.recordFailure("7.7.7.7", name);
  });

  const blocked = throttle.check("7.7.7.7", "e4");
  assert.equal(blocked.blocked, true, "第 4 个不同账号也应被 IP 兜底拦下");
  assert.equal(blocked.scope, "ip", "命中的是 IP 兜底闸门");
});

test("resolveClientIp：不采信代理时忽略 x-forwarded-for，采信时取最左", () => {
  const req = { headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" }, socket: { remoteAddress: "10.0.0.9" } };

  assert.equal(rateLimit.resolveClientIp(req, false), "10.0.0.9", "直连时伪造的头改不动限流 key");
  assert.equal(rateLimit.resolveClientIp(req, true), "203.0.113.7", "可信反代后取最左的源头 IP");
  assert.equal(rateLimit.resolveClientIp({ headers: {}, socket: { remoteAddress: "10.0.0.9" } }, true), "10.0.0.9", "可信但没有该头时回落到连接 IP");
});

test("trustProxyEnabled 只在显式打开时为真", () => {
  const prev = process.env.TUTTI_TRUST_PROXY;
  try {
    delete process.env.TUTTI_TRUST_PROXY;
    assert.equal(rateLimit.trustProxyEnabled(), false, "默认不采信代理");
    process.env.TUTTI_TRUST_PROXY = "1";
    assert.equal(rateLimit.trustProxyEnabled(), true);
    process.env.TUTTI_TRUST_PROXY = "false";
    assert.equal(rateLimit.trustProxyEnabled(), false, "false 不算开");
  } finally {
    if (prev === undefined) delete process.env.TUTTI_TRUST_PROXY;
    else process.env.TUTTI_TRUST_PROXY = prev;
  }
});

// ---- 集成：真实服务上验证限流与伪造防护 ----

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-rl-"));
const accountsPath = path.join(tempDir, "accounts.json");

function makeUser(username, password, role, courses) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { username, role, courses, salt, hash: crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex") };
}

fs.writeFileSync(
  accountsPath,
  JSON.stringify({
    version: 1,
    users: [makeUser("victim", "right-pwd", "user", ["py"]), makeUser("spoof", "right-pwd", "user", ["py"])]
  })
);
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_COOKIE_SECURE = "0";

const { startServer } = require("../web/server.js");

let baseUrl = "";
let server = null;

function getFreePort() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

async function login(username, password, headers = {}) {
  const response = await fetch(baseUrl + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ username, password })
  });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, data };
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

test("单账号连续失败 5 次后第 6 次 429（沿用原阈值）", async () => {
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await login("victim", "wrong")).status, 401, `第 ${i + 1} 次错误密码应 401`);
  }
  const sixth = await login("victim", "wrong");
  assert.equal(sixth.status, 429, "第 6 次应触发单账号限流");
  assert.match(String(sixth.data.error || ""), /尝试次数过多/);

  const correctDuringLock = await login("victim", "right-pwd");
  assert.equal(correctDuringLock.status, 429, "锁定期内即使密码正确也拒绝");
});

test("伪造 x-forwarded-for 换不来新的限流窗口（默认不采信代理）", async () => {
  // 每次带一个不同的伪造来源 IP；若服务盲信该头，这些请求会落到各自桶里、永远攒不满 5 次。
  // 但直连来源其实是同一个 127.0.0.1，桶照攒不误——第 6 次必须 429。
  for (let i = 0; i < 5; i += 1) {
    const result = await login("spoof", "wrong", { "x-forwarded-for": `10.${i}.0.1` });
    assert.equal(result.status, 401, `第 ${i + 1} 次错误密码应 401`);
  }
  const sixth = await login("spoof", "wrong", { "x-forwarded-for": "198.51.100.200" });
  assert.equal(sixth.status, 429, "改伪造头不该重置爆破计数");

  const correctForged = await login("spoof", "right-pwd", { "x-forwarded-for": "203.0.113.99" });
  assert.equal(correctForged.status, 429, "锁定期内用另一个伪造 IP 也进不来");
});
