export { };

import { RuntimeDeviceInfo, getRuntimeDeviceInfo } from "../../services/device";
import { AgentKind, resolveUserSession } from "../../services/purchase";
import {
  AnswerStats,
  UserProfile,
  WrongQuestionRecord,
  applyUserQuizSnapshot,
  getOrCreateUserProfile,
  resetQuizSnapshot,
  saveQuizSnapshot
} from "../../services/user-db";
import {
  AnswerValue,
  ChoiceQuestion,
  QuestionOption,
  QuestionType,
  QuizBank,
  QuizQuestion,
  RawQuestion,
  TopicItem
} from "../../types/quiz-bank";
import {
  buildAgentTopics,
  getAgentBank,
  getAgentCourse,
  getAvailableAgentIds,
  isTopicBank
} from "../../services/registry";
import {
  formatExplain,
  getAllQuestions,
  getQuestions,
  normalizeQuestion,
  pickRandom
} from "../../services/quiz-engine";

interface ErrorItem {
  id: string;
  question: string;
  answer: string;
  agent: AgentKind;
  topic: string;
  createdAt: number;
}

interface QuizData {
  isReady: boolean;
  platformClass: string;
  readyMessage: string;
  kind: string;
  title: string;
  topics: TopicItem[];
  currentTopic: string;
  currentTopicName: string;
  progressText: string;
  progressPercent: number;
  rightNum: number;
  wrongNum: number;
  totalNum: number;
  rateText: string;
  currentQuestion: QuizQuestion | null;
  selectedAnswer: AnswerValue | "";
  selectedAction: string;
  correctAnswer: AnswerValue | "";
  explanation: string;
  analysisClass: string;
  analysisTitle: string;
  answered: boolean;
  isCorrect: boolean;
  errorList: ErrorItem[];
  hasNoErrors: boolean;
  showErrorBook: boolean;
}

interface QuizPageInstance {
  bank: QuizBank;
  topicDone: Record<string, number>;
  userProfile: UserProfile | null;
  wechatOpenId: string;
  refreshDeviceInfo(): void;
  goHome(): void;
  loadPurchasedAgent(): Promise<void>;
  loadCourse(kind: AgentKind, profile?: UserProfile | null): void;
  switchTopic(event: MiniProgramTapEvent<{ topic?: string }>): void;
  resetStats(): void;
  showErrors(): void;
  makeTopicSingle(): void;
  makeTopicJudge(): void;
  makeRandomSingle(): void;
  makeRandomJudge(): void;
  getQuestions(topicKey: string, type: QuestionType): RawQuestion[];
  getAllQuestions(type: QuestionType): RawQuestion[];
  makeQuestion(type: QuestionType, questions: RawQuestion[]): void;
  normalizeQuestion(question: RawQuestion, type: QuestionType, topicName: string): QuizQuestion;
  answerQuestion(event: MiniProgramTapEvent<{ value?: AnswerValue }>): void;
  persistQuizSnapshot(errorList: ErrorItem[], stats: AnswerStats): void;
  updateProgress(): void;
  updateComputedViewState(): void;
}

const DEFAULT_BANK: QuizBank = getAgentBank("py") || {};
const DEFAULT_DEVICE_INFO = getRuntimeDeviceInfo();

