import { resolveDeviceInfo } from "../../services/device";
import { getLastLoginFailure, resolveUserSession } from "../../services/purchase";
import { MISSING_CONFIG_MESSAGE, hasMissingProductionConfig } from "../../services/runtime-config";
import { getAgentCourse, getAvailableAgentIds } from "../../services/registry";
import {
  deleteHomeworkUpload,
  isHomeworkUploadEnabled,
  listHomeworkUploads,
  uploadHomeworkFile
} from "../../services/homework";
import {
  checkHomeworkFile,
  defaultUploadRules,
  describeFileSize,
  describeUploadRules
} from "../../services/upload-rules";
import type { HomeworkUploadRecord } from "../../types/homework";

/** 列表里一条记录：展示字段都在这儿拼好，wxml 只管摆位置。 */
interface UploadItem {
  id: string;
  name: string;
  sizeText: string;
  timeText: string;
}

interface HomeworkData {
  isReady: boolean;
  readyMessage: string;
  kind: string;
  title: string;
  platformClass: string;
  rulesText: string;
  filenameHint: string;
  uploading: boolean;
  uploads: UploadItem[];
  hasUploads: boolean;
}

interface HomeworkPageInstance {
  wechatOpenId: string;
  records: HomeworkUploadRecord[];
  refreshDeviceInfo(): void;
  loadCourse(kind: string): Promise<void>;
  reloadUploads(): Promise<void>;
  chooseHomeworkFile(): void;
  handleChosenFile(file: wx.TempFile): Promise<void>;
  removeUpload(event: MiniProgramTapEvent<{ index?: string | number }>): void;
  applyRemove(index: number): Promise<void>;
  back(): void;
}

const DEFAULT_DEVICE_INFO = resolveDeviceInfo();

Page<HomeworkData, HomeworkPageInstance>({
  data: {
    isReady: false,
    readyMessage: "正在读取题库授权...",
    kind: "",
    title: "",
    platformClass: DEFAULT_DEVICE_INFO.platformClass,
    rulesText: "",
    filenameHint: "",
    uploading: false,
    uploads: [],
    hasUploads: false
  },

  wechatOpenId: "",
  records: [],

  onLoad(options: Record<string, string | undefined>) {
    this.refreshDeviceInfo();
    void this.loadCourse((options && options.kind) || "");
  },

  refreshDeviceInfo() {
    this.setData({
      platformClass: resolveDeviceInfo().platformClass
    });
  },

  async loadCourse(kind: string) {
    // 开关先判：没开作业上传时，连授权都不用查，提示也更直接。
    if (!isHomeworkUploadEnabled()) {
      this.setData({
        isReady: false,
        readyMessage: "本小程序未开启作业上传，如需提交作业请联系管理员。"
      });
      return;
    }

    const session = await resolveUserSession(getAvailableAgentIds());
    if (!session) {
      this.setData({
        isReady: false,
        readyMessage: hasMissingProductionConfig()
          ? MISSING_CONFIG_MESSAGE
          : (getLastLoginFailure() || "未读取到题库授权，请返回首页完成微信登录。")
      });
      return;
    }

    // 与答题页同一道校验：URL 参数不能绕过首页进入未开通课程的作业区。
    const course = getAgentCourse(kind);
    if (!course || session.agents[kind] !== true) {
      this.setData({
        isReady: false,
        readyMessage: `「${course ? course.title : kind}」尚未开通，请返回课程列表选择已开通的题库。`
      });
      return;
    }

    this.wechatOpenId = session.wechatOpenId;
    wx.setNavigationBarTitle({ title: `${course.title} · 作业上传` });

    const described = describeUploadRules(defaultUploadRules());
    this.setData({
      isReady: true,
      kind,
      title: course.title,
      rulesText: `允许格式：${described.extensionsText} · 大小上限 ${described.maxSizeText}`,
      filenameHint: described.filenameHint
    });

    await this.reloadUploads();
  },

  async reloadUploads() {
    try {
      const records = await listHomeworkUploads(this.wechatOpenId, this.data.kind);
      this.records = records;
      this.setData({
        uploads: records.map(record => ({
          id: record._id || record.storedName,
          name: record.originalName,
          sizeText: describeFileSize(record.sizeBytes),
          timeText: formatUploadTime(record.uploadedAt)
        })),
        hasUploads: records.length > 0
      });
    } catch {
      this.records = [];
      this.setData({ uploads: [], hasUploads: false });
      wx.showToast({
        title: "上传记录读取失败",
        icon: "none"
      });
    }
  },

  // 小程序读不到手机文件系统，作业只能从聊天记录里选（先把文件发给文件传输助手）。
  chooseHomeworkFile() {
    if (this.data.uploading) return;

    wx.chooseMessageFile({
      count: 1,
      type: "file",
      success: result => {
        const file = result.tempFiles && result.tempFiles[0];
        if (file) void this.handleChosenFile(file);
      },
      fail: () => {
        // 用户在选文件面板上取消，不算失败，不用弹提示。
      }
    });
  },

  async handleChosenFile(file: wx.TempFile) {
    const check = checkHomeworkFile(file.name, file.size, defaultUploadRules());
    if (!check.ok) {
      // 规则不符是「能自己改」的错误，用弹窗说全，别用一闪而过的 toast。
      wx.showModal({
        title: "这份文件不能上传",
        content: check.error,
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }

    this.setData({ uploading: true });
    wx.showLoading({ title: "上传中", mask: true });

    try {
      await uploadHomeworkFile({
        courseId: this.data.kind,
        wechatOpenId: this.wechatOpenId,
        filePath: file.path,
        fileName: file.name,
        sizeBytes: file.size
      });
      wx.hideLoading();
      wx.showToast({ title: "上传成功", icon: "success" });
      await this.reloadUploads();
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: "上传失败",
        content: errorMessage(error, "上传失败，请检查网络后重试。"),
        showCancel: false,
        confirmText: "知道了"
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 删除不可恢复，先确认一次；按下标取记录，wxml 的 wx:for 天然唯一。
  removeUpload(event: MiniProgramTapEvent<{ index?: string | number }>) {
    const index = Number(event.currentTarget.dataset.index);
    const record = this.records[index];
    if (!record) return;

    wx.showModal({
      title: "删除这份作业",
      content: `将同时删掉云存储里的《${record.originalName}》，删除后无法恢复，需要重新上传。确定删除？`,
      confirmText: "删除",
      confirmColor: "#b42318",
      success: result => {
        if (result.confirm) void this.applyRemove(index);
      }
    });
  },

  async applyRemove(index: number) {
    const record = this.records[index];
    if (!record) return;

    wx.showLoading({ title: "删除中", mask: true });
    try {
      await deleteHomeworkUpload(record);
      wx.hideLoading();
      wx.showToast({ title: "已删除", icon: "success" });
      await this.reloadUploads();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: errorMessage(error, "删除失败，请稍后再试"),
        icon: "none",
        duration: 3000
      });
    }
  },

  back() {
    wx.navigateBack({ delta: 1 });
  }
});

/** 上传时间：ISO 字符串转「年-月-日 时:分」，解析不出来就原样显示。 */
function formatUploadTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 云开发与规则校验抛的都是带中文说明的 Error，取不到就退一句通用文案。 */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
