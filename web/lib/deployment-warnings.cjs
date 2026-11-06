// 「这套部署该注意什么」的结构化清单。日志（server.logDeploymentDiagnostics）与
// 自检（scripts/web-deploy-check.cjs）都从这里取，避免同一条警告两处各写一份、
// 改一处忘另一处——审计里 N12 就是这条：server.js 的 quiz-single-instance
// 文案比 web-deploy-check 少半句「组卷答案/答题可能中途报…」，长期会漂。
//
// 不做 auth/sessionStoreInfo 的默认拉取，保持叶子模块零依赖：调用方自己传，
// 单元测试也能干净地按 store 分支断言，不污染真实环境变量。

function deploymentWarnings(storeInfo) {
  const warnings = [];

  // 进行中的练习（含每题正确答案、判题进度）只在单个进程内存里，从不落盘、也不跨实例共享——
  // 这是刻意取舍：它生命周期短（重启重开即可），落盘反而把答案写进磁盘扩大泄露面。
  // 代价就是：多实例轮询会让「在 A 组卷、判题打到 B」直接报「没有进行中的练习」。
  warnings.push({
    code: "quiz-single-instance",
    message: "组卷答案与判题进度只在单进程内存里、不落盘也不跨实例共享：多实例做负载均衡时须开启会话粘滞（同一浏览器固定打到同一实例），否则答题可能中途报「当前没有进行中的练习」。本网页版按单实例设计。"
  });

  if (storeInfo && storeInfo.store === "memory") {
    warnings.push({
      code: "memory-session",
      message: "会话只存进程内存：重启即全员掉线，多实例之间也不共享登录态。生产请设 TUTTI_SESSION_STORE=file 并让各实例共用同一 TUTTI_DATA_DIR。"
    });
  }

  return warnings;
}

module.exports = { deploymentWarnings };
