const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { catalog } = require("./banks.cjs");
const { DATA_DIR } = require("./data-dir.cjs");

// 账号表只有一份真源：仓库根目录 data/accounts.json（scripts/manage-accounts.cjs 也改这一处）。
// 测试用 TUTTI_ACCOUNTS_PATH 指向临时文件，不读写真实账号表。
const REPO_ACCOUNTS = path.join(__dirname, "../../data/accounts.json");
const ACCOUNTS_PATH = process.env.TUTTI_ACCOUNTS_PATH || REPO_ACCOUNTS;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 120000;
const SESSION_COOKIE = "sid";
const COOKIE_SECURE = !(process.env.TUTTI_COOKIE_SECURE === "0" || String(process.env.TUTTI_COOKIE_SECURE).toLowerCase() === "false");

// 历史默认密码，只用于「上线自检」检出现存账号是否还在用：
// 新部署由 manage-accounts.cjs 随机生成，不再产生这两个口令。
const DEFAULT_PASSWORDS = { admin: "admin2026", demo: "demo2026" };

// 会话存储（TUTTI_SESSION_STORE）：
// - file（默认）：一个会话一个 JSON 文件，落在运行数据目录的 sessions/ 下。
//   进程重启不掉线；多实例共享同一 TUTTI_DATA_DIR 时共用会话，注销/掉权限立即生效。
// - memory：退回单进程内存，重启即全员掉线（旧行为）。
const SESSION_STORE = resolveSessionStore();
const SESSION_DIR = process.env.TUTTI_SESSION_DIR || path.join(DATA_DIR, "sessions");
// 会话 id 会被拼进文件名，所以读取前必须先卡格式，挡掉 ../../ 这类路径穿越。
const TOKEN_PATTERN = /^[a-f0-9]{32,128}$/;
const PURGE_INTERVAL_MS = 10 * 60 * 1000;

const memorySessions = new Map();
// 进行中的练习只存内存：正确答案不下发，重启后重开即可，不值得落盘。
const quizByToken = new Map();
let fileStoreDisabled = false;
let lastPurgeAt = 0;
const VALID_COURSE_IDS = catalog.map(course => course.id);

function resolveSessionStore() {
  const raw = String(process.env.TUTTI_SESSION_STORE || "").trim().toLowerCase();
  if (!raw) return "file";
  if (raw === "file" || raw === "memory") return raw;
  console.warn(`未知的 TUTTI_SESSION_STORE=${raw}，已按 file 处理（可选：file / memory）。`);
  return "file";
}

function useFileStore() {
  return SESSION_STORE === "file" && !fileStoreDisabled;
}

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

// 上线自检：检出仍在用历史默认密码的账号（新部署不会产生这类账号）。
function findUsersWithDefaultPassword() {
  return readAccounts()
    .users.filter(user => {
      const candidate = DEFAULT_PASSWORDS[user.username];
      return candidate ? verifyPassword(user, candidate) : false;
    })
    .map(user => user.username);
}

function isValidToken(token) {
  return TOKEN_PATTERN.test(String(token || ""));
}

function sessionFilePath(token) {
  return path.join(SESSION_DIR, `${token}.json`);
}

function toSession(token, record) {
  return {
    token,
    username: String(record.username || ""),
    role: String(record.role || "user"),
    unlocked: Array.isArray(record.unlocked) ? record.unlocked.slice() : [],
    isAdmin: Boolean(record.isAdmin),
    expiresAt: Number(record.expiresAt)
  };
}

// 落盘时只留权限与有效期；进行中的练习留在内存里。
function toRecord(session) {
  return {
    username: session.username,
    role: session.role,
    unlocked: session.unlocked,
    isAdmin: session.isAdmin,
    expiresAt: session.expiresAt
  };
}

function readSessionFile(token) {
  const file = sessionFilePath(token);

  try {
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!record || Number(record.expiresAt) <= Date.now()) {
      fs.rmSync(file, { force: true });
      return null;
    }
    return toSession(token, record);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`会话文件读取失败，按未登录处理：${error.message}`);
    return null;
  }
}

