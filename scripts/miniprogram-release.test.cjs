const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const Module = require("module");
const path = require("path");

const { parseRuntimeConfigBlock, runAllChecks } = require("./miniprogram-release-check.cjs");

const RUNTIME_CONFIG_PATH = path.join(__dirname, "../services/runtime-config.ts");

// 小程序端没有可以在这里跑的编译步骤，用 Node 自带的 TS 解析兜住语法/类型标注写错。
const MINIPROGRAM_SOURCES = [
  "app.ts",
  "pages/homework/homework.ts",
  "pages/index/index.ts",
  "pages/quiz/quiz.ts",
  "services/device.ts",
  "services/homework.ts",
  "services/purchase.ts",
  "services/registry.ts",
  "services/runtime-config.ts",
  "services/upload-rules.ts",
  "services/user-db.ts",
  "types/homework.ts",
  "types/quiz-bank.ts"
];

function levelsByTitle() {
  return Object.fromEntries(runAllChecks().map(item => [item.title, item.level]));
}

test("生产配置：关掉本地测试授权、打开云数据库", () => {
  const levels = levelsByTitle();
  assert.equal(levels["生产不启用本地测试授权"], "ok", "生产必须 enableLocalWechatTestLogin=false，否则等于绕过付费");
  assert.equal(levels["生产启用云数据库"], "ok", "生产必须 enableCloudDatabase=true，否则答题记录不同步");
});

test("生产登录走云函数：函数名与云函数目录都在", () => {
  const levels = levelsByTitle();
  assert.equal(levels["登录云函数名已填"], "ok", "loginFunctionName 不能为空");
  assert.equal(levels["登录云函数已入库"], "ok", "cloudfunctions/login 要有 index.js 与 package.json");
  assert.equal(levels["云函数用 getWXContext 取 openid"], "ok");
  assert.equal(levels["工程已声明 cloudfunctionRoot"], "ok");
});

test("云数据库与授权来源自检项通过", () => {
  const levels = levelsByTitle();
  assert.equal(levels["云数据库集合名一致"], "ok");
  assert.equal(levels["作业上传集合名一致"], "ok");
  assert.equal(levels["启动时初始化云环境"], "ok");
  assert.equal(levels["生产授权走登录云函数"], "ok");
  assert.equal(levels["页面文件齐全"], "ok");
  assert.equal(levels["上传包排除项齐全"], "ok");
});

test("parseRuntimeConfigBlock 能读到生产配置的字段", () => {
  const config = parseRuntimeConfigBlock(fs.readFileSync(RUNTIME_CONFIG_PATH, "utf8"), "PRODUCTION_RUNTIME_CONFIG");

  assert.ok(config, "应能解析出 PRODUCTION_RUNTIME_CONFIG");
  assert.equal(typeof config.loginFunctionName, "string");
  assert.equal(config.enableLocalWechatTestLogin, false);
  assert.equal(config.enableCloudDatabase, true);
  assert.equal(config.enableHomeworkUpload, true, "生产要开着作业上传，否则线上没有作业入口");
  assert.equal(typeof config.cloudEnv, "string");
});

test("小程序 TypeScript 文件语法可解析", () => {
  const broken = [];

  MINIPROGRAM_SOURCES.forEach(file => {
    try {
      Module.stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), { mode: "transform" });
    } catch (error) {
      broken.push(`${file}: ${error.message}`);
    }
  });

  assert.deepEqual(broken, [], "这些文件解析失败，开发者工具里也会编译不过");
});

test("wxml 绑定的事件在对应页面里都有实现方法", () => {
  const missing = [];

  ["homework/homework", "index/index", "quiz/quiz"].forEach(page => {
    const wxml = fs.readFileSync(path.join(__dirname, `../pages/${page}.wxml`), "utf8");
    const source = fs.readFileSync(path.join(__dirname, `../pages/${page}.ts`), "utf8");
    const handlers = Array.from(
      wxml.matchAll(/bind(?:tap|input|change|confirm|blur|focus)="([\w$]+)"/g),
      match => match[1]
    );

    handlers.forEach(handler => {
      if (!new RegExp(`\\b${handler}\\s*\\(`).test(source)) missing.push(`${page}.wxml → ${handler}`);
    });
  });

  assert.deepEqual(missing, [], "wxml 绑定的事件在 .ts 里找不到同名方法（改名后忘了同步）");
});

test("wxss 括号配平，且没有以逗号结尾的悬挂选择器", () => {
  const root = path.join(__dirname, "..");
  const files = [];

  const appWxss = path.join(root, "app.wxss");
  if (fs.existsSync(appWxss)) files.push(appWxss);

  const pagesDir = path.join(root, "pages");
  fs.readdirSync(pagesDir, { recursive: true })
    .filter(entry => String(entry).endsWith(".wxss"))
    .forEach(entry => files.push(path.join(pagesDir, String(entry))));

  assert.ok(files.length > 0, "没有找到任何 wxss 文件");

  const broken = [];
  files.forEach(file => {
    const source = fs.readFileSync(file, "utf8");
    const open = (source.match(/\{/g) || []).length;
    const close = (source.match(/\}/g) || []).length;
    const name = path.relative(root, file);

    if (open !== close) broken.push(`${name}: 花括号不配平（{ ${open} 个 / } ${close} 个）`);
    // 删规则时把分组选择器删剩一半（`.a,` 直接跟 `}`）就是编译期的 selector expected。
    if (/,\s*\}/.test(source)) broken.push(`${name}: 有选择器列表只剩下逗号（selector expected）`);
  });

  assert.deepEqual(broken, []);
});

test("自检脚本不会因为提示项而失败", () => {
  const failed = runAllChecks().filter(item => item.level === "fail").map(item => item.title);
  // cloudEnv 留空属于提示项，不该出现在失败清单里。
  assert.equal(failed.includes("云环境 ID（cloudEnv）未填"), false);
});