Page<QuizData, QuizPageInstance>({
  data: {
    isReady: false,
    platformClass: DEFAULT_DEVICE_INFO.platformClass,
    readyMessage: "正在读取题库授权...",
    kind: "py",
    title: "",
    topics: [],
    currentTopic: "",
    currentTopicName: "",
    progressText: "0/0 0%",
    progressPercent: 0,
    rightNum: 0,
    wrongNum: 0,
    totalNum: 0,
    rateText: "0%",
    currentQuestion: null,
    selectedAnswer: "",
    selectedAction: "",
    correctAnswer: "",
    explanation: "",
    analysisClass: "analysis",
    analysisTitle: "",
    answered: false,
    isCorrect: false,
    errorList: [],
    hasNoErrors: true,
    showErrorBook: false
  },

  bank: DEFAULT_BANK,
  topicDone: {},
  userProfile: null,
  wechatOpenId: "",

  onLoad() {
    this.refreshDeviceInfo();
    this.loadPurchasedAgent();
  },

  refreshDeviceInfo() {
    const app = getApp<{ globalData?: { deviceInfo?: RuntimeDeviceInfo } }>();
    const deviceInfo = (app.globalData && app.globalData.deviceInfo) || getRuntimeDeviceInfo();

    this.setData({
      platformClass: deviceInfo.platformClass
    });
  },


  goHome() {
    wx.redirectTo({
      url: "/pages/index/index"
    });
  },
  async loadPurchasedAgent() {
    const session = await resolveUserSession(getAvailableAgentIds());
    if (!session) {
      this.setData({
        isReady: false,
        readyMessage: "未读取到题库授权，请返回首页完成微信扫码登录。"
      });
      return;
    }

    this.wechatOpenId = session.wechatOpenId;
    try {
      this.userProfile = await getOrCreateUserProfile(session.wechatOpenId, session.agents);
    } catch (error) {
      this.userProfile = null;
      wx.showToast({
        title: "用户数据加载失败，已降级本地使用",
        icon: "none"
      });
    }
    this.loadCourse(session.agent, this.userProfile);
  },

  loadCourse(kind: AgentKind, profile?: UserProfile | null) {
    const bank = getAgentBank(kind);
    const course = getAgentCourse(kind);
    if (!bank || !course) {
      this.setData({
        isReady: false,
        readyMessage: "未读取到题库授权，请返回首页完成微信扫码登录。"
      });
      return;
    }

    const topics = buildAgentTopics(kind);
    const currentTopic = topics[0] ? topics[0].key : "";
    const topicDone: Record<string, number> = {};
    topics.forEach(topic => {
      topicDone[topic.key] = 0;
    });
    const snapshot = applyUserQuizSnapshot(profile === undefined ? this.userProfile : profile, kind);
    Object.keys(snapshot.topicDone).forEach(topic => {
      topicDone[topic] = snapshot.topicDone[topic];
    });

    this.bank = bank;
    this.topicDone = topicDone;
    wx.setNavigationBarTitle({ title: course.title });

    this.setData({
      isReady: true,
      kind,
      title: course.title,
      topics,
      currentTopic,
      currentQuestion: null,
      selectedAnswer: "",
      correctAnswer: "",
      explanation: "",
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false,
      showErrorBook: false,
      rightNum: snapshot.stats.rightNum,
      wrongNum: snapshot.stats.wrongNum,
      totalNum: snapshot.stats.totalNum,
      rateText: snapshot.stats.totalNum
        ? `${((snapshot.stats.rightNum / snapshot.stats.totalNum) * 100).toFixed(1)}%`
        : "0%",
      errorList: snapshot.wrongQuestions
    });
    this.updateComputedViewState();
  },

  switchTopic(event: MiniProgramTapEvent<{ topic?: string }>) {
    const currentTopic = event.currentTarget.dataset.topic;
    if (!currentTopic) return;

    this.setData({
      currentTopic,
      currentQuestion: null,
      showErrorBook: false
    });
    this.updateComputedViewState();
  },

  resetStats() {
    const topicDone: Record<string, number> = {};
    this.data.topics.forEach(topic => {
      topicDone[topic.key] = 0;
    });
    this.topicDone = topicDone;
    this.setData({
      rightNum: 0,
      wrongNum: 0,
      totalNum: 0,
      rateText: "0%",
      errorList: [],
      currentQuestion: null,
      selectedAnswer: "",
      selectedAction: "",
      correctAnswer: "",
      explanation: "",
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false,
      hasNoErrors: true,
      showErrorBook: false
    });
    this.updateComputedViewState();
    void resetQuizSnapshot(this.wechatOpenId, this.data.kind).catch(() => {
      wx.showToast({
        title: "重置失败，稍后再试",
        icon: "none"
      });
    });
  },

  showErrors() {
    this.setData({
      showErrorBook: true,
      currentQuestion: null,
      selectedAction: "errors"
    });
    this.updateComputedViewState();
  },

  makeTopicSingle() {
    this.setData({
      selectedAction: "topic-single",
      showErrorBook: false
    });
    this.makeQuestion("single", this.getQuestions(this.data.currentTopic, "single"));
  },

  makeTopicJudge() {
    this.setData({
      selectedAction: "topic-judge",
      showErrorBook: false
    });
    this.makeQuestion("judge", this.getQuestions(this.data.currentTopic, "judge"));
  },

  makeRandomSingle() {
    this.setData({
      selectedAction: "random-single",
      showErrorBook: false
    });
    this.makeQuestion("single", this.getAllQuestions("single"));
  },

  makeRandomJudge() {
    this.setData({
      selectedAction: "random-judge",
      showErrorBook: false
    });
    this.makeQuestion("judge", this.getAllQuestions("judge"));
  },

  getQuestions(topicKey: string, type: QuestionType): RawQuestion[] {
    return getQuestions(this.bank, topicKey, type);
  },

  getAllQuestions(type: QuestionType): RawQuestion[] {
    return getAllQuestions(this.bank, this.data.topics.map(topic => topic.key), type);
  },

  makeQuestion(type: QuestionType, questions: RawQuestion[]) {
    if (!questions.length) {
      wx.showToast({
        title: "暂无题目",
        icon: "none"
      });
      return;
    }

    const source = pickRandom(questions);
    const currentQuestion = this.normalizeQuestion(source, type, source.topic || "");

    this.setData({
      currentQuestion,
      selectedAnswer: "",
      correctAnswer: currentQuestion.correctAnswer,
      explanation: formatExplain(source),
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false,
      showErrorBook: false
    });
    this.updateComputedViewState();
  },

  normalizeQuestion(question: RawQuestion, type: QuestionType, topicKey: string): QuizQuestion {
    const topicName = this.data.topics.find(topic => topic.key === topicKey)?.name || this.data.currentTopicName;
    return normalizeQuestion(question, type, topicName, topicKey);
  },

  answerQuestion(event: MiniProgramTapEvent<{ value?: AnswerValue }>) {
    if (this.data.answered || !this.data.currentQuestion) return;

    const selectedAnswer = event.currentTarget.dataset.value;
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === this.data.correctAnswer;
    const rightNum = this.data.rightNum + (isCorrect ? 1 : 0);
    const wrongNum = this.data.wrongNum + (isCorrect ? 0 : 1);
    const totalNum = this.data.totalNum + 1;
    const rateText = totalNum ? `${((rightNum / totalNum) * 100).toFixed(1)}%` : "0%";
    const topic = this.data.currentQuestion.topic;

    this.topicDone[topic] = (this.topicDone[topic] || 0) + 1;

    const newError: ErrorItem = {
      id: `${Date.now()}`,
      question: this.data.currentQuestion.question,
      answer: this.data.correctAnswer || "A",
      agent: this.data.kind,
      topic,
      createdAt: Date.now()
    };
    const errorList = isCorrect
      ? this.data.errorList
      : [newError].concat(this.data.errorList);

    this.setData({
      selectedAnswer,
      answered: true,
      isCorrect,
      rightNum,
      wrongNum,
      totalNum,
      rateText,
      errorList,
      analysisClass: isCorrect ? "analysis right" : "analysis wrong",
      analysisTitle: `${isCorrect ? "回答正确" : "回答错误"} · 正确答案：${this.data.correctAnswer}`
    });
    this.updateComputedViewState();
    this.persistQuizSnapshot(errorList, { rightNum, wrongNum, totalNum });
  },

  persistQuizSnapshot(errorList: ErrorItem[], stats: AnswerStats) {
    const wrongQuestions: WrongQuestionRecord[] = errorList.map(item => ({
      id: item.id,
      agent: item.agent,
      topic: item.topic,
      question: item.question,
      answer: item.answer,
      createdAt: item.createdAt
    }));

    void saveQuizSnapshot(this.wechatOpenId, this.data.kind, {
      stats,
      topicDone: this.topicDone,
      wrongQuestions
    }).catch(() => {
      wx.showToast({
        title: "同步失败，已保留当前答题结果",
        icon: "none"
      });
    });
  },

  updateProgress() {
    const topic = this.data.topics.find(item => item.key === this.data.currentTopic);
    if (!topic) return;

    const done = this.topicDone[topic.key] || 0;
    const total = topic.total || 0;
    const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

    this.setData({
      currentTopicName: topic.name,
      progressText: `${done}/${total} ${percent}%`,
      progressPercent: percent
    });
  },

  updateComputedViewState() {
    this.updateProgress();

    const topicCount = this.data.topics.length;
    const topics = this.data.topics.map((topic, index) => {
      const classes = [topic.key === this.data.currentTopic ? "topic-btn active" : "topic-btn"];
      if (topicCount % 2 === 1 && index === topicCount - 1) {
        classes.push("topic-span-full");
      }

      return {
        ...topic,
        buttonClass: classes.join(" ")
      };
    });
    const currentQuestion = this.data.currentQuestion
      ? {
        ...this.data.currentQuestion,
        options: this.data.currentQuestion.options.map(option => {
          const classes = ["option-btn"];
          if (option.value === this.data.selectedAnswer) classes.push("selected");
          if (this.data.answered && option.isCorrect) classes.push("correct");
          if (this.data.answered && option.value === this.data.selectedAnswer && !option.isCorrect) {
            classes.push("wrong");
          }

          return {
            ...option,
            buttonClass: classes.join(" ")
          };
        })
      }
      : null;

    this.setData({
      topics,
      currentQuestion,
      hasNoErrors: this.data.errorList.length === 0
    });
  }
});
