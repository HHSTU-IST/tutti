import type {
  AnswerValue,
  ChoiceQuestion,
  DifficultyLevel,
  QuestionOption,
  QuestionType,
  QuizBank,
  QuizQuestion,
  RawQuestion
} from "../types/quiz-bank";

const LETTERS: AnswerValue[] = ["A", "B", "C", "D", "E", "F"];

function makeQuestionId(topic: string): string {
  return `${topic}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function shuffle<T>(list: T[]): T[] {
  const result = list.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[randomIndex];
    result[randomIndex] = current;
  }
  return result;
}

export function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickRandomMany<T>(list: T[], count: number): T[] {
  if (count <= 0) return [];
  return shuffle(list).slice(0, Math.min(count, list.length));
}

export function formatExplain(question: RawQuestion): string {
  return question.explain || question.explanation || "暂无解析。";
}

export function getQuestions(bank: QuizBank, topicKey: string, type: QuestionType): RawQuestion[] {
  const topic = bank[topicKey] as { [key in QuestionType]?: RawQuestion[] } | undefined;
  if (!topic) return [];

  return (topic[type] || []).map(question => Object.assign({}, question, {
    topic: topicKey
  }));
}

export function getAllQuestions(bank: QuizBank, topicKeys: string[], type: QuestionType): RawQuestion[] {
  return topicKeys.reduce<RawQuestion[]>(
    (result, topicKey) => result.concat(getQuestions(bank, topicKey, type)),
    []
  );
}

export function normalizeQuestion(
  question: RawQuestion,
  type: QuestionType,
  topicName: string,
  fallbackTopic = ""
): QuizQuestion {
  const topic = question.topic || fallbackTopic;
  const difficulty = (question as { difficulty?: DifficultyLevel }).difficulty;

  if (type === "judge") {
    const correctAnswer: AnswerValue = question.answer ? "A" : "B";
    const options: QuestionOption[] = [
      { value: "A", text: "正确", isCorrect: correctAnswer === "A", buttonClass: "option-btn" },
      { value: "B", text: "错误", isCorrect: correctAnswer === "B", buttonClass: "option-btn" }
    ];

    return {
      id: makeQuestionId(topic),
      raw: question,
      topic,
      topicName,
      type,
      typeName: "判断题",
      difficulty,
      question: question.question,
      correctAnswer,
      options
    };
  }

  if (type === "fill") {
    return {
      id: makeQuestionId(topic),
      raw: question,
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

  const choiceQuestion = question as ChoiceQuestion;
  const answerIndex = choiceQuestion.answer;
  const shuffledOptions = shuffle(choiceQuestion.options.map((text, originalIndex) => ({
    text,
    originalIndex
  })));
  const correctIndex = Math.max(0, shuffledOptions.findIndex(option => option.originalIndex === answerIndex));
  const correctAnswer = LETTERS[correctIndex] || "A";

  return {
    id: makeQuestionId(topic),
    raw: question,
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
      isCorrect: index === correctIndex,
      buttonClass: "option-btn"
    }))
  };
}

export function makeRandomQuestion(
  bank: QuizBank,
  topicKeys: string[],
  type: QuestionType,
  resolveTopicName: (topicKey: string) => string
): QuizQuestion | null {
  const questions = getAllQuestions(bank, topicKeys, type);
  if (!questions.length) return null;

  const source = pickRandom(questions);
  const topicName = resolveTopicName(source.topic || "");
  return normalizeQuestion(source, type, topicName, source.topic || "");
}

export function getQuestionText(question: QuizQuestion, type: QuestionType): string {
  if (type === "fill") {
    return question.question.replace(/____/g, "______");
  }

  return question.question;
}
