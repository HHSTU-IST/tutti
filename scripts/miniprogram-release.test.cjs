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
  "pages/index/index.ts",
  "pages/quiz/quiz.ts",
  "services/purchase.ts",
  "services/runtime-config.ts",
  "services/user-db.ts"
];

function levelsByTitle() {
  return Object.fromEntries(runAllChecks().map(item => [item.title, item.level]));
}

test("生产配置：关掉本地测试授权、打开云数据库", () => {
  const levels = levelsByTitle();
  assert.equal(levels["生产不启用本地测试授权"], "ok", "生产必须 enableLocalWechatTestLogin=false，否则等于绕过付费");
  assert.equal(levels["生产启用云数据库"], "ok", "生产必须 enableCloudDatabase=true，否则答题记录不同步");
});

test("生产登录接口：留空要报错，填了必须是 HTTPS", () => {
  const levels = levelsByTitle();
  assert.ok(["ok", "fail"].includes(levels["生产登录接口已填"]));

  // 接口为空时跳过 HTTPS 判定；填了就必须过。
  const https = levels["生产登录接口为 HTTPS"];
  assert.notEqual(https, "fail", "wechatLoginApiUrl 填了就必须是 HTTPS");
});

test("云数据库与授权来源自检项通过", () => {
  const levels = levelsByTitle();
  assert.equal(levels["云数据库集合名一致"], "ok");
  assert.equal(levels["启动时初始化云环境"], "ok");
  assert.equal(levels["生产授权走后台接口"], "ok");
  assert.equal(levels["页面文件齐全"], "ok");
  assert.equal(levels["上传包排除项齐全"], "ok");
});

test("parseRuntimeConfigBlock 能读到生产配置的字段", () => {
  const config = parseRuntimeConfigBlock(fs.readFileSync(RUNTIME_CONFIG_PATH, "utf8"), "PRODUCTION_RUNTIME_CONFIG");

  assert.ok(config, "应能解析出 PRODUCTION_RUNTIME_CONFIG");
  assert.equal(typeof config.wechatLoginApiUrl, "string");
  assert.equal(config.enableLocalWechatTestLogin, false);
  assert.equal(config.enableCloudDatabase, true);
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

test("自检脚本不会因为提示项而失败", () => {
  const failed = runAllChecks().filter(item => item.level === "fail").map(item => item.title);
  // cloudEnv 留空属于提示项，不该出现在失败清单里。
  assert.equal(failed.includes("云环境 ID（cloudEnv）未填"), false);
});
