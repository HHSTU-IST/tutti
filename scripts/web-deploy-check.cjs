#!/usr/bin/env node
// 网页版部署清单自检：默认密码、账号表同步、会话存储、运行数据目录。
// 每项打印 [OK] 或 [!!]，有任何一项未通过时退出码为 1，可接进发布流程。
const fs = require("fs");
const path = require("path");

const auth = require("../web/lib/auth.cjs");
const uploadRules = require("../web/lib/upload-rules.cjs");
const { DATA_DIR, ensureWritable, isInsideAppDir } = require("../web/lib/data-dir.cjs");
const { createReporter } = require("./check-report.cjs");

const APP_DIR = path.join(__dirname, "..");
const REPO_ACCOUNTS = path.join(APP_DIR, "data", "accounts.json");
const BUNDLED_ACCOUNTS = path.join(APP_DIR, "web", "data", "accounts.json");

const reporter = createReporter();

// 各 check 统一用 report(条件, 标题, 详情) 记录，输出与退出码交给 report 模块。
const report = (passed, title, detail) => reporter.report(passed ? "ok" : "fail", title, detail);

function checkAccounts() {
  let users = [];
  try {
    users = auth.readAccounts().users;
  } catch (error) {
    report(false, "账号表可解析", `读取 ${auth.ACCOUNTS_PATH} 失败：${error.message}`);
    return;
  }

  report(
    users.length > 0,
    "账号表已初始化",
    users.length
      ? `${users.length} 个账号：${users.map(user => user.username).join("、")}\n服务端读取：${auth.ACCOUNTS_PATH}`
      : "账号表为空，先执行 node scripts/manage-accounts.cjs init"
  );

  const risky = auth.findUsersWithDefaultPassword();
  report(
    risky.length === 0,
    "默认密码已替换",
    risky.length
      ? `仍在用历史默认密码：${risky.join("、")}\n处理：node scripts/manage-accounts.cjs passwd ${risky[0]} --random，然后重跑 node scripts/build-web-bundle.cjs`
      : "未检出 admin2026 / demo2026"
  );

  if (!fs.existsSync(REPO_ACCOUNTS)) return;

  if (!fs.existsSync(BUNDLED_ACCOUNTS)) {
    report(false, "账号表已同步到发布目录", "缺少 web/data/accounts.json：先跑 node scripts/build-web-bundle.cjs");
    return;
  }

  const synced = fs.readFileSync(REPO_ACCOUNTS, "utf8") === fs.readFileSync(BUNDLED_ACCOUNTS, "utf8");
  report(
    synced,
    "账号表已同步到发布目录",
    synced
      ? "data/accounts.json 与 web/data/accounts.json 一致"
      : "两份不一致：改过密码或课程后要重跑 node scripts/build-web-bundle.cjs，否则线上还是旧账号"
  );
}

function checkSessionStore() {
  const store = auth.sessionStoreInfo();
  const ok = store.store === "file";

  report(
    ok,
    "会话存储可跨重启",
    ok
      ? `会话目录：${store.dir}\n重启不掉线；多实例把 TUTTI_DATA_DIR 指向同一持久化目录即共享会话，否则需自己接 Redis 等共享存储`
      : "当前为进程内存：重启即全员掉线\n未设置时默认就是 file，请检查是否显式设成了 TUTTI_SESSION_STORE=memory"
  );
}

function checkDataDir() {
  const writable = ensureWritable(DATA_DIR);
  const inside = isInsideAppDir(DATA_DIR);

  report(
    writable && !inside,
    "运行数据已持久化",
    !writable
      ? `数据目录不可写：${DATA_DIR}\n用 TUTTI_DATA_DIR 指向平台提供的可写持久化目录`
      : inside
        ? `数据目录在应用目录内：${DATA_DIR}\n重新发布会连登录会话、上传规则与学员作业一起覆盖，用 TUTTI_DATA_DIR 指向持久化目录`
        : `数据目录：${DATA_DIR}\n上传规则：${uploadRules.RULES_PATH}\n学员作业：${uploadRules.UPLOADS_DIR}`
  );
}

function main() {
  console.log("网页版部署自检（对应 README「网页版部署清单」）\n");

  checkAccounts();
  checkSessionStore();
  checkDataDir();

  reporter.print();
}

main();
