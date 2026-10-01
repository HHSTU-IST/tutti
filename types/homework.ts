/**
 * 小程序端作业上传的类型定义。
 *
 * 网页版的规则与记录存在服务端的 `TUTTI_DATA_DIR` 里，小程序拿不到（也不该依赖备案域名），
 * 所以这里是同一套结构的第二处定义；两边的一致性由 `scripts/miniprogram-homework.test.cjs` 锁住。
 */

/** 上传规则：与网页端 `web/lib/upload-rules.cjs` 的 `DEFAULT_RULES` 同结构。 */
export interface UploadRules {
  /** 允许的扩展名，统一带点、小写，例如 `.pdf`。 */
  allowedExtensions: string[];
  /** 单个文件大小上限（MB）。 */
  maxSizeMb: number;
  /** 文件名必须匹配的正则（字符串形式，便于写进配置）。 */
  filenamePattern: string;
  /** 命名说明：不匹配时原样提示给学员。 */
  filenameHint: string;
}

/** 本地上传前校验的结果；`safeName` 是去掉路径分隔符后的落盘文件名。 */
export interface UploadCheckResult {
  ok: boolean;
  error: string;
  extension: string;
  safeName: string;
}

/** 上传记录：云数据库集合 `homework_uploads` 的元素结构。 */
export interface HomeworkUploadRecord {
  /** 云数据库文档 id，删除记录时要用。 */
  _id?: string;
  courseId: string;
  /** 上传者，与 `user_profiles.wechatOpenId` 同源，用于「只看自己的记录」。 */
  wechatOpenId: string;
  originalName: string;
  /** 云存储里的文件名，前缀时间戳与随机串，避免同名覆盖。 */
  storedName: string;
  /** 云存储 fileID，只在删除文件时用，不展示给用户。 */
  fileID: string;
  sizeBytes: number;
  /** ISO 字符串，与网页端的 `uploadedAt` 保持一致。 */
  uploadedAt: string;
}
