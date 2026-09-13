// 项目统一的 Node 版本要求。放在 web/lib 下：服务端用它，scripts/ 下的脚本反过来 require 这里，
// 保证「常量、web/package.json 的 engines、README」只有一处真源（小程序端不打包 web/，不受影响）。
//
// 为什么是 22.6：服务端与脚本要用 Module.stripTypeScriptTypes 直接读 TypeScript 题库
// （data/topic-*.ts、services/quiz-engine.ts），这个能力是 Node 22.6 才有的。
const MIN_NODE_VERSION = "22.6.0";

function parseVersion(version) {
  return String(version || "")
    .replace(/^v/i, "")
    .split(".")
    .map(part => Number.parseInt(part, 10) || 0);
}

/** 逐段比较：a 比 b 新返回 1，相同返回 0，更旧返回 -1。 */
function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

function checkNodeVersion(version = process.versions.node) {
  const current = `v${String(version).replace(/^v/i, "")}`;
  const required = `>=${MIN_NODE_VERSION}`;
  const ok = compareVersions(version, MIN_NODE_VERSION) >= 0;

  return {
    ok,
    current,
    required,
    message: ok
      ? `Node ${current} 满足项目要求（${required}）`
      : `当前 Node ${current} 低于项目要求（${required}）：scripts/ 下的构建与自检脚本依赖 Node 22.6 起的 TypeScript 类型剥离能力，请升级 Node。`
  };
}

module.exports = {
  MIN_NODE_VERSION,
  checkNodeVersion
};
