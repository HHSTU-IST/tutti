declare function require<T = any>(path: string): T;

declare function App<T extends object>(options: T & {
  onLaunch?(): void;
  onShow?(options?: Record<string, unknown>): void;
  onHide?(): void;
  onError?(error: string): void;
}): void;

declare function getApp<T extends object = { globalData?: Record<string, unknown> }>(): T;

/** 点击类事件：页面上只需要 dataset（绑在 wxml 上的 data-*）。 */
interface MiniProgramTapEvent<TDataset extends Record<string, unknown> = Record<string, unknown>> {
  currentTarget: {
    dataset: TDataset;
  };
}

/** 输入类事件：`<input bindinput>`，值在 detail.value 里。 */
interface MiniProgramInputEvent {
  detail: {
    value: string;
  };
}

/** 变更类事件：`<switch bindchange>` / `<picker bindchange>`，值与数据类型随组件而定。 */
interface MiniProgramChangeEvent<TValue = string | number | boolean> {
  detail: {
    value: TValue;
  };
}

interface PageThis<TData> {
  data: TData;
  setData(data: Partial<TData>, callback?: () => void): void;
}

declare function Page<
  TData extends object,
  TCustom extends object = Record<string, never>
>(
  options: TCustom & {
    data: TData;
    onLoad?(options: Record<string, string | undefined>): void;
    onReady?(): void;
    onShow?(): void;
    onHide?(): void;
    onUnload?(): void;
    onPullDownRefresh?(): void;
    onReachBottom?(): void;
    onPageScroll?(options: { scrollTop: number }): void;
    onShareAppMessage?(options: { from?: "button" | "menu"; target?: unknown }): {
      title?: string;
      path?: string;
      imageUrl?: string;
    };
  } & ThisType<PageThis<TData> & TCustom>
): void;

declare namespace wx {
  interface GeneralCallbackResult {
    errMsg: string;
  }

  interface LoginSuccessCallbackResult extends GeneralCallbackResult {
    code: string;
  }

  interface RequestSuccessCallbackResult<T> {
    data: T;
    statusCode: number;
  }

  interface DeviceInfo {
    platform?: string;
    system?: string;
    model?: string;
    brand?: string;
  }

  interface AccountInfo {
    miniProgram: {
      envVersion: "develop" | "trial" | "release";
    };
  }

  function getDeviceInfo(): DeviceInfo;
  function getSystemInfoSync(): DeviceInfo;
  function getAccountInfoSync(): AccountInfo;
  function getStorageSync(key: string): unknown;
  function setStorageSync(key: string, data: unknown): void;
  function removeStorageSync(key: string): void;
  function navigateTo(options: { url: string }): void;
  function redirectTo(options: { url: string }): void;
  function navigateBack(options?: { delta?: number }): void;
  function setNavigationBarTitle(options: { title: string }): void;
  function showToast(options: {
    title: string;
    icon?: "success" | "loading" | "none";
    duration?: number;
  }): void;

  /** 加载提示：配合 hideLoading 用，mask 会挡住下面的点击，上传这类耗时操作要开着。 */
  function showLoading(options: { title: string; mask?: boolean }): void;
  function hideLoading(): void;

  interface ShowModalSuccessCallbackResult extends GeneralCallbackResult {
    confirm: boolean;
    cancel: boolean;
  }

  /** 确认弹窗：用于重置、退出登录这类不可随手撤销的操作。 */
  function showModal(options: {
    title?: string;
    content?: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    success?(result: ShowModalSuccessCallbackResult): void;
    fail?(error: GeneralCallbackResult): void;
    complete?(): void;
  }): void;

  function setClipboardData(options: {
    data: string;
    success?(): void;
    fail?(): void;
    complete?(): void;
  }): void;
  function login(options: {
    success?(result: LoginSuccessCallbackResult): void;
    fail?(error: GeneralCallbackResult): void;
  }): void;
  function request<T = unknown>(options: {
    url: string;
    method?: "GET" | "POST";
    data?: unknown;
    success?(response: RequestSuccessCallbackResult<T>): void;
    fail?(): void;
  }): void;

