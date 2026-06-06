export type RuntimePlatform = "harmonyos" | "ios" | "android" | "devtools" | "windows" | "mac" | "unknown";

export interface RuntimeDeviceInfo {
  platform: RuntimePlatform;
  rawPlatform: string;
  system: string;
  model: string;
  brand: string;
  isHarmonyOS: boolean;
  platformClass: string;
}

interface ReadableDeviceInfo {
  platform?: string;
  system?: string;
  model?: string;
  brand?: string;
}

export function getRuntimeDeviceInfo(): RuntimeDeviceInfo {
  const info = readDeviceInfo();
  const rawPlatform = info.platform || "";
  const system = info.system || "";
  const brand = info.brand || "";
  const model = info.model || "";
  const platform = normalizePlatform({ rawPlatform, system, brand });

  return {
    platform,
    rawPlatform,
    system,
    brand,
    model,
    isHarmonyOS: platform === "harmonyos",
    platformClass: `platform-${platform}`
  };
}

export function formatRuntimePlatform(info: RuntimeDeviceInfo): string {
  if (info.platform === "harmonyos") return "HarmonyOS";
  if (info.platform === "ios") return "iOS";
  if (info.platform === "android") return "Android";
  if (info.platform === "devtools") return "DevTools";
  if (info.platform === "windows") return "Windows";
  if (info.platform === "mac") return "macOS";

  return info.rawPlatform || info.system || "Unknown";
}

function readDeviceInfo(): ReadableDeviceInfo {
  const deviceApi = wx as unknown as {
    getDeviceInfo?: () => ReadableDeviceInfo;
    getSystemInfoSync?: () => ReadableDeviceInfo;
  };

  if (deviceApi.getDeviceInfo) {
    return deviceApi.getDeviceInfo();
  }

  if (deviceApi.getSystemInfoSync) {
    return deviceApi.getSystemInfoSync();
  }

  return {};
}

function normalizePlatform(info: { rawPlatform: string; system: string; brand: string }): RuntimePlatform {
  const value = `${info.rawPlatform} ${info.system} ${info.brand}`.toLowerCase();

  if (value.indexOf("harmony") >= 0 || value.indexOf("openharmony") >= 0 || value.indexOf("hmos") >= 0) {
    return "harmonyos";
  }

  if (value.indexOf("ios") >= 0 || value.indexOf("iphone") >= 0 || value.indexOf("ipad") >= 0) return "ios";
  if (value.indexOf("android") >= 0) return "android";
  if (value.indexOf("devtools") >= 0) return "devtools";
  if (value.indexOf("windows") >= 0) return "windows";
  if (value.indexOf("mac") >= 0) return "mac";

  return "unknown";
}
