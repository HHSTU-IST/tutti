const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { catalog } = require("./banks.cjs");

// 账号表解析顺序：测试用临时文件 > web/data 下的发布副本 > 仓库 data/accounts.json。
const BUNDLED_ACCOUNTS = path.join(__dirname, "../data/accounts.json");
const REPO_ACCOUNTS = path.join(__dirname, "../../data/accounts.json");
const ACCOUNTS_PATH = process.env.TUTTI_ACCOUNTS_PATH
  || (fs.existsSync(BUNDLED_ACCOUNTS) ? BUNDLED_ACCOUNTS : REPO_ACCOUNTS);
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 120000;
const SESSION_COOKIE = "sid";
const COOKIE_SECURE = !(process.env.TUTTI_COOKIE_SECURE === "0" || String(process.env.TUTTI_COOKIE_SECURE).toLowerCase() === "false");

const sessions = new Map();
const VALID_COURSE_IDS = catalog.map(course => course.id);

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, PBKDF2_ITERATIONS, 32, "sha256").toString("hex");
}

function readAccounts() {
  if (!fs.existsSync(ACCOUNTS_PATH)) {
    return { version: 1, users: [] };
  }

  return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, "utf8"));
}

function writeAccounts(data) {
  fs.writeFileSync(ACCOUNTS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function findUser(username) {
  return readAccounts().users.find(user => user.username === String(username || "").trim()) || null;
}

function verifyPassword(user, password) {
  const actual = Buffer.from(hashPassword(password, user.salt), "hex");
  const expected = Buffer.from(user.hash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

// 管理员解锁全部题库；普通用户只能用账号上登记的课程。
// 服务端始终以这道判定为准，前端即使改 JS 也拿不到未授权课程的题目。
function resolveEntitlements(user) {
  if (user.role === "admin") return VALID_COURSE_IDS.slice();
  return (user.courses || []).filter(id => VALID_COURSE_IDS.includes(id));
}

function publicUser(user) {
  const unlocked = resolveEntitlements(user);
  return {
    username: user.username,
    role: user.role,
    unlocked,
    isAdmin: user.role === "admin"
  };
}

function createSession(user) {
  clearExpiredSessions();

  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, {
    username: user.username,
    role: user.role,
    unlocked: resolveEntitlements(user),
    isAdmin: user.role === "admin",
    expiresAt: Date.now() + SESSION_TTL_MS
  });

  return token;
}

function getSession(token) {
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

function clearExpiredSessions() {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) sessions.delete(token);
  });
}

function parseCookies(header) {
  const cookies = {};
  String(header || "")
    .split(";")
    .forEach(part => {
      const index = part.indexOf("=");
      if (index === -1) return;
      cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    });
  return cookies;
}

function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${COOKIE_SECURE ? "; Secure" : ""}`;
}

function expiredCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? "; Secure" : ""}`;
}

module.exports = {
  ACCOUNTS_PATH,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  VALID_COURSE_IDS,
  createSession,
  destroySession,
  expiredCookie,
  findUser,
  generateSalt,
  getSession,
  hashPassword,
  parseCookies,
  publicUser,
  readAccounts,
  sessionCookie,
  verifyPassword,
  writeAccounts
};
