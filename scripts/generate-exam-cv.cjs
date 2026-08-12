const { createExamGenerator } = require("./generate-exam.cjs");
const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");

module.exports = createExamGenerator({
  engine: loadQuizEngine(),
  bank: loadTopicBank("cv"),
  courseCode: "cv",
  topicOrder: ["base", "image", "color", "filter", "edge", "feature", "geometry", "deep", "eval"],
  topicNames: {
    base: "基础概念",
    image: "图像表示",
    color: "颜色空间",
    filter: "滤波卷积",
    edge: "边缘与形态学",
    feature: "特征与匹配",
    geometry: "几何变换",
    deep: "深度视觉",
    eval: "评价指标"
  },
  fillPerTopic: 1,
  defaultFileName: "cv-2025-2-A.md"
});

if (require.main === module) {
  module.exports.runCli();
}
