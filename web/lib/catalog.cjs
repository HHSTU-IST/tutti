const fs = require("fs");
const path = require("path");

const REPO_DATA_DIR = path.join(__dirname, "../../data");

const FALLBACK_TITLES = {
  py: "Python 编程",
  ml: "机器学习概论",
  al: "数据结构与算法",
  cv: "图像处理"
};

function isTopicBank(value) {
  return Boolean(value && typeof value === "object" && ("single" in value || "judge" in value || "fill" in value));
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

// 直接从仓库的 data/topic-*.ts 构建课程清单（构建脚本与开发态回退共用同一份逻辑）。
function buildCatalogFromRepo() {
  const { loadTopicBank } = require("../../scripts/load-topic-bank.cjs");
  const { loadAgentRegistryMeta } = require("../../scripts/load-registry-meta.cjs");
  const registry = loadAgentRegistryMeta();

  return fs
    .readdirSync(REPO_DATA_DIR)
    .filter(file => /^topic-.*\.ts$/.test(file))
    .map(file => file.replace(/^topic-/, "").replace(/\.ts$/, ""))
    .sort()
    .map(id => {
      const bank = loadTopicBank(id);
      const nameMap = (bank._config && bank._config.topicNameMap) || {};
      const registryTopics = new Map((registry[id] && registry[id].topics) || []);

      // 与小程序 buildAgentTopics 口径一致：只取 registry 登记的专题，
      // 避免把 calcQuestions / combined 这类非练习容器也当成专题。
      const declaredKeys = registry[id] && registry[id].topics.length
        ? registry[id].topics.map(([key]) => key)
        : Object.keys(bank).filter(key => key !== "_config");

      const topics = [];
      const bankSlice = {};

      declaredKeys
        .filter(key => isTopicBank(bank[key]))
        .forEach(key => {
          const counts = countTopic(bank[key]);
          if (counts.single + counts.judge + counts.fill === 0) return;
          topics.push(Object.assign({ key, name: nameMap[key] || registryTopics.get(key) || key }, counts));
          bankSlice[key] = {
            single: bank[key].single || [],
            judge: bank[key].judge || [],
            fill: bank[key].fill || []
          };
        });

      return {
        id,
        title: (registry[id] && registry[id].title) || FALLBACK_TITLES[id] || id.toUpperCase(),
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
