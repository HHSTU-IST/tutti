const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 账号表、会话、上传数据全部落在临时目录，不读写仓库里的真实数据。
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-deploy-"));
const accountsPath = path.join(rootDir, "accounts.json");
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_COOKIE_SECURE = "0";

const CACHED_MODULES = ["../web/lib/data-dir.cjs", "../web/lib/auth.cjs", "../web/lib/upload-rules.cjs"];

// 会话存储模式与数据目录都在模块加载时读取，所以每次「换配置」都要清缓存重新加载，
// 正好也用来模拟进程重启。
function loadFresh(dataDir, store) {
  CACHED_MODULES.forEach(target => delete require.cache[require.resolve(target)]);
  process.env.TUTTI_DATA_DIR = dataDir;
  if (store) process.env.TUTTI_SESSION_STORE = store;
  else delete process.env.TUTTI_SESSION_STORE;
  delete process.env.TUTTI_RULES_PATH;
  delete process.env.TUTTI_UPLOADS_DIR;

  return {
    auth: require("../web/lib/auth.cjs"),
    uploadRules: require("../web/lib/upload-rules.cjs")
  };
}

function sessionFile(dataDir, token) {
  return path.join(dataDir, "sessions", `${token}.json`);
}

function writeAccounts(users) {
  fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users }));
}

function makeUser(auth, username, password, role, courses) {
  const salt = auth.generateSalt();
  return { username, role, courses, salt, hash: auth.hashPassword(password, salt) };
}

test.after(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
  ["TUTTI_DATA_DIR", "TUTTI_SESSION_STORE", "TUTTI_RULES_PATH", "TUTTI_UPLOADS_DIR"].forEach(key => {
    delete process.env[key];
  });
});

test("会话落盘：进程重启后登录态还在", () => {
  const dataDir = path.join(rootDir, "case-session");
  const first = loadFresh(dataDir, "file").auth;
  assert.equal(first.sessionStoreInfo().store, "file");

  const token = first.createSession({ username: "admin", role: "admin", courses: [] });
  assert.ok(fs.existsSync(sessionFile(dataDir, token)), "默认应把会话写进 sessions/ 目录");

  // 清缓存重新加载 = 重启进程
  const restarted = loadFresh(dataDir, "file").auth;
  const session = restarted.getSession(token);
  assert.ok(session, "重启后不应掉线");
  assert.equal(session.username, "admin");
  assert.equal(session.isAdmin, true);
  assert.ok(session.unlocked.length > 0, "管理员会话应带全部课程");

  const stored = JSON.parse(fs.readFileSync(sessionFile(dataDir, token), "utf8"));
  assert.equal(stored.username, "admin");
  assert.equal(stored.quiz, undefined, "进行中的练习不应落盘");
});

test("一处登出，共享同一数据目录的另一实例立即失效", () => {
  const dataDir = path.join(rootDir, "case-logout");
  const first = loadFresh(dataDir, "file").auth;
  const token = first.createSession({ username: "student", role: "user", courses: ["py"] });

  const second = loadFresh(dataDir, "file").auth;
  assert.ok(second.getSession(token), "另一实例应能读到这份会话");

  first.destroySession(token);
  assert.equal(second.getSession(token), null, "别处登出后本实例不应再认这个会话");
});

test("进行中的练习只存内存，登出即清", () => {
  const dataDir = path.join(rootDir, "case-quiz");
  const auth = loadFresh(dataDir, "file").auth;
  const token = auth.createSession({ username: "student", role: "user", courses: ["py"] });

  auth.setSessionQuiz(token, { items: [{ correctAnswer: "A" }] });
  assert.ok(auth.getSessionQuiz(token), "同一会话内应能取到练习");

  auth.destroySession(token);
  assert.equal(auth.getSessionQuiz(token), null, "登出后练习应被清掉");
});

test("TUTTI_SESSION_STORE=memory 时不落盘，重启即失效", () => {
  const dataDir = path.join(rootDir, "case-memory");
  const first = loadFresh(dataDir, "memory").auth;
  assert.equal(first.sessionStoreInfo().store, "memory");

  const token = first.createSession({ username: "demo", role: "user", courses: ["py"] });
  assert.equal(fs.existsSync(path.join(dataDir, "sessions")), false, "memory 模式不应写会话文件");

  const restarted = loadFresh(dataDir, "memory").auth;
  assert.equal(restarted.getSession(token), null, "memory 模式重启后会话失效");
});

