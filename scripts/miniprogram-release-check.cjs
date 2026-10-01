#!/usr/bin/env node
// 小程序发布前自检：把 docs/development.md「部署清单 · 小程序」里能自动判定的项一次跑完。
// 退出码非 0 表示还有未通过项；[手工] 项脚本判不了，需要在真机 / 云开发控制台确认。
const fs = require("fs");
const path = require("path");

const { createReporter } = require("./check-report.cjs");

const APP_DIR = path.join(__dirname, "..");
const RUNTIME_CONFIG_PATH = path.join(APP_DIR, "services", "runtime-config.ts");
const USER_DB_PATH = path.join(APP_DIR, "services", "user-db.ts");
const HOMEWORK_PATH = path.join(APP_DIR, "services", "homework.ts");
const PURCHASE_PATH = path.join(APP_DIR, "services", "purchase.ts");
const ACCESS_PATH = path.join(APP_DIR, "data", "access.ts");
const APP_TS_PATH = path.join(APP_DIR, "app.ts");
const APP_JSON_PATH = path.join(APP_DIR, "app.json");
const PROJECT_CONFIG_PATH = path.join(APP_DIR, "project.config.json");
const README_PATH = path.join(APP_DIR, "README.md");

const USER_COLLECTION = "user_profiles";
const HOMEWORK_COLLECTION = "homework_uploads";
const CLOUD_FUNCTION_ROOT = "cloudfunctions";
const LOGIN_FUNCTION_DIR = path.join(APP_DIR, CLOUD_FUNCTION_ROOT, "login");

// 上传包里不该出现的目录与后缀（微信开发者工具按这个清单裁剪小程序上传包）。
// 云函数走 cloudfunctionRoot 单独上传，也不该打进小程序包。
const REQUIRED_IGNORES = [
  ["folder", "web"],
  ["folder", "scripts"],
  ["folder", "docs"],
  ["folder", "prompts"],
  ["folder", "templates"],
  ["folder", "outputs"],
  ["folder", CLOUD_FUNCTION_ROOT],
  ["suffix", ".md"],
  ["suffix", ".cjs"],
  ["suffix", ".py"]
];

const MANUAL_ITEMS = [
  "trial 体验版真机跑通：上传 → 公众平台设为体验版 → 真机把登录、进入题库、答题、错题本各点一遍再提审",
  "云开发控制台已建集合 user_profiles，权限设为「仅创建者可读写」",
  "开启作业上传时：云开发控制台另建集合 homework_uploads（权限「仅创建者可读写」），云存储权限保持「所有用户可读、仅创建者可写」",
  "cloudfunctions/login 已上传到云开发：开发者工具里右键该目录 →「上传并部署：云端安装依赖」",
  "学员的开通情况已在 user_profiles 里置好：把该用户文档的 agents.<课程> 改成 true（改完让学员重新登录）"
];

const reporter = createReporter({ manual: MANUAL_ITEMS });

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const report = reporter.report;

// 只做静态解析：runtime-config.ts 是 ESM + TypeScript，Node 不能直接求值。
function parseRuntimeConfigBlock(source, blockName) {
  const start = source.indexOf(`const ${blockName}`);
  if (start < 0) return null;

  const open = source.indexOf("{", start);
  const end = source.indexOf("\n};", open);
  const body = source.slice(open, end < 0 ? source.length : end);
  const config = {};

  Array.from(body.matchAll(/^\s*(\w+):\s*(?:"([^"]*)"|(true|false))/gm)).forEach(match => {
    config[match[1]] = match[2] !== undefined ? match[2] : match[3] === "true";
  });

  return config;
}

