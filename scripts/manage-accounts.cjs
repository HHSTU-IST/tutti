#!/usr/bin/env node
const auth = require("../web/lib/auth.cjs");

const DEFAULT_ACCOUNTS = [
  { username: "admin", password: "admin2026", role: "admin", courses: [] },
  { username: "demo", password: "demo2026", role: "user", courses: ["py"] }
];

function usage() {
  console.log(`账号管理（网页端刷题助手）

用法:
  node scripts/manage-accounts.cjs init
      首次初始化：若无账号则写入默认管理员 admin 与普通账号 demo。

  node scripts/manage-accounts.cjs list
      列出全部账号（不输出密码）。

  node scripts/manage-accounts.cjs add <用户名> <密码> [--role admin|user] [--courses py,ml]
      新增账号。admin 自动解锁全部题库；user 需指定已购课程。

  node scripts/manage-accounts.cjs courses <用户名> <课程列表>
      设置已购课程，逗号分隔，例如 py,ml。留空表示全部收回。

  node scripts/manage-accounts.cjs passwd <用户名> <新密码>
      修改密码。

  node scripts/manage-accounts.cjs remove <用户名>
      删除账号。

可选课程: ${auth.VALID_COURSE_IDS.join(", ")}
`);
}

function parseArg(flag, fallback = "") {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function parseCourses(raw) {
  return String(raw || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .filter(id => {
      if (auth.VALID_COURSE_IDS.includes(id)) return true;
      console.warn(`忽略未知课程: ${id}`);
      return false;
    });
}

function createUser(username, password, role, courses) {
  const salt = auth.generateSalt();
  return {
    username,
    role,
    courses: role === "admin" ? [] : courses,
    salt,
    hash: auth.hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };
}

function save(users) {
  auth.writeAccounts({ version: 1, users });
}

function main() {
  const [, , command, ...rest] = process.argv;
  const accounts = auth.readAccounts();

  if (!command || command === "help") {
    usage();
    return;
  }

  if (command === "init") {
    if (accounts.users.length) {
      console.log(`已有 ${accounts.users.length} 个账号，跳过初始化。`);
      return;
    }
    save(DEFAULT_ACCOUNTS.map(item => createUser(item.username, item.password, item.role, item.courses)));
    console.log("已写入默认账号：");
    DEFAULT_ACCOUNTS.forEach(item => {
      const scope = item.role === "admin" ? "全部题库（管理员）" : (item.courses.join(", ") || "无");
      console.log(`  ${item.username} / ${item.password}  [${item.role}]  ${scope}`);
    });
    console.log("\n请尽快修改密码。");
    return;
  }

  if (command === "list") {
    if (!accounts.users.length) {
      console.log("暂无账号，先执行 init 或 add。");
      return;
    }
    accounts.users.forEach(user => {
      const scope = user.role === "admin" ? "全部题库" : ((user.courses || []).join(", ") || "无");
      console.log(`  ${user.username.padEnd(12)} [${user.role.padEnd(5)}] ${scope}`);
    });
    return;
  }

  if (command === "add") {
    const [username, password] = rest;
    if (!username || !password) {
      usage();
      process.exitCode = 1;
      return;
    }
    if (auth.findUser(username)) {
      console.error(`账号已存在: ${username}`);
      process.exitCode = 1;
      return;
    }
    const role = parseArg("--role", "user") === "admin" ? "admin" : "user";
    const user = createUser(username, password, role, parseCourses(parseArg("--courses")));
    save(accounts.users.concat(user));
    console.log(`已添加 ${username} [${role}] ${role === "admin" ? "全部题库" : (user.courses.join(", ") || "无")}`);
    return;
  }

  if (command === "courses") {
    const [username, raw] = rest;
    const user = auth.findUser(username);
    if (!user) {
      console.error(`账号不存在: ${username}`);
      process.exitCode = 1;
      return;
    }
    if (user.role === "admin") {
      console.log("管理员默认解锁全部题库，无需设置课程。");
      return;
    }
    user.courses = parseCourses(raw);
    user.updatedAt = new Date().toISOString();
    save(accounts.users);
    console.log(`${username} 已购课程: ${user.courses.join(", ") || "无"}`);
    return;
  }

  if (command === "passwd") {
    const [username, password] = rest;
    const user = auth.findUser(username);
    if (!user || !password) {
      usage();
      process.exitCode = 1;
      return;
    }
    user.salt = auth.generateSalt();
    user.hash = auth.hashPassword(password, user.salt);
    user.updatedAt = new Date().toISOString();
    save(accounts.users);
    console.log(`已更新 ${username} 的密码。`);
    return;
  }

  if (command === "remove") {
    const [username] = rest;
    if (!auth.findUser(username)) {
      console.error(`账号不存在: ${username}`);
      process.exitCode = 1;
      return;
    }
    save(accounts.users.filter(user => user.username !== username));
    console.log(`已删除 ${username}。`);
    return;
  }

  usage();
  process.exitCode = 1;
}

main();
