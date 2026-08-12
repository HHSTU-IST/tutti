export interface RuntimeConfig {
  wechatLoginApiUrl: string;
  enableLocalWechatTestLogin: boolean;
  enableCloudDatabase: boolean;
}

const DEVELOPMENT_RUNTIME_CONFIG: RuntimeConfig = {
  wechatLoginApiUrl: "",
  enableLocalWechatTestLogin: true,
  enableCloudDatabase: false
};

const PRODUCTION_RUNTIME_CONFIG: RuntimeConfig = {
  // Fill these for release builds.
  wechatLoginApiUrl: "",
  enableLocalWechatTestLogin: false,
  enableCloudDatabase: true
};

function resolveRuntimeConfig(): RuntimeConfig {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;
    if (envVersion === "release" || envVersion === "trial") {
      return PRODUCTION_RUNTIME_CONFIG;
    }
  } catch (error) {
    // Fall back to development profile when account info is unavailable.
  }

  return DEVELOPMENT_RUNTIME_CONFIG;
}

export const RUNTIME_CONFIG = resolveRuntimeConfig();