function checkProductionConfig() {
  const config = parseRuntimeConfigBlock(readText(RUNTIME_CONFIG_PATH), "PRODUCTION_RUNTIME_CONFIG");
  if (!config) {
    report("fail", "生产配置可解析", "没在 services/runtime-config.ts 里找到 PRODUCTION_RUNTIME_CONFIG");
    return;
  }

  const functionName = String(config.loginFunctionName || "");
  report(
    functionName ? "ok" : "fail",
    "登录云函数名已填",
    functionName
      ? `PRODUCTION_RUNTIME_CONFIG.loginFunctionName = ${functionName}`
      : "loginFunctionName 为空：线上调不到登录云函数，首页所有课程置灰"
  );

  report(
    config.enableLocalWechatTestLogin === false ? "ok" : "fail",
    "生产不启用本地测试授权",
    config.enableLocalWechatTestLogin === false
      ? "enableLocalWechatTestLogin = false，开通只看云函数返回的 agents"
      : "enableLocalWechatTestLogin 不是 false：线上会走本地测试授权，等于绕过付费，必须改回 false"
  );

  report(
    config.enableCloudDatabase === true ? "ok" : "fail",
    "生产启用云数据库",
    config.enableCloudDatabase === true
      ? "enableCloudDatabase = true"
      : "enableCloudDatabase 不是 true：登录云函数调不到，答题统计与错题本也不会同步到 user_profiles"
  );

  report(
    config.enableHomeworkUpload === true ? "ok" : "hint",
    "作业上传开关",
    config.enableHomeworkUpload === true
      ? "生产启用作业上传：课程卡片会出现「上传作业」入口，前提是云开发里已建好集合与云存储权限"
      : "生产未开启作业上传：首页与课程页都不显示作业入口（要开就把 enableHomeworkUpload 改成 true）"
  );

  if (!config.cloudEnv) {
    report(
      "hint",
      "云环境 ID（cloudEnv）未填",
      "留空会连默认云环境；多环境部署时填上环境 ID，否则可能写到别的环境的 user_profiles"
    );
  }
}

