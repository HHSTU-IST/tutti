declare function require<T = any>(path: string): T;

declare function App<T extends object>(options: T & {
  onLaunch?(): void;
}): void;

declare function getApp<T extends object = { globalData?: Record<string, unknown> }>(): T;

interface MiniProgramTapEvent<TDataset extends Record<string, unknown> = Record<string, unknown>> {
  currentTarget: {
    dataset: TDataset;
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
    onShow?(): void;
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
  function navigateTo(options: { url: string }): void;
  function redirectTo(options: { url: string }): void;
  function setNavigationBarTitle(options: { title: string }): void;
  function showToast(options: {
    title: string;
    icon?: "success" | "loading" | "none";
    duration?: number;
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
  }

  interface CloudDatabase {
    collection(name: string): CloudCollection;
  }

  interface CloudCollection {
    add(options: { data: Record<string, unknown> }): Promise<unknown>;
    where(condition: Record<string, unknown>): CloudQuery;
  }

  interface CloudQuery {
    limit(value: number): CloudQuery;
    get(): Promise<{ data: unknown[] }>;
    update(options: { data: Record<string, unknown> }): Promise<unknown>;
  }
}
