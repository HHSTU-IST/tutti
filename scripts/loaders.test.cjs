const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const scriptPath = path.join(__dirname, "generate-exam-ml.cjs");
const courseConfigPath = path.join(__dirname, "exam-courses.cjs");
const quizLoaderPath = path.join(__dirname, "load-quiz-engine.cjs");
const topicLoaderPath = path.join(__dirname, "load-topic-bank.cjs");
const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");

test("组卷链路通过显式 loader 加载运行时 TypeScript 模块", () => {
  // 装配在 exam-courses.cjs，入口脚本只负责「交给工厂 + 跑 CLI」。
  const configSource = fs.readFileSync(courseConfigPath, "utf8");
  assert.match(configSource, /loadQuizEngine\s*\(/);
  assert.match(configSource, /loadTopicBank\s*\(/);

  const entrySource = fs.readFileSync(scriptPath, "utf8");
  assert.match(entrySource, /createCourseGenerator\("ml"\)/);
  assert.doesNotMatch(entrySource, /require\("\.\.\/services\/quiz-engine\.ts"\)/);
  assert.doesNotMatch(entrySource, /function loadTopicBank\s*\(/);
  assert.doesNotMatch(entrySource, /readFileSync\(bankPath,\s*"utf8"\)/);
});

test("TS loaders share one runtime helper", () => {
  const quizLoaderSource = fs.readFileSync(quizLoaderPath, "utf8");
  const topicLoaderSource = fs.readFileSync(topicLoaderPath, "utf8");

  assert.match(quizLoaderSource, /require\("\.\/load-ts-module\.cjs"\)/);
  assert.match(topicLoaderSource, /require\("\.\/load-ts-module\.cjs"\)/);
  assert.doesNotMatch(quizLoaderSource, /withSuppressedStripTypeScriptWarning/);
  assert.doesNotMatch(topicLoaderSource, /withSuppressedStripTypeScriptWarning/);
  assert.doesNotMatch(quizLoaderSource, /stripTypeScriptTypes/);
  assert.doesNotMatch(topicLoaderSource, /stripTypeScriptTypes/);
});

test("loadQuizEngine caches and returns callable exports", () => {
  const first = loadQuizEngine();
  const second = loadQuizEngine();

  assert.equal(first, second);
  assert.equal(typeof first.getQuestions, "function");
  assert.equal(typeof first.normalizeQuestion, "function");
});

test("loadTopicBank loads the ML bank and reuses cached data", () => {
  const first = loadTopicBank("ml");
  const second = loadTopicBank("ml");

  assert.equal(first, second);
  assert.equal(first._config.topicNameMap.base, "基础概念");
  assert.equal(Array.isArray(first.base.single), true);
});
