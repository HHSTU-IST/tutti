const fs = require("fs");
const path = require("path");

// 题库是纯数据：`data/topic-<id>.js` 里只有 `module.exports = { …JSON 文本… }`，普通 require 就能读。
// 所以这条链路不需要类型剥离，也不需要构建步骤——改完题库重启服务即生效。
// （小程序端 services/registry.ts require 的也是同一个文件，两端共用一份真源。）
function loadTopicBank(courseCode = "ml") {
  const bankPath = path.join(__dirname, `../data/topic-${courseCode}.js`);

  if (!fs.existsSync(bankPath)) {
    throw new Error(`未找到课程「${courseCode}」的题库：${bankPath}。题库文件名必须是 data/topic-<课程id>.js，且只写纯数据（见 docs/development.md 的「新增课程」）。`);
  }

  return require(bankPath);
}

module.exports = {
  loadTopicBank
};
