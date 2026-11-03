const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 直接驱动 auth 模块（不起 HTTP）：验证「按实时账号表重算权限」这条读路径，
// 以及删号必须靠吊销会话、而不是靠 getSession 自动失效。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-ent-"));
const accountsPath = path.join(tempDir, "accounts.json");
process.env.TUTTI_ACCOUNTS_PATH = accountsPath;
process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_SESSION_STORE = "file";
delete process.env.TUTTI_SESSION_DIR;

const auth = require("../web/lib/auth.cjs");
const ALL_COURSES = auth.VALID_COURSE_IDS;

function writeAccounts(users) {
  fs.writeFileSync(accountsPath, JSON.stringify({ version: 1, users }));
}

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("改课后进行中的会话下一个请求就按新课程生效，无需重新登录", () => {
  writeAccounts([{ username: "alice", role: "user", courses: ["py", "ml"] }]);
  const token = auth.createSession({ username: "alice", role: "user", courses: ["py", "ml"] });

  assert.deepEqual(auth.getSession(token).unlocked, ["py", "ml"], "初始应解锁两门课");

  // 收课：只改账号表，不动会话。
  writeAccounts([{ username: "alice", role: "user", courses: ["py"] }]);
  const after = auth.getSession(token);
  assert.deepEqual(after.unlocked, ["py"], "收课后应立刻只剩 py");
  assert.equal(after.token, token, "同一会话 token 不变");
});

test("账号被提为管理员后，老会话立即解锁全部题库", () => {
  writeAccounts([{ username: "bob", role: "user", courses: ["py"] }]);
  const token = auth.createSession({ username: "bob", role: "user", courses: ["py"] });
  assert.equal(auth.getSession(token).isAdmin, false);

  writeAccounts([{ username: "bob", role: "admin", courses: [] }]);
  const promoted = auth.getSession(token);
  assert.equal(promoted.isAdmin, true, "提权应即时反映到会话");
  assert.deepEqual(promoted.unlocked, ALL_COURSES, "管理员解锁全部课程");
});

test("账号被改到不在表里时：getSession 保留快照（删号不靠这里失效）", () => {
  writeAccounts([{ username: "carol", role: "user", courses: ["py"] }]);
  const token = auth.createSession({ username: "carol", role: "user", courses: ["py"] });

  // 从账号表删掉 carol，但没吊销会话文件。
  writeAccounts([]);
  const snapshot = auth.getSession(token);
  assert.ok(snapshot, "账号不在表里时不应把会话判空（这是给合成会话留的行为）");
  assert.deepEqual(snapshot.unlocked, ["py"], "取不到实时账号就退回登录时的快照");
});

test("吊销会话后 getSession 立即判空——删号/改密的即时失效靠这一步", () => {
  writeAccounts([{ username: "dave", role: "user", courses: ["py"] }]);
  const token = auth.createSession({ username: "dave", role: "user", courses: ["py"] });
  assert.ok(auth.getSession(token), "吊销前应在线");

  const revoked = auth.revokeSessionsForUsernames(["dave"]);
  assert.equal(revoked, 1, "应吊销到一个会话文件");
  assert.equal(auth.getSession(token), null, "吊销后应立刻判空");
});
