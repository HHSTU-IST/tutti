export { };

import { RuntimeDeviceInfo, getRuntimeDeviceInfo } from "../../services/device";
import { AgentKind, resolveUserSession } from "../../services/purchase";
import { findMissingProductionConfig } from "../../services/runtime-config";
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
  getAvailableAgentIds
} from "../../services/registry";
import {
  formatExplain,
  getAllQuestions,
  getQuestions,
  normalizeQuestion,
  pickRandom,
  pickRandomMany
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
  selectedAnswer: string;
  selectedAction: string;
  correctAnswer: string;
  fillAnswer: string;
  explanation: string;
  analysisClass: string;
  analysisTitle: string;
  answered: boolean;
  isCorrect: boolean;
  errorList: ErrorItem[];
  hasNoErrors: boolean;
  showErrorBook: boolean;
  examMode: boolean;
  examProgressText: string;
}

interface QuizPageInstance {
  bank: QuizBank;
  topicDone: Record<string, number>;
  userProfile: UserProfile | null;
  wechatOpenId: string;
  requestedKind: string;
  examQuestions: QuizQuestion[];
  examIndex: number;
  refreshDeviceInfo(): void;
  goHome(): void;
  switchCourse(): void;
  loadPurchasedAgent(): Promise<void>;
  loadCourse(kind: AgentKind, profile?: UserProfile | null): void;
  switchTopic(event: MiniProgramTapEvent<{ topic?: string }>): void;
  resetStats(): void;
  showErrors(): void;
  makeTopicSingle(): void;
  makeTopicJudge(): void;
  makeRandomSingle(): void;
  makeRandomJudge(): void;
  startExam(): void;
  nextExamQuestion(): void;
  exportPaper(): void;
  exportErrors(): void;
  getQuestions(topicKey: string, type: QuestionType): RawQuestion[];
  getAllQuestions(type: QuestionType): RawQuestion[];
  makeQuestion(type: QuestionType, questions: RawQuestion[]): void;
  showQuestion(currentQuestion: QuizQuestion, source?: RawQuestion): void;
  normalizeQuestion(question: RawQuestion, type: QuestionType, topicName: string): QuizQuestion;
  answerQuestion(event: MiniProgramTapEvent<{ value?: AnswerValue }>): void;
  onFillInput(event: { detail: { value: string } }): void;
  submitFillAnswer(): void;
  gradeAnswer(selectedAnswer: string): void;
  persistQuizSnapshot(errorList: ErrorItem[], stats: AnswerStats): void;
  updateProgress(): void;
  updateComputedViewState(): void;
}

