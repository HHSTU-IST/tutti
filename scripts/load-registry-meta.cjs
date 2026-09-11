const fs = require("fs");
const path = require("path");

// services/registry.ts 是 ESM + TypeScript，无法直接被 Node 以 CommonJS 求值
// （它用 export const 声明，同时又用 require 加载题库，两种模块语法混用）。
// 这里只提取网页端需要的静态元数据：课程 id / title / fallbackTopics。
const registryPath = path.join(__dirname, "../services/registry.ts");
const AGENT_BLOCK_RE = /\n {2}(\w+): \{([\s\S]*?)\n {2}\}/g;
const TOPIC_PAIR_RE = /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g;

function pickString(body, field) {
  const match = new RegExp(`(?:^|\\n)\\s*${field}:\\s*"([^"]*)"`).exec(body);
  return match ? match[1] : "";
}

function loadAgentRegistryMeta() {
  const source = fs.readFileSync(registryPath, "utf8");
  const registry = {};

  let block;
  AGENT_BLOCK_RE.lastIndex = 0;
  while ((block = AGENT_BLOCK_RE.exec(source)) !== null) {
    const [, id, body] = block;
    const topics = [];
    const topicsStart = body.indexOf("fallbackTopics");

    if (topicsStart >= 0) {
      let pair;
      TOPIC_PAIR_RE.lastIndex = 0;
      while ((pair = TOPIC_PAIR_RE.exec(body.slice(topicsStart))) !== null) {
        topics.push([pair[1], pair[2]]);
      }
    }

    registry[id] = {
      id,
      title: pickString(body, "title") || id,
      topics
    };
  }

  return registry;
}

module.exports = {
  loadAgentRegistryMeta,
  registryPath
};