function checkAuthorizationSource() {
  const purchase = readText(PURCHASE_PATH);
  const usesCloudLogin = /wx\.cloud\.callFunction\s*\(/.test(purchase)
    && /RUNTIME_CONFIG\.loginFunctionName/.test(purchase);
  const localBranchGuarded = /RUNTIME_CONFIG\.enableLocalWechatTestLogin/.test(purchase);

  report(
    usesCloudLogin && localBranchGuarded ? "ok" : "fail",
    "生产授权走登录云函数",
    usesCloudLogin && localBranchGuarded
      ? "services/purchase.ts 的生产分支调 loginFunctionName 指定的云函数，本地测试分支被 enableLocalWechatTestLogin 开关包住"
      : "purchase.ts 里没看到 wx.cloud.callFunction 调 loginFunctionName，或被开关约束的本地测试分支，生产开通来源无法确认"
  );

  const enabled = Array.from(readText(ACCESS_PATH).matchAll(/^\s*(\w+):\s*true/gm), match => match[1]);
  report(
    "hint",
    "本地测试开关（data/access.ts）",
    enabled.length
      ? `当前置为 true 的课程：${enabled.join("、")}。只在开发配置生效，生产由后台 agents 决定，不需要清空`
      : "没有课程被置为 true"
  );
}

function checkCloudFunction() {
  const loginIndex = path.join(LOGIN_FUNCTION_DIR, "index.js");
  const loginPackage = path.join(LOGIN_FUNCTION_DIR, "package.json");
  const hasIndex = fs.existsSync(loginIndex);
  const hasPackage = fs.existsSync(loginPackage);

  report(
    hasIndex && hasPackage ? "ok" : "fail",
    "登录云函数已入库",
    hasIndex && hasPackage
      ? `${CLOUD_FUNCTION_ROOT}/login 有 index.js 与 package.json，上传时选「云端安装依赖」`
      : `缺少 ${path.relative(APP_DIR, hasIndex ? loginPackage : loginIndex)}：云函数要在仓库里维护，才能在开发者工具里右键上传`
  );

  const usesWxContext = hasIndex && /getWXContext\s*\(/.test(readText(loginIndex));
  report(
    usesWxContext ? "ok" : "fail",
    "云函数用 getWXContext 取 openid",
    usesWxContext
      ? "cloudfunctions/login 用 cloud.getWXContext() 拿调用者 openid，不需要 AppSecret"
      : "cloudfunctions/login 里没看到 getWXContext()，这样拿不到调用者 openid"
  );

  const cloudRoot = String((readJson(PROJECT_CONFIG_PATH) || {}).cloudfunctionRoot || "");
  report(
    cloudRoot.replace(/\/+$/, "") === CLOUD_FUNCTION_ROOT ? "ok" : "fail",
    "工程已声明 cloudfunctionRoot",
    cloudRoot
      ? `project.config.json 的 cloudfunctionRoot = ${cloudRoot}`
      : "project.config.json 里没有 cloudfunctionRoot：开发者工具不会把 cloudfunctions/ 认成云函数目录"
  );
}

function checkCloudDatabase() {
  const userDb = readText(USER_DB_PATH);
  const collectionOk = new RegExp(`const\\s+USER_COLLECTION\\s*=\\s*"${USER_COLLECTION}"`).test(userDb);
  report(
    collectionOk ? "ok" : "fail",
    "云数据库集合名一致",
    collectionOk
      ? `services/user-db.ts 读写集合 ${USER_COLLECTION}`
      : `services/user-db.ts 里的集合名不是 ${USER_COLLECTION}，与云开发控制台、README 会对不上`
  );

  const cloudInit = /wx\.cloud\.init\(/.test(readText(APP_TS_PATH));
  report(
    cloudInit ? "ok" : "fail",
    "启动时初始化云环境",
    cloudInit ? "app.ts 已调用 wx.cloud.init" : "app.ts 里没有 wx.cloud.init，读写云数据库会直接失败"
  );

  const readmeOk = readText(README_PATH).includes(USER_COLLECTION);
  report(
    readmeOk ? "ok" : "fail",
    "README 与代码集合名一致",
    readmeOk ? `README 里也写着 ${USER_COLLECTION}` : `README 里没提到 ${USER_COLLECTION}，文档与代码已经漂移`
  );
}

// 作业上传是这轮补上的缺口：集合名要同时在代码、README 与自检脚本里对得上，
// 否则学员传上去的记录会散在没人认得的集合里。
function checkHomeworkUpload() {
  const homework = readText(HOMEWORK_PATH);
  const collectionOk = new RegExp(`const\\s+HOMEWORK_COLLECTION\\s*=\\s*"${HOMEWORK_COLLECTION}"`).test(homework);
  const readmeOk = readText(README_PATH).includes(HOMEWORK_COLLECTION);

  report(
    collectionOk && readmeOk ? "ok" : "fail",
    "作业上传集合名一致",
    collectionOk && readmeOk
      ? `services/homework.ts 与 README 都写着 ${HOMEWORK_COLLECTION}`
      : "作业上传的集合名在 services/homework.ts 与 README 之间对不上，云开发控制台会不知道该建哪个集合"
  );
}

function checkProject() {
  const project = readJson(PROJECT_CONFIG_PATH) || {};
  const appid = String(project.appid || "");
  report(
    appid ? "ok" : "fail",
    "appid 已填",
    appid ? `project.config.json 的 appid = ${appid}（需确认属于你自己的小程序）` : "project.config.json 里没有 appid，上传会失败"
  );

  const ignore = (project.packOptions && project.packOptions.ignore) || [];
  const keys = new Set(ignore.map(item => `${item.type}:${item.value}`));
  const missing = REQUIRED_IGNORES.filter(([type, value]) => !keys.has(`${type}:${value}`));
  report(
    missing.length ? "fail" : "ok",
    "上传包排除项齐全",
    missing.length
      ? `project.config.json 的 packOptions.ignore 缺少：${missing.map(([, value]) => value).join("、")}，不排除会把网页版、脚本、文档打进包`
      : "web、scripts、docs、prompts、templates、outputs 与 .md / .cjs / .py 均已排除"
  );

  const appJson = readJson(APP_JSON_PATH) || {};
  const pages = Array.isArray(appJson.pages) ? appJson.pages : [];
  const missingFiles = [];
  pages.forEach(page => {
    ["wxml", "ts"].forEach(extension => {
      if (!fs.existsSync(path.join(APP_DIR, `${page}.${extension}`))) missingFiles.push(`${page}.${extension}`);
    });
  });
  report(
    pages.length && !missingFiles.length ? "ok" : "fail",
    "页面文件齐全",
    missingFiles.length ? `缺少：${missingFiles.join("、")}` : `app.json 声明的 ${pages.length} 个页面都有 wxml 与 ts`
  );
}

function runAllChecks() {
  // 同一个报告器会被反复使用（测试里调用多次），所以清空而不是重建。
  reporter.results.length = 0;
  checkProductionConfig();
  checkAuthorizationSource();
  checkCloudFunction();
  checkCloudDatabase();
  checkHomeworkUpload();
  checkProject();
  return reporter.results;
}

function printReport() {
  reporter.print();
}

function main() {
  console.log("小程序发布前自检（对应 docs/development.md 的「部署清单 · 小程序」）\n");
  runAllChecks();
  printReport();
}

if (require.main === module) main();

module.exports = { MANUAL_ITEMS, parseRuntimeConfigBlock, printReport, runAllChecks };
