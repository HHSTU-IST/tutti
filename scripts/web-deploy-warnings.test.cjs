const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 不起服务，只取 server 导出的 deploymentWarnings：它把「单实例设计里最容易被多实例踩的坑」
// 整理成了结构化清单，日志和部署自检都从同一处取，所以值得被单独断言。
const { deploymentWarnings } = require("../web/server.js");

function codes(warnings) {
  return warnings.map(item => item.code);
}

test("deploymentWarnings 始终是 {code, message} 结构且信息非空", () => {
  const list = deploymentWarnings({ store: "file" });
  assert.ok(list.length >= 1);
  list.forEach(item => {
    assert.equal(typeof item.code, "string");
    assert.ok(item.code.length > 0, "每条提示都要有 code");
    assert.ok(typeof item.message === "string" && item.message.length > 0, "每条提示都要有可读的 message");
  });
});

test("落盘会话：仍显式提示进行中的练习不跨实例共享", () => {
  const codes_ = codes(deploymentWarnings({ store: "file" }));
  assert.ok(codes_.includes("quiz-single-instance"), "file 模式也要提醒答题只在单进程");
  assert.ok(!codes_.includes("memory-session"), "file 模式不该报内存会话告警");
});

test("内存会话：额外提示重启掉线与多实例不共享", () => {
  const codes_ = codes(deploymentWarnings({ store: "memory" }));
  assert.ok(codes_.includes("memory-session"));
  assert.ok(codes_.includes("quiz-single-instance"));
});

test("文档如实：README 与开发文档写明单实例/会话粘滞，并去掉过时的「重新登录」说法", () => {
  const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
  const dev = fs.readFileSync(path.join(__dirname, "..", "docs", "development.md"), "utf8");

  assert.ok(readme.includes("单实例"), "README 应写明网页版按单实例设计");
  assert.ok(readme.includes("会话粘滞"), "README 应给出多实例横向扩容的正确做法");
  assert.ok(readme.includes("TUTTI_TRUST_PROXY"), "README 环境变量表应收录限流的新开关");
  assert.ok(readme.includes("TUTTI_MAX_CONCURRENT_UPLOADS"), "README 应收录上传并发上限");

  assert.ok(dev.includes("不跨实例共享"), "开发文档应说明练习不跨实例共享的代价");
  // P1-2 后权限每请求重算，旧的「要重新登录一次才带上新课程权限」说法已失效，不应再出现在文档里。
  assert.ok(!dev.includes("要重新登录一次"), "开发文档不应再声称改课后必须重新登录");
});
