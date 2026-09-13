import { formatRuntimePlatform, getRuntimeDeviceInfo, resolveDeviceInfo } from "../../services/device";
import { UserSession, getLastLoginFailure, resolveUserSession, restoreUserSession } from "../../services/purchase";
import { CourseOption, listAgentCourses } from "../../services/registry";
import { MISSING_CONFIG_MESSAGE, hasMissingProductionConfig } from "../../services/runtime-config";

type LoginState = "idle" | "loading" | "ready" | "denied";

interface CourseCard extends CourseOption {
  unlocked: boolean;
  cardClass: string;
  actionText: string;
}

interface IndexData {
  loginState: LoginState;
  wechatIdDisplay: string;
  unlockedCount: number;
  courseList: CourseCard[];
  platformClass: string;
  platformText: string;
  statusText: string;
  isLoading: boolean;
}

interface IndexPageInstance {
  refreshDeviceInfo(): void;
  handleWechatLogin(): Promise<void>;
  applySession(session: UserSession): void;
  enterCourse(event: MiniProgramTapEvent<{ kind?: string }>): void;
}

const DEFAULT_DEVICE_INFO = getRuntimeDeviceInfo();

Page<IndexData, IndexPageInstance>({
  data: {
    loginState: "idle",
    wechatIdDisplay: "未读取",
    unlockedCount: 0,
    courseList: [],
    platformClass: DEFAULT_DEVICE_INFO.platformClass,
    platformText: formatRuntimePlatform(DEFAULT_DEVICE_INFO),
    statusText: "微信登录后自动读取购买状态",
    isLoading: false
  },

  onLoad() {
    this.refreshDeviceInfo();
    const session = restoreUserSession();
    if (session) {
      this.applySession(session);
    }
  },

  refreshDeviceInfo() {
    const deviceInfo = resolveDeviceInfo();

    this.setData({
      platformClass: deviceInfo.platformClass,
      platformText: formatRuntimePlatform(deviceInfo)
    });
  },

  async handleWechatLogin() {
    if (this.data.loginState === "loading") return;

    this.setData({
      loginState: "loading",
      statusText: "正在通过微信登录校验",
      isLoading: true
    });

    const session = await resolveUserSession();
    if (!session) {
      this.setData({
        loginState: "denied",
        wechatIdDisplay: "未读取",
        unlockedCount: 0,
        courseList: buildCourseCards(null),
        statusText: buildDeniedStatusText(),
        isLoading: false
      });
      return;
    }

    this.applySession(session);
  },

  applySession(session: UserSession) {
    const courseList = buildCourseCards(session);
    const unlockedCount = courseList.filter(course => course.unlocked).length;

    this.setData({
      loginState: "ready",
      wechatIdDisplay: maskWechatId(session.wechatOpenId) || "未读取",
      unlockedCount,
      courseList,
      statusText: unlockedCount ? `已开通 ${unlockedCount} 个题库` : "暂未开通任何题库",
      isLoading: false
    });
  },

  enterCourse(event: MiniProgramTapEvent<{ kind?: string }>) {
    const kind = event.currentTarget.dataset.kind;
    if (!kind) return;

    const course = this.data.courseList.find(item => item.id === kind);
    if (!course || !course.unlocked) {
      wx.showToast({ title: "该课程尚未开通", icon: "none" });
      return;
    }

    wx.navigateTo({
      url: `/pages/quiz/quiz?kind=${kind}`
    });
  }
});

// 全部课程都内置在同一小程序里，是否可进入只取决于后台返回的授权。
function buildCourseCards(session: UserSession | null): CourseCard[] {
  return listAgentCourses().map(course => {
    const unlocked = Boolean(session && session.agents[course.id] === true);

    return {
      ...course,
      unlocked,
      cardClass: unlocked ? "course-card unlocked" : "course-card locked",
      actionText: unlocked ? "进入练习" : "未开通"
    };
  });
}

function maskWechatId(openId: string): string {
  if (openId.length <= 8) return openId;
  return `${openId.slice(0, 4)}****${openId.slice(-4)}`;
}

// 生产配置没填全、或登录云函数调用失败时，真机上看到的「未读取到可用授权」会被误判成故障，
// 这里换成能直接指向原因的话；具体缺哪项由 app.ts 与 purchase.ts 打到开发者工具 console。
function buildDeniedStatusText(): string {
  if (hasMissingProductionConfig()) return MISSING_CONFIG_MESSAGE;
  return getLastLoginFailure() || "未读取到可用授权";
}
