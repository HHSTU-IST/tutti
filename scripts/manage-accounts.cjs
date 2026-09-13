#!/usr/bin/env node
const crypto = require("crypto");
const path = require("path");

// 账号表的唯一真源是仓库根目录 data/accounts.json，网页服务（web/lib/auth.cjs）直接读它，
// 改完重启服务即生效。这里显式指定路径，不依赖 auth.cjs 的默认解析——
// 覆盖，导致用本脚本改的账号/密码静默丢失。这里强制锁定真源。
process.env.TUTTI_ACCOUNTS_PATH = path.join(__dirname, "../data/accounts.json");

const auth = require("../web/lib/auth.cjs");

// 初始化时的账号种子。密码从环境变量取，取不到就现场随机生成并只打印一次——
// 这里曾经写死 admin2026 / demo2026，是上线必改项，现在源码里不再有可用口令。
const DEFAULT_ACCOUNT_SEEDS = [
  { username: "admin", role: "admin", courses: [], passwordEnv: "TUTTI_ADMIN_PASSWORD" },
  { username: "demo", role: "user", courses: ["py"], passwordEnv: "TUTTI_DEMO_PASSWORD" }
];

// 去掉易混淆字符（0/O、1/l/I），方便转抄。
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomPassword(length = 16) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return out;
}

function usage() {
  console.log(`账号管理（网页端刷题助手）

用法:
  node scripts/manage-accounts.cjs init
      首次初始化：若无账号则写入管理员 admin 与普通账号 demo。
      密码取 TUTTI_ADMIN_PASSWORD / TUTTI_DEMO_PASSWORD；未设置则随机生成并打印一次。

  node scripts/manage-accounts.cjs list
      列出全部账号（不输出密码）。

  node scripts/manage-accounts.cjs add <用户名> <密码> [--role admin|user] [--courses py,ml]
      新增账号。admin 自动解锁全部题库；user 需指定已购课程。

  node scripts/manage-accounts.cjs courses <用户名> <课程列表>
      设置已购课程，逗号分隔，例如 py,ml。留空表示全部收回。

  node scripts/manage-accounts.cjs passwd <用户名> <新密码|--random>
      修改密码；传 --random 或不传密码则随机生成一个强密码并打印一次。

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

    const seeds = DEFAULT_ACCOUNT_SEEDS.map(seed => {
      const fromEnv = String(process.env[seed.passwordEnv] || "").trim();
      return Object.assign({}, seed, { password: fromEnv || randomPassword(), generated: !fromEnv });
    });

    save(seeds.map(item => createUser(item.username, item.password, item.role, item.courses)));
    console.log("已写入账号（密码只在本次输出，请立即记录）：");
    seeds.forEach(item => {
      const scope = item.role === "admin" ? "全部题库（管理员）" : (item.courses.join(", ") || "无");
      console.log(`  ${item.username} / ${item.password}  [${item.role}]  ${scope}${item.generated ? "" : "  （来自环境变量）"}`);
    });
    console.log("\n想自己指定密码，先设置 TUTTI_ADMIN_PASSWORD / TUTTI_DEMO_PASSWORD 再执行 init。");
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
    // 必须在 main() 已读入的 accounts.users 里定位，才能保证修改被 save 落盘；
    // auth.findUser 会重新读文件返回游离对象，改它不会写回。
    const user = accounts.users.find(item => item.username === String(username || "").trim()) || null;
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
    const [username, requested] = rest;
    // 必须在 main() 已读入的 accounts.users 里定位，才能保证修改被 save 落盘；
    // auth.findUser 会重新读文件返回游离对象，改它不会写回。
    const user = accounts.users.find(item => item.username === String(username || "").trim()) || null;
    if (!user) {
      usage();
      process.exitCode = 1;
      return;
    }

    const generated = !requested || requested === "--random";
    const password = generated ? randomPassword() : requested;

    user.salt = auth.generateSalt();
    user.hash = auth.hashPassword(password, user.salt);
    user.updatedAt = new Date().toISOString();
    save(accounts.users);
    console.log(generated ? `已更新 ${username} 的密码：${password}（只显示这一次，请立即记录）` : `已更新 ${username} 的密码。`);
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
