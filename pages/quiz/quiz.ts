import { getRuntimeDeviceInfo, resolveDeviceInfo } from "../../services/device";
import { AgentKind, getLastLoginFailure, resolveUserSession } from "../../services/purchase";
import { MISSING_CONFIG_MESSAGE, hasMissingProductionConfig } from "../../services/runtime-config";
import {
  AnswerStats,
  UserProfile,
  applyUserQuizSnapshot,
  getOrCreateUserProfile,
  resetQuizSnapshot,
  saveQuizSnapshot
} from "../../services/user-db";
import {
  PracticeSection,
  QuestionType,
  QuizBank,
  QuizQuestion,
  TopicItem,
  WrongQuestionEntry
} from "../../types/quiz-bank";
import {
  buildAgentTopics,
  getAgentBank,
  getAgentCourse,
  getAvailableAgentIds
} from "../../services/registry";
import {
  buildPracticeQueue,
  dedupeWrongQuestions,
  formatExplain,
  upsertWrongQuestion
} from "../../services/quiz-engine";

type ErrorItem = WrongQuestionEntry;

interface PracticePreset {
  type: QuestionType;
  scope: "topic" | "all";
  label: string;
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
  showTopicPicker: boolean;
  questionCount: number;
  practiceActive: boolean;
  practiceProgressText: string;
  nextButtonText: string;
  showSummary: boolean;
  summaryTitle: string;
  summaryRight: number;
  summaryTotal: number;
  summaryWrong: number;
  summaryRateText: string;
}

interface QuizPageInstance {
  bank: QuizBank;
  topicDone: Record<string, number>;
  userProfile: UserProfile | null;
  wechatOpenId: string;
  requestedKind: string;
  practiceQuestions: QuizQuestion[];
  practiceIndex: number;
  practiceRight: number;
  practiceModeKey: string;
  practiceLabel: string;
  refreshDeviceInfo(): void;
  goHome(): void;
  loadPurchasedAgent(): Promise<void>;
  loadCourse(kind: AgentKind, profile?: UserProfile | null): void;
  topicName(topicKey: string): string;
  switchTopic(event: MiniProgramTapEvent<{ topic?: string }>): void;
  chooseCount(event: MiniProgramTapEvent<{ count?: string | number }>): void;
  startPracticeByMode(event: MiniProgramTapEvent<{ mode?: string }>): void;
  startPractice(modeKey: string): void;
  startExam(): void;
  launchPractice(modeKey: string, sections: PracticeSection[], topicKeys: string[], label: string): void;
  nextPracticeQuestion(): void;
  finishPractice(): void;
  retryPractice(): void;
  closeSummary(): void;
  resetPracticeView(): void;
  resetStats(): void;
  applyReset(): void;
  showErrors(): void;
  showPendingMode(): void;
  exportPaper(): void;
  buildErrorBookMarkdown(): string;
  exportErrors(): void;
  copyErrorBook(markdown: string): void;
  showQuestion(question: QuizQuestion): void;
  answerQuestion(event: MiniProgramTapEvent<{ value?: string }>): void;
  onFillInput(event: MiniProgramInputEvent): void;
  submitFillAnswer(): void;
  gradeAnswer(selectedAnswer: string): void;
  removeErrorItem(event: MiniProgramTapEvent<{ index?: string | number }>): void;
  persistQuizSnapshot(errorList: ErrorItem[], stats: AnswerStats): void;
  updateProgress(): void;
  updateComputedViewState(): void;
}

