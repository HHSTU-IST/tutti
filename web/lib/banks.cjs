const path = require("path");

// 题库只有一份真源：仓库的 data/topic-*.ts（Node ≥ 22.6 的类型剥离，见 scripts/load-topic-bank.cjs）。
// 网页端直接在仓库里跑，运行期读的就是它，改完题库重启服务即生效，没有第二份副本要同步。
// 所以 web/ 必须与 data/ 一起部署（整个仓库一起上，或至少这两个目录保持相对位置）。
const REPO_DATA_DIR = path.join(__dirname, "../../data");

const { buildCatalogFromRepo, summarize } = require("./catalog.cjs");

const TYPES = ["single", "judge", "fill"];
const ALL_TOPICS = "__all__";

const catalog = buildCatalogFromRepo().map(entry => {
  const { bank, ...course } = entry;
  return Object.assign(course, summarize(course.topics));
});

const courseMap = new Map(catalog.map(course => [course.id, course]));
const bankCache = new Map();

function getCourse(courseId) {
  return courseMap.get(courseId) || null;
}

function getBank(courseId) {
  if (!getCourse(courseId)) return null;
  if (bankCache.has(courseId)) return bankCache.get(courseId);

  const bank = require("../../scripts/load-topic-bank.cjs").loadTopicBank(courseId);

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
    const expected = String(item.correctAnswer || "");
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
