import type { UploadCheckResult, UploadRules } from "../types/homework";

/**
 * 小程序侧的默认上传规则。
 *
 * 网页端的规则由管理员在课程页改、存在服务端的运行数据目录里；小程序读不到那个文件，也不该
 * 为此申请备案域名，所以这里保留一份同值副本。两边必须一致：`scripts/miniprogram-homework.test.cjs`
 * 会比对扩展名、大小上限与正则来源，改漂了会失败。
 */
export function defaultUploadRules(): UploadRules {
  return {
    allowedExtensions: [".pdf", ".docx"],
    maxSizeMb: 10,
    filenamePattern: "^[^_\\\\/]+_[^_\\\\/]+_[a-z]{2}\\.(?:pdf|docx)$",
    filenameHint: "学号_姓名_课程代码，例如 2023010101_张三_py.pdf"
  };
}

/** 界面展示用的规则文案；规则本身仍是 `UploadRules`，这里只做拼接。 */
export function describeUploadRules(rules: UploadRules): {
  extensionsText: string;
  maxSizeText: string;
  filenameHint: string;
} {
  return {
    extensionsText: rules.allowedExtensions.join("、"),
    maxSizeText: `${rules.maxSizeMb} MB`,
    filenameHint: rules.filenameHint
  };
}

/**
 * 上传前先在本机校验：报错要具体到「哪种格式不允许 / 文件名该怎么写」，而不是笼统的「上传失败」。
 *
 * 网页端这道校验在服务端（改前端绕不过）；小程序是直传云存储，客户端这道就是唯一一道，
 * 所以规则与文案都跟 `web/lib/upload-rules.cjs` 的 `checkFile` 保持一致。
 */
export function checkHomeworkFile(fileName: string, sizeBytes: number, rules: UploadRules): UploadCheckResult {
  const name = String(fileName || "");
  const base = name.split(/[\\/]/).pop() || "";

  // 只接受纯文件名：挡掉 ../ 与带目录的写法。
  if (!base || base !== name || base === "." || base === "..") {
    return { ok: false, error: "文件名不合法", extension: "", safeName: "" };
  }

  // 用 lastIndexOf 而不是 path.extname：小程序里没有 path 模块，且两者的边界行为要一致
  // （`.pdf` 这种「只有扩展名」的名字算无扩展名）。
  const dotIndex = base.lastIndexOf(".");
  const extension = dotIndex > 0 ? base.slice(dotIndex).toLowerCase() : "";

  if (rules.allowedExtensions.indexOf(extension) < 0) {
    return {
      ok: false,
      error: `不支持的文件格式 ${extension || "（无扩展名）"}，仅允许 ${rules.allowedExtensions.join("、")}`,
      extension,
      safeName: base
    };
  }

  const size = Number(sizeBytes) || 0;
  if (size > rules.maxSizeMb * 1024 * 1024) {
    return {
      ok: false,
      error: `文件超过 ${rules.maxSizeMb} MB 上限`,
      extension,
      safeName: base
    };
  }

  if (rules.filenamePattern && !new RegExp(rules.filenamePattern).test(base)) {
    return {
      ok: false,
      error: rules.filenameHint ? `文件名不符合要求：${rules.filenameHint}` : "文件名不符合要求",
      extension,
      safeName: base
    };
  }

  return {
    ok: true,
    error: "",
    extension,
    // 落进云存储前把非法字符换成下划线，避免存储路径里出现奇怪字符。
    safeName: base.replace(/[\\/:*?"<>|\s]+/g, "_")
  };
}

/** 文件大小的可读文本，与网页端列表里的写法保持一致（1 MB 以上用 MB）。 */
export function describeFileSize(sizeBytes: number): string {
  const size = Number(sizeBytes) || 0;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
