#!/usr/bin/env node
// 网页版发布前的一条命令：重建产物 → 检查上传包 → 部署自检 → 打印发布参数与复核步骤。
// 真正的发布动作在平台侧（IDE 的「发布为应用」），这里只保证「发出去的东西是对的」。
//
//   node scripts/deploy-web.cjs            检查并给出建议
//   node scripts/deploy-web.cjs --clean    顺便清掉 web/data 下的本地运行数据再发布
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(APP_DIR, "web", "data");

// 这些是运行期才产生的数据，不该跟着发布包上传：
// 传上去会把本地的会话/作业带给线上，runtime-state.json 还会让线上启动计数失真
// （而「重启后 boots 是否继续累加」正是判断目录持不持久的方法）。
const RUNTIME_ENTRIES = [
  ["sessions", "本地会话文件（重启不掉线用的）"],
  ["uploads", "本地测试上传的作业"],
  ["upload-rules.json", "本地上传规则"],
  ["runtime-state.json", "本地启动计数"]
];

const PUBLISH_PARAMS = [
  ["发布目录", "web/　（只上传这个目录，所以必须先构建）"],
  ["语言", "node"],
  ["启动命令", "node server.js"],
  ["安装命令", "留空　（跳过 npm install：沙箱里装依赖会阻塞启动，60s 不监听端口就发布失败）"],
  ["监听", "0.0.0.0:$PORT　（已默认绑定 0.0.0.0）"],
  ["应用 ID", "wbapp_JmJiIU1D0Z4SG2AsCFwsaD"],
  ["线上地址", "https://tutti-quiz-web2.app.workbuddy.host/"]
];

function runNodeScript(relative, label, env) {
  console.log(`\n──── ${label} ────`);
  const result = spawnSync(process.execPath, [path.join(APP_DIR, relative)], {
    stdio: "inherit",
    env: Object.assign({}, process.env, env)
  });

  return result.status === 0;
}

function findRuntimeEntries() {
  return RUNTIME_ENTRIES
    .map(([name, reason]) => ({ name, reason, absolute: path.join(DATA_DIR, name) }))
    .filter(entry => fs.existsSync(entry.absolute));
}

function handleRuntimeEntries(clean) {
  const entries = findRuntimeEntries();
  if (!entries.length) return true;

  console.log("\n──── 上传包检查 ────");
  entries.forEach(entry => console.log(`  web/data/${entry.name}　${entry.reason}`));

  if (!clean) {
    console.log("\n[警告] 上面这些本地运行数据会随 web/ 一起上传到线上。");
    console.log("  想让线上 boots 计数可信、也不把本地会话带上去，跑：node scripts/deploy-web.cjs --clean");
    return true;
  }

  entries.forEach(entry => {
    fs.rmSync(entry.absolute, { recursive: true, force: true });
    console.log(`  已移除 web/data/${entry.name}`);
  });
  return true;
}

function main() {
  const clean = process.argv.includes("--clean");
  console.log(`网页版发布前流程（构建 → 上传包检查 → 部署自检 → 发布参数）${clean ? "［--clean］" : ""}`);

  if (!runNodeScript("scripts/build-web-bundle.cjs", "1/3 重建 web/data 产物")) {
    console.error("\n构建失败，已中止：不要带着旧的 web/data 去发布。");
    process.exitCode = 1;
    return;
  }

  if (!handleRuntimeEntries(clean)) {
    process.exitCode = 1;
    return;
  }

  // 平台会不会重建 web/data 只能发布后实测，这里把它降级成提示，别挡住发布；
  // 其它自检项（默认密码、账号表同步…）仍然会卡住。
  const passed = runNodeScript("scripts/web-deploy-check.cjs", "2/3 部署自检", {
    TUTTI_ALLOW_UNPERSISTED_DATA: "1"
  });

  console.log("\n──── 3/3 发布参数（平台侧「发布为应用」）────");
  PUBLISH_PARAMS.forEach(([key, value]) => console.log(`  ${key.padEnd(8)} ${value}`));

  console.log("\n──── 发布后怎么确认运行数据被保住了 ────");
  console.log("  1. 打开线上地址让服务启动一次，然后 curl -s https://<线上域名>/api/health；");
  console.log("     记下 dataDirBoots 与 dataDirFirstBootAt（本次发布后应为 boots=1）；");
  console.log("  2. 改一次上传规则（或上传一个作业），再用 --clean 重新发布一次；");
  console.log("  3. 再看 /api/health：boots 继续累加且 firstBootAt 不变 => 数据目录被保住了；");
  console.log("     boots 回到 1 或 firstBootAt 变化 => 平台重建了目录，规则与作业会丢，");
  console.log("     这时把 TUTTI_DATA_DIR 指向平台提供的持久化目录（见 README 环境变量表）。");

  if (!passed) {
    console.log("\n自检有未通过项（上面标 [!!] 的），发布前先处理。");
    process.exitCode = 1;
  }
}

main();