test("非法会话 id（路径穿越写法）直接视为未登录", () => {
  const dataDir = path.join(rootDir, "case-token");
  const auth = loadFresh(dataDir, "file").auth;

  ["../../data/accounts.json", "..\\..\\data\\accounts.json", "not-a-token", ""].forEach(token => {
    assert.equal(auth.getSession(token), null, `非法 id "${token}" 不应命中会话`);
    assert.equal(auth.destroySession(token), false);
  });
});

test("上传规则与作业文件落在 TUTTI_DATA_DIR 下", () => {
  const dataDir = path.join(rootDir, "case-uploads");
  const { uploadRules } = loadFresh(dataDir, "file");

  assert.equal(uploadRules.RULES_PATH, path.join(dataDir, "upload-rules.json"));
  assert.equal(uploadRules.UPLOADS_DIR, path.join(dataDir, "uploads"));

  const saved = uploadRules.writeRules({
    allowedExtensions: [".pdf"],
    filenamePattern: "^hw-\\d{2}\\.pdf$",
    filenameHint: "hw-两位数字.pdf",
    maxSizeMb: 5
  });
  assert.deepEqual(saved.allowedExtensions, [".pdf"]);
  assert.ok(fs.existsSync(path.join(dataDir, "upload-rules.json")), "规则应写进数据目录");

  const record = uploadRules.saveUpload({
    courseId: "py",
    username: "student",
    fileName: "hw-01.pdf",
    sizeBytes: 3,
    content: Buffer.from("abc")
  });
  assert.ok(fs.existsSync(path.join(dataDir, "uploads", record.storedName)), "作业应落进数据目录的 uploads/");
});

test("Node 版本要求：engines、常量与 README 三处一致", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../web/package.json"), "utf8"));
  const { MIN_NODE_VERSION, checkNodeVersion } = require("../web/lib/node-version.cjs");

  assert.equal(pkg.engines.node, `>=${MIN_NODE_VERSION}`, "web/package.json 的 engines 必须与常量一致");
  assert.match(MIN_NODE_VERSION, /^22\./, "项目统一要求 Node 22");

  const readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
  assert.ok(readme.includes(MIN_NODE_VERSION), `README 里应写明要求的 Node 版本 ${MIN_NODE_VERSION}`);

  assert.equal(checkNodeVersion(MIN_NODE_VERSION).ok, true);
  assert.equal(checkNodeVersion("22.5.0").ok, false, "22.6 以下缺少 stripTypeScriptTypes，必须判不达标");
  assert.equal(checkNodeVersion("18.20.4").ok, false);
  assert.equal(checkNodeVersion("24.21.0").ok, true);
  assert.equal(checkNodeVersion().ok, true, "跑测试的 Node 应满足项目要求");
});

test("账号表默认读仓库 data/accounts.json，没有第二份副本", () => {
  const modulePath = path.join(__dirname, "../web/lib/auth.cjs");
  const result = spawnSync(
    process.execPath,
    ["-e", `delete process.env.TUTTI_ACCOUNTS_PATH; console.log(require(${JSON.stringify(modulePath)}).ACCOUNTS_PATH);`],
    { cwd: path.join(__dirname, ".."), encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), path.join(__dirname, "..", "data", "accounts.json"));
});

test("默认密码自检能检出 admin2026，改掉后放行", () => {
  const dataDir = path.join(rootDir, "case-defaults");
  const { auth } = loadFresh(dataDir, "file");

  writeAccounts([
    makeUser(auth, "admin", "admin2026", "admin", []),
    makeUser(auth, "demo", "demo-pwd", "user", ["py"])
  ]);
  assert.deepEqual(auth.findUsersWithDefaultPassword(), ["admin"], "应只检出仍在用默认密码的 admin");

  writeAccounts([
    makeUser(auth, "admin", "Zr7k-mQ2vB9p", "admin", []),
    makeUser(auth, "demo", "Xc4n-Wt8sL3d", "user", ["py"])
  ]);
  assert.deepEqual(auth.findUsersWithDefaultPassword(), [], "换掉密码后不应再告警");
});
