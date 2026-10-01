export interface RuntimeConfig {
  /** 登录云函数名：生产用 wx.cloud.callFunction 取 openid，不需要自建后台，也不需要备案域名。 */
  loginFunctionName: string;
  enableLocalWechatTestLogin: boolean;
  enableCloudDatabase: boolean;
  /**
   * 作业上传开关：与 enableCloudDatabase 分开，因为作业还会占用云存储额度，
   * 两件事该能分别开关。关掉后首页与课程页都不再出现作业入口。
   */
  enableHomeworkUpload: boolean;
  /** 微信云开发环境 ID；留空走默认环境，多环境部署时填入以免连错云数据库。 */
  cloudEnv: string;
}

const DEVELOPMENT_RUNTIME_CONFIG: RuntimeConfig = {
  loginFunctionName: "login",
  enableLocalWechatTestLogin: true,
  enableCloudDatabase: false,
  // 本地没有云环境，传不上去，入口留着只会让人以为坏了。
  enableHomeworkUpload: false,
  cloudEnv: ""
};

const PRODUCTION_RUNTIME_CONFIG: RuntimeConfig = {
  // 登录与开通都走云开发：cloudfunctions/login 用 getWXContext() 取 openid，
  // 再按 user_profiles 里该用户的 agents 返回开通情况（管理员在云开发控制台把对应课程置 true）。
  loginFunctionName: "login",
  enableLocalWechatTestLogin: false,
  enableCloudDatabase: true,
  // 作业上传需要云存储：集合与存储权限要在云开发控制台建好，见部署清单。
  enableHomeworkUpload: true,
  // 多环境时填入云开发环境 ID；留空走默认环境。
  cloudEnv: ""
};

function resolveEnvVersion(): string {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion;
  } catch {
    // Account info unavailable (e.g. unit tests); treat as non-production.
    return "";
  }
}

const ENV_VERSION = resolveEnvVersion();

/** 当前是否运行在生产配置（release / trial）。 */
export const IS_PRODUCTION_RUNTIME = ENV_VERSION === "release" || ENV_VERSION === "trial";

export const RUNTIME_CONFIG = IS_PRODUCTION_RUNTIME
  ? PRODUCTION_RUNTIME_CONFIG
  : DEVELOPMENT_RUNTIME_CONFIG;

/**
 * 生产配置缺失必需项时返回缺失项清单，供启动时告警（开发环境始终返回空数组）。
 * 这三项任一不对，线上都拿不到会话：云函数与云数据库都要靠 enableCloudDatabase 初始化，
 * 本地测试授权开着则等于绕过付费。
 */
export function findMissingProductionConfig(): string[] {
  if (!IS_PRODUCTION_RUNTIME) return [];

  const missing: string[] = [];
  if (!RUNTIME_CONFIG.loginFunctionName) {
    missing.push("loginFunctionName（登录云函数名，必须填写）");
  }
  if (!RUNTIME_CONFIG.enableCloudDatabase) {
    missing.push("enableCloudDatabase（云函数与云数据库都靠它初始化，生产必须为 true）");
  }
  if (RUNTIME_CONFIG.enableLocalWechatTestLogin) {
    missing.push("enableLocalWechatTestLogin（生产必须为 false，否则等于绕过付费）");
  }
  return missing;
}

/** 真机上看不到 console，配置缺失时界面也得说清楚，文案只在这一处定义。 */
export const MISSING_CONFIG_MESSAGE = "生产配置缺失，请联系管理员（详见开发者工具日志）。";

export function hasMissingProductionConfig(): boolean {
  return findMissingProductionConfig().length > 0;
}

/**
 * 生产配置的「建议项」：不影响能否跑通，但漏了容易在真机上踩坑。
 * 多环境时 cloudEnv 留空会连上默认云环境，学员的答题记录就写到别处去了。
 */
export function findProductionConfigHints(): string[] {
  if (!IS_PRODUCTION_RUNTIME) return [];

  const hints: string[] = [];
  if (!RUNTIME_CONFIG.cloudEnv) {
    hints.push("cloudEnv（留空会连默认云环境，多环境部署请填环境 ID）");
  }
  return hints;
}
