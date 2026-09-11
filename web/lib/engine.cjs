// 纯 JS 版答题引擎，行为与 services/quiz-engine.ts 保持一致。
// 网页版做成零依赖后，运行期不再需要 Node 的 TypeScript 类型剥离，
// 部署到只提供 Node 运行时的沙箱也能跑。scripts/web-api.test.cjs 会比对两者的
// normalizeQuestion 结果，防止两边逻辑漂移。
const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
  return shuffle(list).slice(0, Math.min(count, list.length));
}

function normalizeQuestion(question, type, topicName, fallbackTopic = "") {
  const topic = question.topic || fallbackTopic;
  const difficulty = question.difficulty;

  if (type === "judge") {
    const correctAnswer = question.answer ? "A" : "B";
    return {
      id: `${topic}-${Date.now()}`,
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
      id: `${topic}-${Date.now()}`,
      topic,
      topicName,
      type,
      typeName: "填空题",
      difficulty,
      question: question.question,
      correctAnswer: "A",
      options: [{ value: "A", text: String(question.answer), isCorrect: true }]
    };
  }

  const answerIndex = question.answer;
  const shuffledOptions = shuffle(question.options.map((text, originalIndex) => ({ text, originalIndex })));
  const correctIndex = Math.max(0, shuffledOptions.findIndex(option => option.originalIndex === answerIndex));
  const correctAnswer = LETTERS[correctIndex] || "A";

  return {
    id: `${topic}-${Date.now()}`,
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
