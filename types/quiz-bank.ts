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
  topicNameMap?: Record<string, string>;
  knowledgeBase?: Record<string, string>;
  examPaper?: {
    school: string;
    academicYear: string;
    term: string;
    courseName: string;
    paperCode: string;
    targetMajor: string;
    singleCount: number;
    judgeCount: number;
    fillCount: number;
    calcCount: number;
    essayCount: number;
  };
}

export interface QuizBank {
  _config?: BankConfig;
  calcQuestions?: CalcQuestion[];
  combined?: EssayQuestion[];
  essay?: EssayQuestion[];
  [topic: string]: TopicBank | BankConfig | EssayQuestion[] | CalcQuestion[] | undefined;
}

export interface CourseInfo {
  title: string;
  fallbackTopics: Array<[string, string]>;
}

export interface TopicItem {
  key: string;
  name: string;
  total: number;
  buttonClass: string;
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
