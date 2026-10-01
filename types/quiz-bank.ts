export type QuestionType = "single" | "judge" | "fill";
export type AnswerValue = "A" | "B" | "C" | "D" | "E" | "F";
export type DifficultyLevel = "易" | "中" | "难";

export interface ChoiceQuestion {
  question: string;
  options: string[];
  answer: number;
  explain?: string;
  explanation?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
}

export interface JudgeQuestion {
  question: string;
  answer: boolean;
  explain?: string;
  explanation?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
}

export interface EssayQuestion {
  question: string;
  answer: string;
  explain?: string;
  explanation?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
}

export type RawQuestion = ChoiceQuestion | JudgeQuestion | EssayQuestion;

export interface TopicBank {
  single?: ChoiceQuestion[];
  judge?: JudgeQuestion[];
  fill?: EssayQuestion[];
}

export interface CalcQuestion extends EssayQuestion {
  prompt?: string;
}

export interface BankConfig {
  /** 课程标题，首页与网页端课程卡片直接用它。 */
  title?: string;
  /** 专题顺序（也是「有哪些专题」的白名单），缺省时按题库键顺序兜底。 */
  topicOrder?: string[];
  topicNameMap?: Record<string, string>;
}

export interface QuizBank {
  _config?: BankConfig;
  calcQuestions?: CalcQuestion[];
  combined?: EssayQuestion[];
  essay?: EssayQuestion[];
  [topic: string]: TopicBank | BankConfig | EssayQuestion[] | CalcQuestion[] | undefined;
}

export interface TopicItem {
  key: string;
  name: string;
  total: number;
  buttonClass: string;
}

/** 错题记录：小程序写进云数据库 `wrongQuestions` 的元素结构。 */
export interface WrongQuestionEntry {
  id: string;
  agent: string;
  topic: string;
  question: string;
  /** 正确答案的可读形式：判断题是「正确 / 错误」，单选题带上选项文本，填空题是答案本身。 */
  answer: string;
  /** 题目解析；填空题题库一般不写 explain，此时退化成参考答案。 */
  explain?: string;
  createdAt: number;
}

/** 练习队列的一段：某种题型抽多少道（试卷练习就是三段）。 */
export interface PracticeSection {
  type: QuestionType;
  count: number;
  label: string;
}

export interface PracticeQueue {
  questions: QuizQuestion[];
  /** 题量不足以凑满某一段时的说明，交给页面提示用户。 */
  shortfall: string[];
}

export interface QuestionOption {
  value: AnswerValue;
  text: string;
  isCorrect: boolean;
  buttonClass: string;
}

export interface QuizQuestion {
  id: string;
  raw: RawQuestion;
  topic: string;
  topicName: string;
  type: QuestionType;
  typeName: string;
  difficulty?: DifficultyLevel;
  question: string;
  correctAnswer: AnswerValue | string;
  options: QuestionOption[];
}
