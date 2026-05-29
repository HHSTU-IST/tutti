export {};

import { RuntimeDeviceInfo, formatRuntimePlatform, getRuntimeDeviceInfo } from "../../services/device";
import { UserSession, resolveUserSession } from "../../services/purchase";

type LoginState = "idle" | "loading" | "ready" | "denied";

interface IndexData {
  loginState: LoginState;
  wechatIdText: string;
  wechatIdDisplay: string;
  unlockedCount: number;
  platformClass: string;
  platformText: string;
  isHarmonyOS: boolean;
  statusText: string;
  isLoading: boolean;
  canEnter: boolean;
}

interface IndexPageInstance {
  refreshDeviceInfo(): void;
  handleWechatLogin(): Promise<void>;
  enterQuiz(): void;
}

const DEFAULT_DEVICE_INFO = getRuntimeDeviceInfo();

Page<IndexData, IndexPageInstance>({
  data: {
    loginState: "idle",
    wechatIdText: "",
    wechatIdDisplay: "未读取",
    unlockedCount: 0,
    platformClass: DEFAULT_DEVICE_INFO.platformClass,
    platformText: formatRuntimePlatform(DEFAULT_DEVICE_INFO),
    isHarmonyOS: DEFAULT_DEVICE_INFO.isHarmonyOS,
    statusText: "微信登录后自动读取购买状态",
    isLoading: false,
    canEnter: false
  },

  onLoad() {
    this.refreshDeviceInfo();
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
      isLoading: true,
      canEnter: false
    });

    const session = await resolveUserSession();
    if (!session) {
      this.setData({
        loginState: "denied",
        wechatIdText: "",
        wechatIdDisplay: "未读取",
        unlockedCount: 0,
        statusText: "未读取到可用授权",
        isLoading: false,
        canEnter: false
      });
      return;
    }

    const wechatIdText = maskWechatId(session.wechatOpenId);
    this.setData({
      loginState: "ready",
      wechatIdText,
      wechatIdDisplay: wechatIdText || "未读取",
      unlockedCount: countUnlockedAgents(session),
      statusText: "已完成微信登录",
      isLoading: false,
      canEnter: true
    });
  },

  enterQuiz() {
    if (!this.data.canEnter) return;

    wx.navigateTo({
      url: "/pages/quiz/quiz"
    });
  }
});

function countUnlockedAgents(session: UserSession): number {
  return Object.keys(session.agents).filter(key => session.agents[key] === true).length;
}

function maskWechatId(openId: string): string {
  if (openId.length <= 8) return openId;
  return `${openId.slice(0, 4)}****${openId.slice(-4)}`;
}