function normalizeAnswerText(value: string): string {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
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
    fillAnswer: "",
    explanation: "",
    analysisClass: "analysis",
    analysisTitle: "",
    answered: false,
    isCorrect: false,
    errorList: [],
    hasNoErrors: true,
    showErrorBook: false,
    examMode: false,
    examProgressText: ""
  },

  bank: DEFAULT_BANK,
  topicDone: {},
  userProfile: null,
  wechatOpenId: "",
  requestedKind: "",
  examQuestions: [],
  examIndex: 0,

  onLoad(options: Record<string, string | undefined>) {
    this.refreshDeviceInfo();
    this.requestedKind = (options && options.kind) || "";
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

  switchCourse() {
    wx.redirectTo({
      url: "/pages/index/index"
    });
  },

  async loadPurchasedAgent() {
    const session = await resolveUserSession(getAvailableAgentIds());
    if (!session) {
      this.setData({
        isReady: false,
        readyMessage: findMissingProductionConfig().length
          ? "生产配置缺失，请联系管理员（详见开发者工具日志）。"
          : "未读取到题库授权，请返回首页完成微信扫码登录。"
      });
      return;
    }

    this.wechatOpenId = session.wechatOpenId;
    try {
      this.userProfile = await getOrCreateUserProfile(session.wechatOpenId, session.agents);
    } catch {
      this.userProfile = null;
      wx.showToast({
        title: "用户数据加载失败，已降级本地使用",
        icon: "none"
      });
    }
    // 课程由 URL 参数指定；必须校验授权，避免直接改参数进入未付费题库。
    const kind = this.requestedKind || session.agent;
    if (session.agents[kind] !== true) {
      const course = getAgentCourse(kind);
      this.setData({
        isReady: false,
        readyMessage: `「${course ? course.title : kind}」尚未开通，请返回课程列表选择已开通的题库。`
      });
      return;
    }

    this.loadCourse(kind, this.userProfile);
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
      fillAnswer: "",
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
      showErrorBook: false,
      examMode: false,
      examProgressText: ""
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
      fillAnswer: "",
      explanation: "",
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false,
      hasNoErrors: true,
      showErrorBook: false,
      examMode: false,
      examProgressText: ""
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

  startExam() {
    const sections: Array<[QuestionType, number, string]> = [
      ["single", 20, "单选题"],
      ["judge", 10, "判断题"],
      ["fill", 10, "填空题"]
    ];
    const questions: QuizQuestion[] = [];
    const shortfall: string[] = [];

    sections.forEach(([type, count, label]) => {
      const picked = pickRandomMany(this.getAllQuestions(type), count);
      if (picked.length < count) {
        shortfall.push(`${label}仅 ${picked.length}/${count} 题`);
      }
      picked.forEach(question => {
        questions.push(this.normalizeQuestion(question, type, question.topic || ""));
      });
    });

    if (!questions.length) {
      wx.showToast({ title: "暂无足够题目", icon: "none" });
      return;
    }

    this.examQuestions = questions;
    this.examIndex = 0;
    this.setData({
      selectedAction: "exam",
      showErrorBook: false,
      examMode: true,
      examProgressText: `1/${questions.length}`
    });
    this.showQuestion(questions[0]);

    // pickRandomMany 会在题量不足时静默截断，这里显式告知用户，避免误以为试卷完整。
    if (shortfall.length) {
      wx.showToast({
        title: `题库不足：${shortfall.join("，")}`,
        icon: "none",
        duration: 3000
      });
    }
  },

  nextExamQuestion() {
    if (!this.data.examMode || !this.data.answered) return;
    const nextIndex = this.examIndex + 1;
    if (nextIndex >= this.examQuestions.length) {
      wx.showToast({ title: "试卷已完成", icon: "success" });
      this.setData({ examMode: false, examProgressText: "已完成" });
      return;
    }

    this.examIndex = nextIndex;
    this.setData({ examProgressText: `${nextIndex + 1}/${this.examQuestions.length}` });
    this.showQuestion(this.examQuestions[nextIndex]);
  },

  exportPaper() {
    if (!this.examQuestions.length) {
      wx.showToast({ title: "请先开始试卷练习", icon: "none" });
      return;
    }

    const text = [
      `《${this.data.title}》试卷`,
      `共 ${this.examQuestions.length} 题`,
      "",
      ...this.examQuestions.map((question, index) => {
        const options = question.options.map(option => `(${option.value})${option.text}`).join(" ");
        return `${index + 1}. ${question.question}${options ? `\n${options}` : ""}`;
      })
    ].join("\n");
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "试卷已复制", icon: "success" })
    });
  },

  exportErrors() {
    if (!this.data.errorList.length) {
      wx.showToast({ title: "当前还没有错题", icon: "none" });
      return;
    }

    const text = [
      `《${this.data.title}》错题本`,
      "",
      ...this.data.errorList.map((item, index) => `${index + 1}. ${item.question}\n正确答案：${item.answer}`)
    ].join("\n\n");
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "错题本已复制", icon: "success" })
    });
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
    this.showQuestion(this.normalizeQuestion(source, type, source.topic || ""), source);
  },

  showQuestion(currentQuestion: QuizQuestion, source?: RawQuestion) {

    this.setData({
      currentQuestion,
      selectedAnswer: "",
      fillAnswer: "",
      correctAnswer: currentQuestion.correctAnswer,
      explanation: formatExplain(source || currentQuestion.raw),
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

  onFillInput(event: { detail: { value: string } }) {
    this.setData({ fillAnswer: event.detail.value });
  },

  submitFillAnswer() {
    const selectedAnswer = this.data.fillAnswer.trim();
    if (!selectedAnswer) {
      wx.showToast({ title: "请先输入答案", icon: "none" });
      return;
    }
    this.gradeAnswer(selectedAnswer);
  },

  answerQuestion(event: MiniProgramTapEvent<{ value?: AnswerValue }>) {
    const selectedAnswer = event.currentTarget.dataset.value;
    if (!selectedAnswer) return;
    this.gradeAnswer(selectedAnswer);
  },

  gradeAnswer(selectedAnswer: string) {
    if (this.data.answered || !this.data.currentQuestion) return;

    const isCorrect = this.data.currentQuestion.type === "fill"
      ? normalizeAnswerText(selectedAnswer) === normalizeAnswerText(String(this.data.correctAnswer))
      : selectedAnswer === this.data.correctAnswer;

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