// 每个会话一个文件、写完改名落盘：不会和其他实例（或本实例的并发请求）抢同一个文件。
function writeSessionFile(session) {
  if (!useFileStore()) return;

  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    const file = sessionFilePath(session.token);
    const tmpPath = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(toRecord(session))}\n`, "utf8");
    fs.renameSync(tmpPath, file);
  } catch (error) {
    if (!fileStoreDisabled) {
      fileStoreDisabled = true;
      console.warn(`会话文件写入失败，本次运行降级为进程内存会话（重启会掉线）：${error.message}`);
    }
  }
}

function removeSessionFile(token) {
  if (!useFileStore() || !isValidToken(token)) return;

  try {
    fs.rmSync(sessionFilePath(token), { force: true });
  } catch (error) {
    // 文件删不掉不影响本进程把会话视为失效。
  }
}

// 过期会话文件由任意实例顺手清理，节流到每 10 分钟扫一次目录。
function purgeExpiredSessionFiles(now) {
  if (!useFileStore() || now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;

  let names;
  try {
    names = fs.readdirSync(SESSION_DIR);
  } catch (error) {
    return;
  }

  names.filter(name => name.endsWith(".json")).forEach(name => {
    const file = path.join(SESSION_DIR, name);
    try {
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!record || Number(record.expiresAt) > now) return;
    } catch (error) {
      // 坏文件一并清掉。
    }
    fs.rmSync(file, { force: true });
  });
}

function createSession(user) {
  clearExpiredSessions();
  pruneQuizzes();

  const token = crypto.randomBytes(24).toString("hex");
  const session = {
    token,
    username: user.username,
    role: user.role,
    unlocked: resolveEntitlements(user),
    isAdmin: user.role === "admin",
    expiresAt: Date.now() + SESSION_TTL_MS
  };

  if (useFileStore()) writeSessionFile(session);
  else memorySessions.set(token, session);

  return token;
}

function getSession(token) {
  if (!isValidToken(token)) return null;

  // 文件存储每个请求都核对文件：别处注销、课程权限变更都能立刻反映到本实例。
  if (useFileStore()) return readSessionFile(token);

  const session = memorySessions.get(token);
  if (!session) return null;

  if (Number(session.expiresAt) <= Date.now()) {
    destroySession(token);
    return null;
  }

  return session;
}

function destroySession(token) {
  if (!isValidToken(token)) return false;

  quizByToken.delete(token);
  if (!useFileStore()) return memorySessions.delete(token);

  const existed = fs.existsSync(sessionFilePath(token));
  removeSessionFile(token);
  return existed;
}

function clearExpiredSessions() {
  const now = Date.now();

  memorySessions.forEach((session, token) => {
    if (Number(session.expiresAt) <= now) {
      memorySessions.delete(token);
      quizByToken.delete(token);
    }
  });

  purgeExpiredSessionFiles(now);
}

// 进行中的练习按会话 id 存内存：重启后重新组卷即可，不落盘。
function setSessionQuiz(token, quiz) {
  if (!isValidToken(token)) return;

  if (quiz) quizByToken.set(token, quiz);
  else quizByToken.delete(token);
}

function getSessionQuiz(token) {
  return (token && quizByToken.get(token)) || null;
}

// 会话已在别处注销时，内存里那份练习留着只会占内存。
function pruneQuizzes() {
  quizByToken.forEach((quiz, token) => {
    if (!getSession(token)) quizByToken.delete(token);
  });
}

function sessionStoreInfo() {
  return {
    configured: SESSION_STORE,
    store: useFileStore() ? "file" : "memory",
    degraded: fileStoreDisabled,
    dir: SESSION_DIR,
    dataDir: DATA_DIR,
    ttlMs: SESSION_TTL_MS
  };
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
  DEFAULT_PASSWORDS,
  SESSION_COOKIE,
  SESSION_DIR,
  SESSION_STORE,
  SESSION_TTL_MS,
  VALID_COURSE_IDS,
  createSession,
  destroySession,
  expiredCookie,
  findUser,
  findUsersWithDefaultPassword,
  generateSalt,
  getSession,
  getSessionQuiz,
  hashPassword,
  parseCookies,
  publicUser,
  readAccounts,
  sessionCookie,
  sessionStoreInfo,
  setSessionQuiz,
  verifyPassword,
  writeAccounts
};
