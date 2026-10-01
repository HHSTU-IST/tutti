import type { HomeworkUploadRecord } from "../types/homework";
import { RUNTIME_CONFIG } from "./runtime-config";
import { checkHomeworkFile, defaultUploadRules } from "./upload-rules";

/** 云数据库集合名：README 与 docs/development.md 里写的是同一个名字，改这里要三处同改。 */
const HOMEWORK_COLLECTION = "homework_uploads";
/** 云存储目录前缀：`homework/<课程>/<时间戳-随机串-安全文件名>`。 */
const HOMEWORK_FOLDER = "homework";
/** 一次最多列出多少条：学员自己的作业不会太多，超过这个数没必要一次全拉。 */
const LIST_LIMIT = 50;

/**
 * 作业上传是否开启。
 *
 * 单独一个开关而不是复用 enableCloudDatabase：云数据库只是同步答题记录，作业上传还会占用
 * 云存储额度，两件事该能分开关。开发配置里恒为 false（本地没有云环境，传不上去）。
 */
export function isHomeworkUploadEnabled(): boolean {
  return RUNTIME_CONFIG.enableHomeworkUpload === true;
}

/** 真的能传吗：开关打开，且当前基础库有云存储与云数据库接口。 */
export function canUseCloudStorage(): boolean {
  if (!isHomeworkUploadEnabled()) return false;
  // 老基础库上 wx.cloud 可能整个不存在，判一下，别让页面崩在 TypeError 上。
  if (!wx.cloud) return false;

  // 用 typeof 判而不是直接拿来当条件：函数在类型上是恒真的，写条件会被 TS2774 拦下。
  return typeof wx.cloud.uploadFile === "function" && typeof wx.cloud.database === "function";
}

export function homeworkCollectionName(): string {
  return HOMEWORK_COLLECTION;
}

/**
 * 上传一个作业文件：本机校验 → 传云存储 → 写记录。
 *
 * 任一步失败都抛错交给页面提示：规则不符时给的是具体原因（哪种格式不允许、文件名该怎么写），
 * 云存储失败时给的是云开发的 errMsg。
 */
export async function uploadHomeworkFile(input: {
  courseId: string;
  wechatOpenId: string;
  filePath: string;
  fileName: string;
  sizeBytes: number;
}): Promise<HomeworkUploadRecord> {
  if (!canUseCloudStorage()) throw new Error("当前未开启作业上传，请联系管理员");

  const check = checkHomeworkFile(input.fileName, input.sizeBytes, defaultUploadRules());
  if (!check.ok) throw new Error(check.error);

  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${check.safeName}`;
  const fileID = await uploadToCloud(`${HOMEWORK_FOLDER}/${input.courseId}/${storedName}`, input.filePath);
  const record: HomeworkUploadRecord = {
    courseId: input.courseId,
    wechatOpenId: input.wechatOpenId,
    originalName: check.safeName,
    storedName,
    fileID,
    sizeBytes: Number(input.sizeBytes) || 0,
    uploadedAt: new Date().toISOString()
  };

  const saved = await getCollection().add({ data: record as unknown as Record<string, unknown> });
  // 客户端 add 会回 _id，取回来给「删除」用；万一没拿到，上传本身仍然算成功。
  return Object.assign({}, record, { _id: (saved && saved._id) || "" });
}

/** 只列自己的记录：集合权限是「仅创建者可读写」，但查询条件里也写死 openid，双保险。 */
export async function listHomeworkUploads(wechatOpenId: string, courseId: string): Promise<HomeworkUploadRecord[]> {
  if (!canUseCloudStorage() || !wechatOpenId) return [];

  const result = await getCollection()
    .where({ wechatOpenId, courseId })
    .orderBy("uploadedAt", "desc")
    .limit(LIST_LIMIT)
    .get() as { data: HomeworkUploadRecord[] };

  return result.data || [];
}

/**
 * 删除一条上传：先删云存储文件，再删记录。
 *
 * 顺序不能反——反过来的话，记录没了、文件却还在云存储里，学员在界面上看不到了，
 * 管理员在控制台却还要手工清理。
 */
export async function deleteHomeworkUpload(record: HomeworkUploadRecord): Promise<void> {
  if (!canUseCloudStorage()) throw new Error("当前未开启作业上传，请联系管理员");
  if (!record._id) throw new Error("这条记录缺少文档 id，无法删除");

  if (record.fileID) await deleteCloudFiles([record.fileID]);
  await getCollection().doc(record._id).remove();
}

function uploadToCloud(cloudPath: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success(result) {
        if (result.fileID) {
          resolve(result.fileID);
          return;
        }

        reject(new Error("云存储没有返回 fileID"));
      },
      fail(error) {
        reject(new Error(error.errMsg || "上传到云存储失败"));
      }
    });
  });
}

function deleteCloudFiles(fileList: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.cloud.deleteFile({
      fileList,
      success() {
        resolve();
      },
      fail(error) {
        reject(new Error(error.errMsg || "删除云存储文件失败"));
      }
    });
  });
}

function getCollection() {
  return wx.cloud.database().collection(HOMEWORK_COLLECTION);
}
