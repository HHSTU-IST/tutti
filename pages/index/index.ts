import { formatRuntimePlatform, getRuntimeDeviceInfo, resolveDeviceInfo } from "../../services/device";
import { isHomeworkUploadEnabled } from "../../services/homework";
import {
  UserSession,
  clearUserSession,
  getLastLoginFailure,
  resolveUserSession,
  restoreUserSession
} from "../../services/purchase";
import { CourseOption, listAgentCourses } from "../../services/registry";
import { MISSING_CONFIG_MESSAGE, hasMissingProductionConfig } from "../../services/runtime-config";

type LoginState = "idle" | "loading" | "ready" | "denied";

interface CourseCard extends CourseOption {
  unlocked: boolean;
  cardClass: string;
  actionText: string;
  /** 已开通且小程序开着作业上传时才显示入口。 */
  showHomework: boolean;
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
  loginButtonText: string;
  showLogout: boolean;
}

interface IndexPageInstance {
  refreshDeviceInfo(): void;
  handleWechatLogin(): Promise<void>;
  handleLogout(): void;
  applySession(session: UserSession): void;
  resetToLoggedOut(): void;
  enterCourse(event: MiniProgramTapEvent<{ kind?: string }>): void;
  openHomework(event: MiniProgramTapEvent<{ kind?: string }>): void;
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
    isLoading: false,
    loginButtonText: "微信登录",
    showLogout: false
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

  // 「微信登录」与「刷新授权」是同一件事：重新走一遍登录，把后台最新的 agents 拉下来。
  // 管理员刚开通某门课时，学员点这个按钮即可，不必卸载重进。
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
        isLoading: false,
        loginButtonText: "重新登录",
        showLogout: false
      });
      return;
    }

    this.applySession(session);
  },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后会清除本机缓存的登录状态，下次进入需重新微信登录才能读取课程授权。确定退出？",
      confirmText: "退出",
      success: result => {
        if (!result.confirm) return;

        clearUserSession();
        this.resetToLoggedOut();
      }
    });
  },

  resetToLoggedOut() {
    this.setData({
      loginState: "idle",
      wechatIdDisplay: "未读取",
      unlockedCount: 0,
      courseList: buildCourseCards(null),
      statusText: "微信登录后自动读取购买状态",
      isLoading: false,
      loginButtonText: "微信登录",
      showLogout: false
    });
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
      isLoading: false,
      loginButtonText: "刷新授权",
      showLogout: true
    });
  },

  enterCourse(event: MiniProgramTapEvent<{ kind?: string }>) {
    const kind = event.currentTarget.dataset.kind;
    if (!kind) return;

    const course = this.data.courseList.find(item => item.id === kind);
    if (!course || !course.unlocked) {
      const title = course ? course.title : kind;
      wx.showToast({
        title: `「${title}」尚未开通，请联系管理员`,
        icon: "none",
        duration: 2500
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/quiz/quiz?kind=${kind}`
    });
  },

  // 作业入口挂在课程卡片里，用 catchtap 拦住冒泡，别顺带把「进入练习」也触发了。
  openHomework(event: MiniProgramTapEvent<{ kind?: string }>) {
    const kind = event.currentTarget.dataset.kind;
    if (!kind) return;

    wx.navigateTo({
      url: `/pages/homework/homework?kind=${kind}`
    });
  }
});

// 全部课程都内置在同一小程序里，是否可进入只取决于后台返回的授权。
function buildCourseCards(session: UserSession | null): CourseCard[] {
  const homeworkEnabled = isHomeworkUploadEnabled();

  return listAgentCourses().map(course => {
    const unlocked = Boolean(session && session.agents[course.id] === true);

    return {
      ...course,
      unlocked,
      cardClass: unlocked ? "course-card unlocked" : "course-card locked",
      actionText: unlocked ? "进入练习" : "未开通",
      showHomework: unlocked && homeworkEnabled
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
