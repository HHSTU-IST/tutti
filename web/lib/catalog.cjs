const fs = require("fs");
const path = require("path");

const REPO_DATA_DIR = path.join(__dirname, "../../data");

function isTopicBank(value) {
  return Boolean(value && typeof value === "object" && ("single" in value || "judge" in value));
}

function countTopic(topic) {
  return {
    single: (topic.single || []).length,
    judge: (topic.judge || []).length,
    fill: (topic.fill || []).length
  };
}

function summarize(topics) {
  return {
    topicCount: topics.length,
    questionTotal: topics.reduce((total, topic) => total + topic.single + topic.judge + topic.fill, 0)
  };
}

// 直接从仓库的 data/topic-*.ts 构建课程清单（构建脚本与开发态回退共用这一份逻辑）。
// 课程标题、专题顺序与专题名都取自题库 `_config`——与小程序端 services/registry.ts 同源，
// 不再正则解析 registry.ts（那份元数据已下沉到题库）。
function buildCatalogFromRepo() {
  const { loadTopicBank } = require("../../scripts/load-topic-bank.cjs");

  return fs
    .readdirSync(REPO_DATA_DIR)
    .filter(file => /^topic-.*\.ts$/.test(file))
    .map(file => file.replace(/^topic-/, "").replace(/\.ts$/, ""))
    .sort()
    .map(id => {
      const bank = loadTopicBank(id);
      const config = bank._config || {};
      const nameMap = config.topicNameMap || {};
      const declaredKeys = Array.isArray(config.topicOrder) && config.topicOrder.length
        ? config.topicOrder
        : Object.keys(bank).filter(key => key !== "_config");

      const topics = [];
      const bankSlice = {};

      declaredKeys
        .filter(key => isTopicBank(bank[key]))
        .forEach(key => {
          const counts = countTopic(bank[key]);
          if (counts.single + counts.judge + counts.fill === 0) return;
          topics.push(Object.assign({ key, name: nameMap[key] || key }, counts));
          bankSlice[key] = {
            single: bank[key].single || [],
            judge: bank[key].judge || [],
            fill: bank[key].fill || []
          };
        });

      return {
        id,
        title: config.title || id.toUpperCase(),
        topics,
        bank: bankSlice
      };
    });
}

module.exports = {
  REPO_DATA_DIR,
  buildCatalogFromRepo,
  isTopicBank,
  summarize
};
