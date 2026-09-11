export { };

import { RuntimeDeviceInfo, formatRuntimePlatform, getRuntimeDeviceInfo } from "../../services/device";
import { UserSession, resolveUserSession, restoreUserSession } from "../../services/purchase";
import { CourseOption, listAgentCourses } from "../../services/registry";

type LoginState = "idle" | "loading" | "ready" | "denied";

interface CourseCard extends CourseOption {
  unlocked: boolean;
  cardClass: string;
  actionText: string;
}

interface IndexData {
  loginState: LoginState;
  wechatIdText: string;
  wechatIdDisplay: string;
  unlockedCount: number;
  courseList: CourseCard[];
  platformClass: string;
  platformText: string;
  isHarmonyOS: boolean;
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
    wechatIdText: "",
    wechatIdDisplay: "未读取",
    unlockedCount: 0,
    courseList: [],
    platformClass: DEFAULT_DEVICE_INFO.platformClass,
    platformText: formatRuntimePlatform(DEFAULT_DEVICE_INFO),
    isHarmonyOS: DEFAULT_DEVICE_INFO.isHarmonyOS,
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
    const app = getApp<{ globalData?: { deviceInfo?: RuntimeDeviceInfo } }>();
    const deviceInfo = (app.globalData && app.globalData.deviceInfo) || getRuntimeDeviceInfo();

    this.setData({
      platformClass: deviceInfo.platformClass,
      platformText: formatRuntimePlatform(deviceInfo),
      isHarmonyOS: deviceInfo.isHarmonyOS
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
        wechatIdText: "",
        wechatIdDisplay: "未读取",
        unlockedCount: 0,
        courseList: buildCourseCards(null),
        statusText: "未读取到可用授权",
        isLoading: false
      });
      return;
    }

    this.applySession(session);
  },

  applySession(session: UserSession) {
    const wechatIdText = maskWechatId(session.wechatOpenId);
    const courseList = buildCourseCards(session);
    const unlockedCount = courseList.filter(course => course.unlocked).length;

    this.setData({
      loginState: "ready",
      wechatIdText,
      wechatIdDisplay: wechatIdText || "未读取",
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
