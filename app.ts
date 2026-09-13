export { };

import { RuntimeDeviceInfo, getRuntimeDeviceInfo } from "./services/device";
import { RUNTIME_CONFIG, findMissingProductionConfig } from "./services/runtime-config";

export interface AppGlobalData {
  appName: string;
  deviceInfo: RuntimeDeviceInfo;
}

const globalData: AppGlobalData = {
  appName: "刷题助手",
  deviceInfo: getRuntimeDeviceInfo()
};

App<{ globalData: AppGlobalData }>({
  onLaunch() {
    globalData.deviceInfo = getRuntimeDeviceInfo();

    if (wx.cloud && RUNTIME_CONFIG.enableCloudDatabase) {
      // 未配置 cloudEnv 时走默认云环境；多环境部署需在 runtime-config.ts 填 cloudEnv。
      wx.cloud.init(RUNTIME_CONFIG.cloudEnv
        ? { traceUser: true, env: RUNTIME_CONFIG.cloudEnv }
        : { traceUser: true });
    }

    // 生产配置缺失时给出明确告警，避免「未读取到可用授权」被误判为后台故障。
    const missing = findMissingProductionConfig();
    if (missing.length) {
      console.error(
        `[tutti] 生产配置缺失：${missing.join("、")}。请补全 services/runtime-config.ts 后再发布。`
      );
    }
  },

  globalData
});
