#!/usr/bin/env node
// 小程序发布前自检：把 README「小程序发布前自检」里能自动判定的项一次跑完。
// 退出码非 0 表示还有未通过项；[手工] 项脚本判不了，需要在真机 / 云开发控制台确认。
const fs = require("fs");
const path = require("path");

const APP_DIR = path.join(__dirname, "..");
const RUNTIME_CONFIG_PATH = path.join(APP_DIR, "services", "runtime-config.ts");
const USER_DB_PATH = path.join(APP_DIR, "services", "user-db.ts");
const PURCHASE_PATH = path.join(APP_DIR, "services", "purchase.ts");
const ACCESS_PATH = path.join(APP_DIR, "data", "access.ts");
const APP_TS_PATH = path.join(APP_DIR, "app.ts");
const APP_JSON_PATH = path.join(APP_DIR, "app.json");
const PROJECT_CONFIG_PATH = path.join(APP_DIR, "project.config.json");
const README_PATH = path.join(APP_DIR, "README.md");

const USER_COLLECTION = "user_profiles";

// 上传包里不该出现的目录与后缀（发布沙箱按这个清单裁剪）。
const REQUIRED_IGNORES = [
  ["folder", "web"],
  ["folder", "scripts"],
  ["folder", "docs"],
  ["folder", "prompts"],
  ["folder", "templates"],
  ["folder", "outputs"],
  ["suffix", ".md"],
  ["suffix", ".cjs"],
  ["suffix", ".py"]
];

const MANUAL_ITEMS = [
  "trial 体验版真机跑通：上传 → 公众平台设为体验版 → 真机把登录、进入题库、答题、错题本各点一遍再提审",
  "云开发控制台已建集合 user_profiles，权限设为「仅创建者可读写」",
  "后台接口已能用 code 换 openid，并按用户购买情况返回 agents"
];

const LABELS = { ok: "[OK]", fail: "[!!]", hint: "[提示]" };

let results = [];

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

function report(level, title, detail) {
  results.push({ level, title, detail });
}

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

  const url = String(config.wechatLoginApiUrl || "");
  report(
    url ? "ok" : "fail",
    "生产登录接口已填",
    url
      ? `wechatLoginApiUrl = ${url}`
      : "PRODUCTION_RUNTIME_CONFIG.wechatLoginApiUrl 还是空的：线上会停在「生产配置缺失」，首页所有课程置灰"
  );

  if (url) {
    const isHttps = /^https:\/\//i.test(url);
    report(isHttps ? "ok" : "fail", "生产登录接口为 HTTPS", isHttps ? "满足小程序 request 合法域名要求" : `${url} 不是 HTTPS，小程序 request 域名必须是 HTTPS`);
  }

  report(
    config.enableLocalWechatTestLogin === false ? "ok" : "fail",
    "生产不启用本地测试授权",
    config.enableLocalWechatTestLogin === false
      ? "enableLocalWechatTestLogin = false，开通只看后台返回的 agents"
      : "enableLocalWechatTestLogin 不是 false：线上会走本地测试授权，等于绕过付费，必须改回 false"
  );

  report(
    config.enableCloudDatabase === true ? "ok" : "fail",
    "生产启用云数据库",
    config.enableCloudDatabase === true
      ? "enableCloudDatabase = true"
      : "enableCloudDatabase 不是 true：答题统计与错题本不会同步到 user_profiles"
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
  const hasBackendBranch = /requestLoginSession\s*\(/.test(purchase);
  const localBranchGuarded = /RUNTIME_CONFIG\.enableLocalWechatTestLogin/.test(purchase);

  report(
    hasBackendBranch && localBranchGuarded ? "ok" : "fail",
    "生产授权走后台接口",
    hasBackendBranch && localBranchGuarded
      ? "services/purchase.ts 的生产分支请求 wechatLoginApiUrl，本地测试分支被 enableLocalWechatTestLogin 开关包住"
      : "purchase.ts 里没看到 requestLoginSession，或被开关约束的本地测试分支，生产开通来源无法确认"
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
  results = [];
  checkProductionConfig();
  checkAuthorizationSource();
  checkCloudDatabase();
  checkProject();
  return results;
}

function printReport() {
  results.forEach(item => {
    console.log(`${LABELS[item.level] || item.level} ${item.title}`);
    String(item.detail || "")
      .split("\n")
      .forEach(line => console.log(`     ${line}`));
  });

  console.log("\n人工确认项（脚本判不了，提审前逐条过一遍）：");
  MANUAL_ITEMS.forEach(item => console.log(`  [手工] ${item}`));

  const failed = results.filter(item => item.level === "fail");
  console.log(`\n结论：${results.length - failed.length} / ${results.length} 项自动检查通过。`);
  if (failed.length) {
    console.log("待处理：");
    failed.forEach(item => console.log(`  - ${item.title}`));
    process.exitCode = 1;
  }
}

function main() {
  console.log("小程序发布前自检（对应 README「小程序发布前自检」）\n");
  runAllChecks();
  printReport();
}

if (require.main === module) main();

module.exports = { MANUAL_ITEMS, parseRuntimeConfigBlock, printReport, runAllChecks };
