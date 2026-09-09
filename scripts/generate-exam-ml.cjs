const { createExamGenerator } = require("./generate-exam.cjs");
const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");

module.exports = createExamGenerator({
  engine: loadQuizEngine(),
  bank: loadTopicBank("ml"),
  courseCode: "ml",
  topicOrder: ["base", "reg", "classify", "cluster", "overfit", "tree", "rl", "calc"],
  topicNames: {
    base: "基础概念",
    reg: "回归算法",
    classify: "分类算法",
    cluster: "聚类降维",
    overfit: "过拟合与优化",
    tree: "决策树与集成",
    rl: "强化学习",
    calc: "计算题"
  },
  fillPerTopic: 2,
  defaultFileName: "ml-2026-1-A.md"
});

if (require.main === module) {
  module.exports.runCli();
}
