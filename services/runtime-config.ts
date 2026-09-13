export interface RuntimeConfig {
  wechatLoginApiUrl: string;
  enableLocalWechatTestLogin: boolean;
  enableCloudDatabase: boolean;
  /** 微信云开发环境 ID；留空走默认环境，多环境部署时填入以免连错云数据库。 */
  cloudEnv: string;
}

const DEVELOPMENT_RUNTIME_CONFIG: RuntimeConfig = {
  wechatLoginApiUrl: "",
  enableLocalWechatTestLogin: true,
  enableCloudDatabase: false,
  cloudEnv: ""
};

const PRODUCTION_RUNTIME_CONFIG: RuntimeConfig = {
  // 发布前必须填 wechatLoginApiUrl（HTTPS），否则生产环境无法完成微信登录授权。
  wechatLoginApiUrl: "",
  enableLocalWechatTestLogin: false,
  enableCloudDatabase: true,
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
 * wechatLoginApiUrl 是硬性必需项：为空时生产环境拿不到会话，首页所有课程置灰。
 */
export function findMissingProductionConfig(): string[] {
  if (!IS_PRODUCTION_RUNTIME) return [];

  const missing: string[] = [];
  if (!RUNTIME_CONFIG.wechatLoginApiUrl) {
    missing.push("wechatLoginApiUrl（生产登录授权接口，必须填写）");
  } else if (!/^https:\/\//i.test(RUNTIME_CONFIG.wechatLoginApiUrl)) {
    missing.push("wechatLoginApiUrl（必须为 HTTPS）");
  }
  return missing;
}