function normalizeAnswerText(value: string): string {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function formatRateText(rightNum: number, totalNum: number): string {
  return totalNum ? `${((rightNum / totalNum) * 100).toFixed(1)}%` : "0%";
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatExportTime(date: Date): string {
  const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// 文件名里的非法字符换成短横线（课程名是中文一般不会中招，顺手挡一下）。
function sanitizeFileName(value: string): string {
  return String(value || "").replace(/[\\/:*?"<>|]/g, "-").trim() || "错题本";
}

/**
 * 错题本里要写「人话答案」：选项顺序每道题都会重排，只存 "A" 等于什么都没说。
 * 判断题退化成「正确 / 错误」，单选题带上选项文本，填空题原本就是答案本身。
 */
function describeCorrectAnswer(question: QuizQuestion, correctAnswer: string): string {
  if (question.type === "fill") return String(correctAnswer);

  const option = question.options.find(item => item.value === correctAnswer);
  if (!option) return String(correctAnswer);

  return question.type === "judge" ? option.text : `${option.value}. ${option.text}`;
}

/** 填空题题库一般不写 explain，此时把参考答案当作解析，别让用户看到「暂无解析」。 */
function resolveExplanation(question: QuizQuestion): string {
  const raw = question.raw as { explain?: string; explanation?: string };
  if (raw.explain || raw.explanation) return formatExplain(question.raw);
  if (question.type === "fill") return `参考答案：${question.correctAnswer}`;

  return "暂无解析。";
}

const DEFAULT_BANK: QuizBank = getAgentBank("py") || {};
const DEFAULT_DEVICE_INFO = getRuntimeDeviceInfo();
const QUESTION_COUNTS = [1, 10, 20, 30];
const DEFAULT_QUESTION_COUNT = 10;

// 出题入口只差「题型 × 抽题范围」两件事，抽多少题由题量选择统一决定。
const PRACTICE_PRESETS: Record<string, PracticePreset> = {
  "topic-single": { type: "single", scope: "topic", label: "专题单选" },
  "topic-judge": { type: "judge", scope: "topic", label: "专题判断" },
  "topic-fill": { type: "fill", scope: "topic", label: "专题填空" },
  "random-single": { type: "single", scope: "all", label: "随机单选" },
  "random-judge": { type: "judge", scope: "all", label: "随机判断" },
  "random-fill": { type: "fill", scope: "all", label: "随机填空" }
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "单选题",
  judge: "判断题",
  fill: "填空题"
};

// 只有「按专题出题」的三种方式需要先挑专题，试卷练习与随机练习都是整门课范围。
const TOPIC_SCOPED_ACTIONS = ["topic-single", "topic-judge", "topic-fill"];

// 试卷练习的固定构成：整门课范围抽 20 单选 + 10 判断 + 10 填空。
const EXAM_SECTIONS: PracticeSection[] = [
  { type: "single", count: 20, label: "单选题" },
  { type: "judge", count: 10, label: "判断题" },
  { type: "fill", count: 10, label: "填空题" }
];

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
    showTopicPicker: false,
    questionCount: DEFAULT_QUESTION_COUNT,
    practiceActive: false,
    practiceProgressText: "",
    nextButtonText: "下一题",
    showSummary: false,
    summaryTitle: "",
    summaryRight: 0,
    summaryTotal: 0,
    summaryWrong: 0,
    summaryRateText: "0%"
  },

  bank: DEFAULT_BANK,
  topicDone: {},
  userProfile: null,
  wechatOpenId: "",
  requestedKind: "",
  practiceQuestions: [],
  practiceIndex: 0,
  practiceRight: 0,
  practiceModeKey: "",
  practiceLabel: "",

  onLoad(options: Record<string, string | undefined>) {
    this.refreshDeviceInfo();
    this.requestedKind = (options && options.kind) || "";
    this.loadPurchasedAgent();
  },

  refreshDeviceInfo() {
    const deviceInfo = resolveDeviceInfo();

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
        readyMessage: hasMissingProductionConfig()
          ? MISSING_CONFIG_MESSAGE
          : (getLastLoginFailure() || "未读取到题库授权，请返回首页完成微信登录。")
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

    // 换课程要把上一门课没做完的练习彻底丢掉，否则「查看成绩」会读到旧队列。
    this.resetPracticeView();

    this.setData({
      isReady: true,
      kind,
      title: course.title,
      topics,
      currentTopic,
      selectedAction: "",
      showErrorBook: false,
      // 早先版本不去重，云端可能残留同一题的重复记录，进课时先收敛一次。
      errorList: dedupeWrongQuestions(snapshot.wrongQuestions),
      rightNum: snapshot.stats.rightNum,
      wrongNum: snapshot.stats.wrongNum,
      totalNum: snapshot.stats.totalNum,
      rateText: formatRateText(snapshot.stats.rightNum, snapshot.stats.totalNum)
    });
    this.updateComputedViewState();
  },

  topicName(topicKey: string): string {
    const topic = this.data.topics.find(item => item.key === topicKey);
    return topic ? topic.name : topicKey;
  },

  switchTopic(event: MiniProgramTapEvent<{ topic?: string }>) {
    const currentTopic = event.currentTarget.dataset.topic;
    if (!currentTopic) return;

    this.resetPracticeView();
    this.setData({
      currentTopic,
      showErrorBook: false
    });
    this.updateComputedViewState();
  },

  chooseCount(event: MiniProgramTapEvent<{ count?: string | number }>) {
    const count = Number(event.currentTarget.dataset.count);
    if (QUESTION_COUNTS.indexOf(count) < 0) return;

    this.setData({ questionCount: count });
  },

  startPracticeByMode(event: MiniProgramTapEvent<{ mode?: string }>) {
    const mode = event.currentTarget.dataset.mode || "";
    if (!PRACTICE_PRESETS[mode]) return;

    this.startPractice(mode);
  },

  startPractice(modeKey: string) {
    const preset = PRACTICE_PRESETS[modeKey];
    if (!preset) return;

    const topicKeys = preset.scope === "topic"
      ? (this.data.currentTopic ? [this.data.currentTopic] : [])
      : this.data.topics.map(topic => topic.key);

    this.launchPractice(
      modeKey,
      [{ type: preset.type, count: this.data.questionCount, label: TYPE_LABELS[preset.type] }],
      topicKeys,
      preset.label
    );
  },

  startExam() {
    this.launchPractice(
      "exam",
      EXAM_SECTIONS,
      this.data.topics.map(topic => topic.key),
      "试卷练习"
    );
  },

  launchPractice(modeKey: string, sections: PracticeSection[], topicKeys: string[], label: string) {
    const { questions, shortfall } = buildPracticeQueue(
      this.bank,
      topicKeys,
      sections,
      topicKey => this.topicName(topicKey)
    );

    if (!questions.length) {
      wx.showToast({
        title: "该范围内暂无这种题型",
        icon: "none"
      });
      return;
    }

    this.practiceQuestions = questions;
    this.practiceIndex = 0;
    this.practiceRight = 0;
    this.practiceModeKey = modeKey;
    this.practiceLabel = label;

    this.setData({
      selectedAction: modeKey,
      showErrorBook: false,
      showSummary: false,
      practiceActive: true
    });
    this.showQuestion(questions[0]);

    // 抽不满时显式告知用户，避免误以为整份卷子是完整的。
    if (shortfall.length) {
      wx.showToast({
        title: `题库不足：${shortfall.join("，")}`,
        icon: "none",
        duration: 3000
      });
    }
  },

  nextPracticeQuestion() {
    if (!this.data.practiceActive || !this.data.answered) return;

    const nextIndex = this.practiceIndex + 1;
    if (nextIndex >= this.practiceQuestions.length) {
      this.finishPractice();
      return;
    }

    this.practiceIndex = nextIndex;
    this.showQuestion(this.practiceQuestions[nextIndex]);
  },

  finishPractice() {
    const total = this.practiceQuestions.length;
    const right = this.practiceRight;

    this.setData({
      practiceActive: false,
      showSummary: true,
      showErrorBook: false,
      currentQuestion: null,
      selectedAnswer: "",
      fillAnswer: "",
      answered: false,
      isCorrect: false,
      explanation: "",
      analysisClass: "analysis",
      analysisTitle: "",
      summaryTitle: `${this.practiceLabel}完成`,
      summaryRight: right,
      summaryTotal: total,
      summaryWrong: Math.max(0, total - right),
      summaryRateText: formatRateText(right, total)
    });
    this.updateComputedViewState();
  },

  retryPractice() {
    if (this.practiceModeKey === "exam") {
      this.startExam();
      return;
    }

    if (PRACTICE_PRESETS[this.practiceModeKey]) {
      this.startPractice(this.practiceModeKey);
      return;
    }

    this.closeSummary();
  },

  closeSummary() {
    this.resetPracticeView();
    this.updateComputedViewState();
  },

  // 把「正在进行的练习」整体清掉：换课程、换专题、重置、看完成绩都走这里，避免残留队列。
  // 刻意不动 selectedAction——换专题或看完成绩后，当前练习方式的高亮与专题选择卡片应当还在，
  // 用户不必为了再练一次重新点一遍出题按钮。换课程时由 loadCourse 显式清空。
  resetPracticeView() {
    this.practiceQuestions = [];
    this.practiceIndex = 0;
    this.practiceRight = 0;
    this.practiceModeKey = "";
    this.practiceLabel = "";

    this.setData({
      practiceActive: false,
      practiceProgressText: "",
      nextButtonText: "下一题",
      showSummary: false,
      currentQuestion: null,
      selectedAnswer: "",
      correctAnswer: "",
      fillAnswer: "",
      explanation: "",
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false
    });
  },

  // 重置会连同云端记录一起清掉，属于不可恢复操作，先让用户确认一次。
  resetStats() {
    const wrongCount = this.data.errorList.length;
    wx.showModal({
      title: "重置练习数据",
      content: `将清空《${this.data.title}》的答题统计、专题进度与 ${wrongCount} 道错题记录，且无法恢复。确定继续？`,
      confirmText: "重置",
      confirmColor: "#b42318",
      success: result => {
        if (result.confirm) this.applyReset();
      }
    });
  },

  applyReset() {
    const topicDone: Record<string, number> = {};
    this.data.topics.forEach(topic => {
      topicDone[topic.key] = 0;
    });
    this.topicDone = topicDone;

    this.resetPracticeView();
    this.setData({
      rightNum: 0,
      wrongNum: 0,
      totalNum: 0,
      rateText: "0%",
      errorList: [],
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
      showSummary: false,
      currentQuestion: null,
      selectedAction: "errors"
    });
    this.updateComputedViewState();
  },

  // 占位入口（真题练习）：先把位置占住，别让一整行少一格；接了题库后换成真实出题逻辑。
  showPendingMode() {
    wx.showToast({
      title: "真题练习正在准备中",
      icon: "none"
    });
  },

  exportPaper() {
    if (!this.practiceQuestions.length) {
      wx.showToast({ title: "请先开始一次练习", icon: "none" });
      return;
    }

    const label = this.practiceModeKey === "exam" ? "试卷" : "练习";
    const text = [
      `《${this.data.title}》${label}`,
      `共 ${this.practiceQuestions.length} 题`,
      "",
      ...this.practiceQuestions.map((question, index) => {
        const options = question.options.map(option => `(${option.value})${option.text}`).join(" ");
        return `${index + 1}. ${question.question}${options ? `\n${options}` : ""}`;
      })
    ].join("\n");
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "试卷已复制", icon: "success" })
    });
  },

  // 错题本导出：写成 Markdown 语法的 .txt 落到小程序用户目录，再唤起微信的「发送文件」面板，
  // 用户在那里选「文件传输助手」就能把文件存进自己的微信。
  buildErrorBookMarkdown(): string {
    const topicNames = new Map(this.data.topics.map(topic => [topic.key, topic.name] as [string, string]));
    const lines = [
      `# 《${this.data.title}》错题本`,
      "",
      `- 导出时间：${formatExportTime(new Date())}`,
      `- 错题数量：${this.data.errorList.length} 题`,
      ""
    ];

    this.data.errorList.forEach((item, index) => {
      lines.push(`## ${index + 1}. ${topicNames.get(item.topic) || item.topic || "未归类"}`);
      lines.push("");
      lines.push(item.question);
      lines.push("");
      lines.push(`**正确答案**：${item.answer}`);
      lines.push("");
      if (item.explain) {
        lines.push(`**解析**：${item.explain}`);
        lines.push("");
      }
    });

    // 最后一项已经补过空行，join 出来正好以换行收尾。
    return lines.join("\n");
  },

  exportErrors() {
    if (!this.data.errorList.length) {
      wx.showToast({ title: "当前还没有错题", icon: "none" });
      return;
    }

    const markdown = this.buildErrorBookMarkdown();
    const fileName = `错题本-${sanitizeFileName(this.data.title || this.data.kind)}.txt`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    const shareFileMessage = wx.shareFileMessage;

    if (typeof shareFileMessage !== "function") {
      this.copyErrorBook(markdown);
      return;
    }

    try {
      // 文件名固定按课程来，重复导出只覆盖同一个文件，不会在小程序目录里越堆越多。
      wx.getFileSystemManager().writeFileSync(filePath, markdown, "utf8");
    } catch {
      this.copyErrorBook(markdown);
      return;
    }

    shareFileMessage({
      filePath,
      fileName,
      success: () => wx.showToast({ title: "错题本已发送", icon: "success" }),
      fail: error => {
        // 用户自己取消转发不算失败，不用再塞一次剪贴板。
        if (String((error && error.errMsg) || "").indexOf("cancel") >= 0) return;
        this.copyErrorBook(markdown);
      }
    });
  },

  // 退路：老版本微信没有发送文件的接口，或写文件失败时，退回「复制 Markdown 到剪贴板」。
  copyErrorBook(markdown: string) {
    wx.setClipboardData({
      data: markdown,
      success: () => wx.showToast({ title: "已复制 Markdown 到剪贴板", icon: "none", duration: 2500 })
    });
  },

  showQuestion(question: QuizQuestion) {
    this.setData({
      currentQuestion: question,
      selectedAnswer: "",
      fillAnswer: "",
      correctAnswer: question.correctAnswer,
      explanation: resolveExplanation(question),
      analysisClass: "analysis",
      analysisTitle: "",
      answered: false,
      isCorrect: false,
      showErrorBook: false,
      showSummary: false
    });
    this.updateComputedViewState();
  },

  onFillInput(event: MiniProgramInputEvent) {
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

  answerQuestion(event: MiniProgramTapEvent<{ value?: string }>) {
    const selectedAnswer = event.currentTarget.dataset.value;
    if (!selectedAnswer) return;
    this.gradeAnswer(selectedAnswer);
  },

  gradeAnswer(selectedAnswer: string) {
    if (this.data.answered || !this.data.currentQuestion) return;

    const question = this.data.currentQuestion;
    const isCorrect = question.type === "fill"
      ? normalizeAnswerText(selectedAnswer) === normalizeAnswerText(String(this.data.correctAnswer))
      : selectedAnswer === this.data.correctAnswer;

    const rightNum = this.data.rightNum + (isCorrect ? 1 : 0);
    const wrongNum = this.data.wrongNum + (isCorrect ? 0 : 1);
    const totalNum = this.data.totalNum + 1;
    const rateText = formatRateText(rightNum, totalNum);
    const topic = question.topic;

    this.topicDone[topic] = (this.topicDone[topic] || 0) + 1;
    if (isCorrect) this.practiceRight += 1;

    const newError: ErrorItem = {
      // 题目 id 自带时间戳与随机后缀，拿它当错题 id 既唯一又不用再拼一次。
      id: question.id,
      agent: this.data.kind,
      topic,
      question: question.question,
      answer: describeCorrectAnswer(question, this.data.correctAnswer),
      explain: this.data.explanation,
      createdAt: Date.now()
    };
    // 同一道题答错多次只留最新一条，否则错题本会被同一题刷屏。
    const errorList = isCorrect
      ? this.data.errorList
      : upsertWrongQuestion(this.data.errorList, newError);

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
      analysisTitle: `${isCorrect ? "回答正确" : "回答错误"} · 正确答案：${newError.answer}`
    });
    this.updateComputedViewState();
    this.persistQuizSnapshot(errorList, { rightNum, wrongNum, totalNum });
  },

  // 按列表下标删，而不是按 id：云端存量记录早先用 Date.now() 当 id，理论上可能撞号，
  // 按 id 过滤会一次删掉两条。下标在渲染时由 wx:for 提供，天然唯一。
  removeErrorItem(event: MiniProgramTapEvent<{ index?: string | number }>) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.errorList.length) return;

    const errorList = this.data.errorList.slice();
    errorList.splice(index, 1);

    this.setData({
      errorList,
      hasNoErrors: errorList.length === 0
    });
    // 错题本按「整份列表」覆盖写回，删掉的那条自然就没了。
    this.persistQuizSnapshot(errorList, {
      rightNum: this.data.rightNum,
      wrongNum: this.data.wrongNum,
      totalNum: this.data.totalNum
    });
  },

  persistQuizSnapshot(errorList: ErrorItem[], stats: AnswerStats) {
    void saveQuizSnapshot(this.wechatOpenId, this.data.kind, {
      stats,
      topicDone: this.topicDone,
      wrongQuestions: errorList
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

    const practiceTotal = this.practiceQuestions.length;
    const isLastQuestion = this.practiceIndex + 1 >= practiceTotal;

    this.setData({
      topics,
      currentQuestion,
      hasNoErrors: this.data.errorList.length === 0,
      showTopicPicker: TOPIC_SCOPED_ACTIONS.includes(this.data.selectedAction),
      practiceProgressText: this.data.practiceActive && practiceTotal
        ? `${Math.min(this.practiceIndex + 1, practiceTotal)}/${practiceTotal}`
        : "",
      nextButtonText: isLastQuestion ? "查看成绩" : "下一题"
    });
  }
});
