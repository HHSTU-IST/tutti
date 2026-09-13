// 两个自检脚本（web-deploy-check / miniprogram-release-check）共用的报告器：
// 统一 [OK] / [!!] / [提示] 标签、结论行与「有 fail 就把退出码置 1」的行为。
const LABELS = { ok: "[OK]", fail: "[!!]", hint: "[提示]" };

function createReporter({ manual = [] } = {}) {
  const results = [];

  function report(level, title, detail) {
    results.push({ level, title, detail });
  }

  function print() {
    results.forEach(item => {
      console.log(`${LABELS[item.level] || item.level} ${item.title}`);
      String(item.detail || "")
        .split("\n")
        .forEach(line => console.log(`     ${line}`));
    });

    if (manual.length) {
      console.log("\n人工确认项（脚本判不了，提审前逐条过一遍）：");
      manual.forEach(item => console.log(`  [手工] ${item}`));
    }

    const failed = results.filter(item => item.level === "fail");
    console.log(`\n结论：${results.length - failed.length} / ${results.length} 项自动检查通过。`);
    if (failed.length) {
      console.log("待处理：");
      failed.forEach(item => console.log(`  - ${item.title}`));
      process.exitCode = 1;
    }

    return failed;
  }

  return {
    results,
    report,
    ok: (title, detail) => report("ok", title, detail),
    fail: (title, detail) => report("fail", title, detail),
    hint: (title, detail) => report("hint", title, detail),
    print
  };
}

module.exports = { LABELS, createReporter };
