// 登录失败限流的唯一实现。单独成模块是为了能脱离 HTTP 直接做单元测试。
//
// 两条彼此独立的闸门：
// - 「IP + 用户名」：挡针对单个账号的密码爆破。连续失败 userLimit 次后锁 userWindowMs。
//   这是原来就有的行为，阈值保持不变（默认 5 次 / 60 秒）。
// - 「IP」全局兜底：拿一大堆账号名、每个只试几次的撞库/凭证喷洒，per-user 桶永远到不了阈值，
//   但同一 IP 的失败总数会累加。ipLimit 明显高于 userLimit，正常用户在一台机器上登录
//   这么多不同账号才会碰到，测试里单 IP 的失败次数远低于它，不会被误伤。

function readNumberEnv(name, fallback) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const DEFAULTS = {
  userLimit: readNumberEnv("TUTTI_LOGIN_FAIL_LIMIT", 5),
  userWindowMs: readNumberEnv("TUTTI_LOGIN_LOCK_MS", 60 * 1000),
  ipLimit: readNumberEnv("TUTTI_LOGIN_IP_FAIL_LIMIT", 30),
  ipWindowMs: readNumberEnv("TUTTI_LOGIN_IP_LOCK_MS", 60 * 1000)
};

// 只有确信自己站在可信反向代理后面时才读 x-forwarded-for。默认关：
// 直连时任何人都能伪造这个头，一旦采信就等于把限流按在攻击者自选的 key 上——形同虚设。
function trustProxyEnabled() {
  const raw = String(process.env.TUTTI_TRUST_PROXY || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

function firstForwardedIp(header) {
  // x-forwarded-for 形如 "client, proxy1, proxy2"，最左才是源头 IP；只在可信代理下才取。
  const first = String(header || "").split(",")[0].trim();
  return first || "";
}

function socketIp(req) {
  return (req && req.socket && req.socket.remoteAddress) || "unknown";
}

// trustProxy=false 时彻底忽略 x-forwarded-for，伪造的头改不动限流的 key。
function resolveClientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = firstForwardedIp(req.headers["x-forwarded-for"]);
    if (forwarded) return forwarded;
  }
  return socketIp(req);
}

function pruneWindow(bucket, now, windowMs) {
  bucket.forEach((record, key) => {
    if (now - record.lastAttempt >= windowMs) bucket.delete(key);
  });
}

function createLoginThrottle(options = {}) {
  const userLimit = options.userLimit || DEFAULTS.userLimit;
  const userWindowMs = options.userWindowMs || DEFAULTS.userWindowMs;
  const ipLimit = options.ipLimit || DEFAULTS.ipLimit;
  const ipWindowMs = options.ipWindowMs || DEFAULTS.ipWindowMs;
  const now = options.now || (() => Date.now());

  const userBucket = new Map();
  const ipBucket = new Map();

  function userKey(ip, username) {
    return `${ip}:${username}`;
  }

  // 先判是否已被锁；返回命中哪条闸门，交给调用方措辞（两者都是 429，只是提示不同）。
  function check(ip, username) {
    const t = now();
    pruneWindow(userBucket, t, userWindowMs);
    pruneWindow(ipBucket, t, ipWindowMs);

    const userRecord = userBucket.get(userKey(ip, username));
    if (userRecord && userRecord.count >= userLimit && t - userRecord.lastAttempt < userWindowMs) {
      return { blocked: true, scope: "user" };
    }

    const ipRecord = ipBucket.get(ip);
    if (ipRecord && ipRecord.count >= ipLimit && t - ipRecord.lastAttempt < ipWindowMs) {
      return { blocked: true, scope: "ip" };
    }

    return { blocked: false, scope: null };
  }

  function recordFailure(ip, username) {
    const t = now();

    const uk = userKey(ip, username);
    const userRecord = userBucket.get(uk);
    userBucket.set(uk, { count: (userRecord ? userRecord.count : 0) + 1, lastAttempt: t });

    const ipRecord = ipBucket.get(ip);
    ipBucket.set(ip, { count: (ipRecord ? ipRecord.count : 0) + 1, lastAttempt: t });
  }

  // 登录成功后清掉该「IP+用户名」的失败计数；IP 兜底是累计不同账号的喷洒信号，
  // 一次成功不足以证明整台机器安全，所以留着交给时间窗自然过期。
  function recordSuccess(ip, username) {
    userBucket.delete(userKey(ip, username));
  }

  function reset() {
    userBucket.clear();
    ipBucket.clear();
  }

  return { check, recordFailure, recordSuccess, reset, DEFAULTS };
}

// 触发一次拒绝也消耗 CPU；这里刻意不引入额外定时器，靠请求驱动的 pruneWindow 收敛内存。
module.exports = {
  DEFAULTS,
  createLoginThrottle,
  firstForwardedIp,
  resolveClientIp,
  trustProxyEnabled
};
