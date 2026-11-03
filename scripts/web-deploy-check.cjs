#!/usr/bin/env node
// 网页版运行自检：账号表、历史泄露口令、会话存储、运行数据目录。
// 启动服务前跑一遍（或接进自己的部署流程）：每项打印 [OK] / [!!] / [提示]，有 [!!] 时退出码为 1。
const auth = require("../web/lib/auth.cjs");
const uploadRules = require("../web/lib/upload-rules.cjs");
const { DATA_DIR, ensureWritable, isInsideAppDir } = require("../web/lib/data-dir.cjs");
const { createReporter } = require("./check-report.cjs");

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
    "无账号使用已公开的历史口令",
    risky.length
      ? `命中 admin2026 / demo2026（这两个值曾随 data/accounts.json 进 git 历史，已被还原）：${risky.join("、")}\n`
      + "服务端会直接拒绝这些账号登录（403）。\n"
      + `处理：node scripts/manage-accounts.cjs passwd ${risky[0]} --random，然后重启服务；`
      + "本地演示要放行才设 TUTTI_ALLOW_LEAKED_PASSWORDS=1"
      : "未检出已公开的历史口令"
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
  if (!ensureWritable(DATA_DIR)) {
    report(
      false,
      "数据目录可写",
      `目录不可写：${DATA_DIR}\n用 TUTTI_DATA_DIR 指到一个可写目录，否则上传规则、学员作业与登录会话都存不住`
    );
    return;
  }

  // 默认就落在 web/data：单机跑够用，但更新代码时容易被一并换掉，所以只提示、不算失败。
  if (isInsideAppDir(DATA_DIR)) {
    reporter.hint(
      "运行数据位置",
      `数据目录在应用目录内：${DATA_DIR}\n`
      + `上传规则：${uploadRules.RULES_PATH}\n学员作业：${uploadRules.UPLOADS_DIR}\n`
      + "更新代码（重新拉取或覆盖部署）会连会话、上传规则与作业一起换掉；想长期保留就把 TUTTI_DATA_DIR 指到应用目录之外，"
      + "再用 GET /api/health 的 dataDirBoots / dataDirFirstBootAt 复核重启后有没有被重置。"
    );
    return;
  }

  report(
    true,
    "运行数据在应用目录之外",
    `数据目录：${DATA_DIR}\n上传规则：${uploadRules.RULES_PATH}\n学员作业：${uploadRules.UPLOADS_DIR}`
  );
}

function main() {
  console.log("网页版运行自检（对应 docs/development.md 的「部署清单 · 网页版」）\n");

  checkAccounts();
  checkSessionStore();
  checkDataDir();

  reporter.print();
}

main();
#!/usr/bin / env node
// 网页版运行自检：账号表、历史泄露口令、会话存储、运行数据目录。
// 启动服务前跑一遍（或接进自己的部署流程）：每项打印 [OK] / [!!] / [提示]，有 [!!] 时退出码为 1。
const auth = require("../web/lib/auth.cjs");
const uploadRules = require("../web/lib/upload-rules.cjs");
const { DATA_DIR, ensureWritable, isInsideAppDir } = require("../web/lib/data-dir.cjs");
const { createReporter } = require("./check-report.cjs");

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
    "无账号使用已公开的历史口令",
    risky.length
      ? `命中 admin2026 / demo2026（这两个值曾随 data/accounts.json 进 git 历史，已被还原）：${risky.join("、")}\n`
      + "服务端会直接拒绝这些账号登录（403）。\n"
      + `处理：node scripts/manage-accounts.cjs passwd ${risky[0]} --random，然后重启服务；`
      + "本地演示要放行才设 TUTTI_ALLOW_LEAKED_PASSWORDS=1"
      : "未检出已公开的历史口令"
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

  // 会话能共享，不代表练习也能共享：这是单实例设计里最容易被多实例部署踩到的坑，如实提示。
  reporter.hint(
    "进行中的练习不跨实例",
    "组卷答案与判题进度只在单进程内存里、不落盘也不跨实例共享：多实例做负载均衡时须开启会话粘滞"
    + "（同一浏览器固定打到同一实例），否则答题可能中途报「当前没有进行中的练习」。本网页版按单实例设计。"
  );
}

function checkDataDir() {
  if (!ensureWritable(DATA_DIR)) {
    report(
      false,
      "数据目录可写",
      `目录不可写：${DATA_DIR}\n用 TUTTI_DATA_DIR 指到一个可写目录，否则上传规则、学员作业与登录会话都存不住`
    );
    return;
  }

  // 默认就落在 web/data：单机跑够用，但更新代码时容易被一并换掉，所以只提示、不算失败。
  if (isInsideAppDir(DATA_DIR)) {
    reporter.hint(
      "运行数据位置",
      `数据目录在应用目录内：${DATA_DIR}\n`
      + `上传规则：${uploadRules.RULES_PATH}\n学员作业：${uploadRules.UPLOADS_DIR}\n`
      + "更新代码（重新拉取或覆盖部署）会连会话、上传规则与作业一起换掉；想长期保留就把 TUTTI_DATA_DIR 指到应用目录之外，"
      + "再用 GET /api/health 的 dataDirBoots / dataDirFirstBootAt 复核重启后有没有被重置。"
    );
    return;
  }

  report(
    true,
    "运行数据在应用目录之外",
    `数据目录：${DATA_DIR}\n上传规则：${uploadRules.RULES_PATH}\n学员作业：${uploadRules.UPLOADS_DIR}`
  );
}

function main() {
  console.log("网页版运行自检（对应 docs/development.md 的「部署清单 · 网页版」）\n");

  checkAccounts();
  checkSessionStore();
  checkDataDir();

  reporter.print();
}

main();
