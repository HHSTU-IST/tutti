// 各课程的组卷参数。专题顺序与专题名不在这里写——它们以题库 `_config` 为准
// （见 data/topic-*.ts），组卷工厂自己会读。
// 入口脚本（generate-exam-<课程码>.cjs）只负责把配置交给工厂，并在被直接执行时跑一次 CLI。
const { createExamGenerator } = require("./generate-exam.cjs");
const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");

const COURSES = {
  ml: {
    fillPerTopic: 2,
    defaultFileName: "ml-2026-1-A.md"
  },
  cv: {
    fillPerTopic: 1,
    defaultFileName: "cv-2025-2-A.md"
  }
};

function createCourseGenerator(courseCode) {
  const course = COURSES[courseCode];
  if (!course) {
    throw new Error(`未登记的组卷课程：${courseCode}（可选：${Object.keys(COURSES).join("、")}）`);
  }

  return createExamGenerator({
    engine: loadQuizEngine(),
    bank: loadTopicBank(courseCode),
    courseCode,
    ...course
  });
}

module.exports = { COURSES, createCourseGenerator };
