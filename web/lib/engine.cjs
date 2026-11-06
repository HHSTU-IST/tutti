// 纯 JS 版答题引擎，行为与 services/quiz-engine.ts 保持一致。
// 网页版做成零依赖后，运行期不再需要 Node 的 TypeScript 类型剥离，
// 部署到只提供 Node 运行时的沙箱也能跑。scripts/web-api.test.cjs 会比对两者的
// normalizeQuestion 结果，防止两边逻辑漂移。
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function makeQuestionId(topic) {
  return `${topic}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shuffle(list) {
  const result = list.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[randomIndex];
    result[randomIndex] = current;
  }
  return result;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickRandomMany(list, count) {
  if (count <= 0) return [];
  // 部分 Fisher-Yates：只做前 k 次交换，第 i 步从 i..n-1 里等概率挑一个换到位置 i。
  // 分布与「全 shuffle 再 slice(0,k)」一样是无放回均匀抽样，但成本从 O(n) 降到 O(k)。
  // 大题库挑小题时省得最多（60~80 题池挑 10 题，全 shuffle 白干 50~70 次交换）；小池也没退化。
  const k = Math.min(count, list.length);
  const pool = list.slice();
  for (let i = 0; i < k; i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

function normalizeQuestion(question, type, topicName, fallbackTopic = "") {
  const topic = question.topic || fallbackTopic;
  const difficulty = question.difficulty;

  if (type === "judge") {
    const correctAnswer = question.answer ? "A" : "B";
    return {
      id: makeQuestionId(topic),
      topic,
      topicName,
      type,
      typeName: "判断题",
      difficulty,
      question: question.question,
      correctAnswer,
      options: [
        { value: "A", text: "正确", isCorrect: correctAnswer === "A" },
        { value: "B", text: "错误", isCorrect: correctAnswer === "B" }
      ]
    };
  }

  if (type === "fill") {
    return {
      id: makeQuestionId(topic),
      topic,
      topicName,
      type,
      typeName: "填空题",
      difficulty,
      question: question.question,
      correctAnswer: String(question.answer),
      options: []
    };
  }

  const answerIndex = question.answer;
  const shuffledOptions = shuffle(question.options.map((text, originalIndex) => ({ text, originalIndex })));
  const correctIndex = Math.max(0, shuffledOptions.findIndex(option => option.originalIndex === answerIndex));
  const correctAnswer = LETTERS[correctIndex] || "A";

  return {
    id: makeQuestionId(topic),
    topic,
    topicName,
    type,
    typeName: "单选题",
    difficulty,
    question: question.question,
    correctAnswer,
    options: shuffledOptions.map((option, index) => ({
      value: LETTERS[index] || "A",
      text: option.text,
      isCorrect: index === correctIndex
    }))
  };
}

function getQuestionText(question, type) {
  if (type === "fill") {
    return question.question.replace(/____/g, "______");
  }
  return question.question;
}

module.exports = {
  getQuestionText,
  normalizeQuestion,
  pickRandom,
  pickRandomMany,
  shuffle
};
