const fs = require("fs");
const path = require("path");

// 发布沙箱只上传 web/ 目录，因此运行期一律读 web/data 下的构建产物。
// 在仓库内开发时若还没构建，则退回直接读取 data/topic-*.ts。
const BUNDLE_DIR = path.join(__dirname, "../data");
const BUNDLE_MANIFEST = path.join(BUNDLE_DIR, "courses.json");
const BUNDLE_BANKS_DIR = path.join(BUNDLE_DIR, "banks");
const REPO_DATA_DIR = path.join(__dirname, "../../data");

const { buildCatalogFromRepo, summarize } = require("./catalog.cjs");

const TYPES = ["single", "judge", "fill"];
const ALL_TOPICS = "__all__";

function loadBundledCatalog() {
  if (!fs.existsSync(BUNDLE_MANIFEST)) return null;

  const courses = JSON.parse(fs.readFileSync(BUNDLE_MANIFEST, "utf8")).courses;
  if (!Array.isArray(courses) || !courses.length) return null;

  return courses.map(course => Object.assign({}, course, summarize(course.topics)));
}

function loadRepoCatalog() {
  return buildCatalogFromRepo().map(entry => {
    const { bank, ...course } = entry;
    return Object.assign(course, summarize(course.topics));
  });
}

const catalog = loadBundledCatalog() || loadRepoCatalog();
const courseMap = new Map(catalog.map(course => [course.id, course]));
const bankCache = new Map();

function getCourse(courseId) {
  return courseMap.get(courseId) || null;
}

function getBank(courseId) {
  if (!getCourse(courseId)) return null;
  if (bankCache.has(courseId)) return bankCache.get(courseId);

  const bundledPath = path.join(BUNDLE_BANKS_DIR, `${courseId}.json`);
  const bank = fs.existsSync(bundledPath)
    ? JSON.parse(fs.readFileSync(bundledPath, "utf8"))
    : require("../../scripts/load-topic-bank.cjs").loadTopicBank(courseId);

  bankCache.set(courseId, bank);
  return bank;
}

function resolveTopicName(courseId, topicKey) {
  const course = getCourse(courseId);
  if (!course) return topicKey;
  const topic = course.topics.find(item => item.key === topicKey);
  return topic ? topic.name : topicKey;
}

function getEngine() {
  return require("./engine.cjs");
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

// 生成一次练习：正确答案与解析只保留在服务端会话里，不随题目下发。
function createQuiz(courseId, topicKey, count, types) {
  const course = getCourse(courseId);
  if (!course) return null;

  const useTypes = (types && types.length ? types : TYPES).filter(type => TYPES.includes(type));
  const pool = collectPool(courseId, topicKey, useTypes);
  if (!pool.length) return null;

  const engine = getEngine();
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

// 判题在服务端完成：填空比对文本，单选/判断比对选项值。
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
