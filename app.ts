export { };

import { RuntimeDeviceInfo, getRuntimeDeviceInfo } from "./services/device";
import { RUNTIME_CONFIG } from "./services/runtime-config";

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
      wx.cloud.init({
        traceUser: true
      });
    }
  },

  globalData
});
