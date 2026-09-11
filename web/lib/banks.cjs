const fs = require("fs");
const path = require("path");

const { loadTopicBank } = require("../../scripts/load-topic-bank.cjs");
const { loadQuizEngine } = require("../../scripts/load-quiz-engine.cjs");
const { loadAgentRegistryMeta } = require("../../scripts/load-registry-meta.cjs");

const DATA_DIR = path.join(__dirname, "../../data");
const TYPES = ["single", "judge", "fill"];
const ALL_TOPICS = "__all__";

// registry.ts 解析失败时的兜底标题，保证网页端仍能正常展示。
const FALLBACK_TITLES = {
  py: "Python 编程",
  ml: "机器学习概论",
  al: "数据结构与算法",
  cv: "图像处理"
};

const engine = loadQuizEngine();
const bankCache = new Map();

function listCourseIds() {
  return fs
    .readdirSync(DATA_DIR)
    .filter(file => /^topic-.*\.ts$/.test(file))
    .map(file => file.replace(/^topic-/, "").replace(/\.ts$/, ""))
    .sort();
}

function isTopicBank(value) {
  return Boolean(value && typeof value === "object" && ("single" in value || "judge" in value || "fill" in value));
}

function getBank(courseId) {
  if (!bankCache.has(courseId)) {
    bankCache.set(courseId, loadTopicBank(courseId));
  }
  return bankCache.get(courseId);
}

function buildCatalog() {
  const registry = loadAgentRegistryMeta();

  return listCourseIds().map(id => {
    const bank = getBank(id);
    const nameMap = (bank._config && bank._config.topicNameMap) || {};
    const registryTopics = new Map((registry[id] && registry[id].topics) || []);

    // 与小程序 buildAgentTopics 口径一致：只取 registry 登记的专题。
    // 直接用 bank 的键会把 calcQuestions / combined 这类非练习容器也列出来。
    const declaredKeys = (registry[id] && registry[id].topics.length)
      ? registry[id].topics.map(([key]) => key)
      : Object.keys(bank).filter(key => key !== "_config");

    const topics = declaredKeys
      .filter(key => isTopicBank(bank[key]))
      .map(key => ({
        key,
        name: nameMap[key] || registryTopics.get(key) || key,
        single: (bank[key].single || []).length,
        judge: (bank[key].judge || []).length,
        fill: (bank[key].fill || []).length
      }))
      .filter(topic => topic.single + topic.judge + topic.fill > 0);

    return {
      id,
      title: (registry[id] && registry[id].title) || FALLBACK_TITLES[id] || id.toUpperCase(),
      topicCount: topics.length,
      questionTotal: topics.reduce((total, topic) => total + topic.single + topic.judge + topic.fill, 0),
      topics
    };
  });
}

const catalog = buildCatalog();
const courseMap = new Map(catalog.map(course => [course.id, course]));

function getCourse(courseId) {
  return courseMap.get(courseId) || null;
}

function resolveTopicName(courseId, topicKey) {
  const course = getCourse(courseId);
  if (!course) return topicKey;
  const topic = course.topics.find(item => item.key === topicKey);
  return topic ? topic.name : topicKey;
}

function collectPool(courseId, topicKey, types) {
  const bank = getBank(courseId);
  const course = getCourse(courseId);
  const topicKeys = topicKey === ALL_TOPICS ? course.topics.map(topic => topic.key) : [topicKey];
  const pool = [];

  topicKeys.forEach(key => {
    types.forEach(type => {
      ((bank[key] && bank[key][type]) || []).forEach((question, index) => {
        pool.push({ question, qid: `${key}:${type}:${index}`, type, topicKey: key });
      });
    });
  });

  return pool;
}

// 生成一次练习：服务端保留正确答案与解析，只把题干/选项下发给浏览器。
function createQuiz(courseId, topicKey, count, types) {
  const course = getCourse(courseId);
  if (!course) return null;

  const useTypes = (types && types.length ? types : TYPES).filter(type => TYPES.includes(type));
  const pool = collectPool(courseId, topicKey, useTypes);
  if (!pool.length) return null;

  const picked = engine.pickRandomMany(pool, Math.max(1, Math.min(count, pool.length)));

  const items = picked.map(entry => {
    const normalized = engine.normalizeQuestion(
      entry.question,
      entry.type,
      resolveTopicName(courseId, entry.topicKey),
      entry.topicKey
    );

    return {
      qid: entry.qid,
      type: entry.type,
      typeName: normalized.typeName,
      topicName: normalized.topicName,
      difficulty: normalized.difficulty || "",
      question: engine.getQuestionText(normalized, entry.type),
      options: normalized.options.map(option => ({ value: option.value, text: option.text })),
      correctAnswer: normalized.correctAnswer,
      explain: entry.question.explain || entry.question.explanation || ""
    };
  });

  return { courseId, topicKey, items };
}

function toClientQuestion(item) {
  return {
    qid: item.qid,
    type: item.type,
    typeName: item.typeName,
    topicName: item.topicName,
    difficulty: item.difficulty,
    question: item.question,
    options: item.options
  };
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

// 判题在服务端完成：填空题比对文本，单选/判断比对选项值。
function gradeAnswer(item, submitted) {
  if (item.type === "fill") {
    const expected = (item.options[0] && item.options[0].text) || "";
    return {
      correct: normalizeText(submitted) === normalizeText(expected),
      correctText: expected,
      correctValue: ""
    };
  }

  const matched = item.options.find(option => option.value === item.correctAnswer);
  return {
    correct: String(submitted || "").trim().toUpperCase() === item.correctAnswer,
    correctText: matched ? `${matched.value}. ${matched.text}` : item.correctAnswer,
    correctValue: item.correctAnswer
  };
}

module.exports = {
  ALL_TOPICS,
  TYPES,
  catalog,
  createQuiz,
  getCourse,
  gradeAnswer,
  toClientQuestion
};