  interface TempFile {
    /** 临时文件路径，可直接喂给 wx.cloud.uploadFile。 */
    path: string;
    name: string;
    size: number;
    type?: string;
    time?: number;
  }

  interface ChooseMessageFileSuccessCallbackResult extends GeneralCallbackResult {
    tempFiles: TempFile[];
  }

  /**
   * 从聊天记录里选文件。小程序的沙箱读不到手机文件系统，作业只能这样选。
   * count 固定 1：一次传一份，规则校验与失败重试都更清楚。
   */
  function chooseMessageFile(options: {
    count?: number;
    type?: "all" | "video" | "image" | "file";
    extension?: string[];
    success?(result: ChooseMessageFileSuccessCallbackResult): void;
    fail?(error: GeneralCallbackResult): void;
    complete?(): void;
  }): void;

  interface FileSystemManager {
    writeFileSync(filePath: string, data: string, encoding?: string): void;
  }

  function getFileSystemManager(): FileSystemManager;

  /** 小程序用户目录：要转发给好友的文件必须放在这里。 */
  const env: {
    USER_DATA_PATH: string;
  };

  /**
   * 唤起「发送文件」面板，把文件转发给好友或文件传输助手。
   * 基础库低的客户端没有这个接口，所以声明成可选，调用前要判一下。
   */
  const shareFileMessage: ((options: {
    filePath: string;
    fileName?: string;
    success?(result: GeneralCallbackResult): void;
    fail?(error: GeneralCallbackResult): void;
    complete?(): void;
  }) => void) | undefined;

  namespace cloud {
    function init(options?: { env?: string; traceUser?: boolean }): void;
    function database(): CloudDatabase;
    /** 调云函数：登录用（getWXContext 取 openid），返回值在 success 的 result 里。 */
    function callFunction(options: {
      name: string;
      data?: unknown;
      success?(response: { result?: unknown; errMsg: string }): void;
      fail?(error: GeneralCallbackResult): void;
    }): void;

    interface UploadFileSuccessCallbackResult extends GeneralCallbackResult {
      fileID: string;
    }

    /** 传文件到云存储；cloudPath 是存储里的相对路径，同名会覆盖，所以上传前要拼上时间戳。 */
    function uploadFile(options: {
      cloudPath: string;
      filePath: string;
      success?(result: UploadFileSuccessCallbackResult): void;
      fail?(error: GeneralCallbackResult): void;
      complete?(): void;
    }): void;

    interface DeleteFileSuccessCallbackResult extends GeneralCallbackResult {
      fileList: Array<{ fileID: string; status: number; errMsg: string }>;
    }

    function deleteFile(options: {
      fileList: string[];
      success?(result: DeleteFileSuccessCallbackResult): void;
      fail?(error: GeneralCallbackResult): void;
      complete?(): void;
    }): void;
  }

  interface CloudDatabase {
    collection(name: string): CloudCollection;
    /** 云数据库的查询/更新指令（`_.gt()` 之类），本项目暂未用到，用到时在这里补。 */
    command: Record<string, unknown>;
  }

  interface CloudCollection {
    add(options: { data: Record<string, unknown> }): Promise<{ _id?: string }>;
    where(condition: Record<string, unknown>): CloudQuery;
    doc(id: string): CloudDocument;
  }

  interface CloudQuery {
    limit(value: number): CloudQuery;
    orderBy(field: string, order: "asc" | "desc"): CloudQuery;
    get(): Promise<{ data: unknown[] }>;
    update(options: { data: Record<string, unknown> }): Promise<unknown>;
  }

  interface CloudDocument {
    get(): Promise<{ data: unknown }>;
    update(options: { data: Record<string, unknown> }): Promise<unknown>;
    /** 客户端只有「按文档 id 删」这一种删法；批量删要写云函数（权限也只能改自己的）。 */
    remove(): Promise<unknown>;
  }
}
