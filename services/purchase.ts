import { RUNTIME_CONFIG } from "./runtime-config";

export type AgentKind = string;
export type AgentAccessMap = Record<AgentKind, boolean>;

interface LoginResponse {
  openId?: string;
  wechatOpenId?: string;
  agents?: Partial<AgentAccessMap>;
}

export interface UserSession {
  agent: AgentKind;
  agents: AgentAccessMap;
  wechatOpenId: string;
}

const LOCAL_TEST_OPEN_ID_STORAGE_KEY = "local_wechat_test_openid";
const LAST_USER_SESSION_STORAGE_KEY = "last_user_session";
const LOCAL_TEST_OPEN_ID_PREFIX = "test-openid-";
// This file only supplies the agent key list; runtime defaults still start as false.
const DEFAULT_AGENT_ACCESS = require("../data/access") as AgentAccessMap;

export function getDefaultAgentAccess(): AgentAccessMap {
  return Object.keys(DEFAULT_AGENT_ACCESS).reduce<AgentAccessMap>((result, key) => {
    result[key] = false;
    return result;
  }, {});
}

export function resolveUserSession(availableAgents?: AgentKind[]): Promise<UserSession | null> {
  if (!RUNTIME_CONFIG.wechatLoginApiUrl && RUNTIME_CONFIG.enableLocalWechatTestLogin) {
    return loginWithWechat()
      .then(code => createLocalTestSession(code))
      .catch(() => createLocalTestSession(""))
      .then(session => finalizeSession(session, availableAgents));
  }

  if (!RUNTIME_CONFIG.wechatLoginApiUrl) {
    return Promise.resolve(getCachedSession(availableAgents));
  }

  return loginWithWechat()
    .then(code => requestLoginSession(code))
    .then(session => finalizeSession(session, availableAgents))
    .catch(() => getCachedSession(availableAgents));
}

function loginWithWechat(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) {
          resolve(result.code);
          return;
        }

        reject(new Error(result.errMsg || "微信登录失败"));
      },
      fail(error) {
        reject(new Error(error.errMsg || "微信登录失败"));
      }
    });
  });
}

function requestLoginSession(code: string): Promise<Omit<UserSession, "agent">> {
  return new Promise(resolve => {
    wx.request<LoginResponse>({
      url: RUNTIME_CONFIG.wechatLoginApiUrl,
      method: "POST",
      data: { code },
      success(response) {
        resolve({
          agents: mergeAgentAccess(response.data && response.data.agents),
          wechatOpenId: (response.data && (response.data.openId || response.data.wechatOpenId)) || ""
        });
      },
      fail() {
        resolve({
          agents: getDefaultAgentAccess(),
          wechatOpenId: ""
        });
      }
    });
  });
}

function createLocalTestSession(code: string): Promise<Omit<UserSession, "agent">> {
  return Promise.resolve({
    agents: getLocalTestAgentAccess(),
    wechatOpenId: getLocalTestOpenId(code)
  });
}

function finalizeSession(session: Omit<UserSession, "agent">, availableAgents?: AgentKind[]): UserSession | null {
  const agent = pickPurchasedAgent(session.agents, availableAgents);
  if (!agent || !session.wechatOpenId) return null;

  const userSession = {
    agent,
    agents: session.agents,
    wechatOpenId: session.wechatOpenId
  };
  cacheSession(userSession);
  return userSession;
}

function cacheSession(session: UserSession): void {
  try {
    wx.setStorageSync(LAST_USER_SESSION_STORAGE_KEY, session);
  } catch (error) {
    // Storage is best-effort; login should still succeed without it.
  }
}

function getCachedSession(availableAgents?: AgentKind[]): UserSession | null {
  try {
    const stored = wx.getStorageSync(LAST_USER_SESSION_STORAGE_KEY) as Partial<UserSession> | undefined;
    if (!stored || !stored.wechatOpenId || !stored.agents) return null;

    const agent = pickPurchasedAgent(stored.agents, availableAgents);
    return agent
      ? { agent, agents: stored.agents, wechatOpenId: stored.wechatOpenId }
      : null;
  } catch (error) {
    return null;
  }
}

function getLocalTestAgentAccess(): AgentAccessMap {
  return Object.keys(DEFAULT_AGENT_ACCESS).reduce<AgentAccessMap>((result, key) => {
    result[key] = DEFAULT_AGENT_ACCESS[key] === true;
    return result;
  }, {});
}

function getLocalTestOpenId(code: string): string {
  try {
    const stored = wx.getStorageSync(LOCAL_TEST_OPEN_ID_STORAGE_KEY);
    if (typeof stored === "string" && stored) return stored;

    const suffix = code.replace(/[^0-9a-z]/gi, "").slice(-16) || `${Date.now()}`;
    const openId = `${LOCAL_TEST_OPEN_ID_PREFIX}${suffix}`;
    wx.setStorageSync(LOCAL_TEST_OPEN_ID_STORAGE_KEY, openId);
    return openId;
  } catch (error) {
    return `${LOCAL_TEST_OPEN_ID_PREFIX}${Date.now()}`;
  }
}

function mergeAgentAccess(purchasedAccess?: Partial<AgentAccessMap>): AgentAccessMap {
  const access = getDefaultAgentAccess();
  if (!purchasedAccess) return access;

  Object.keys(purchasedAccess).forEach(key => {
    access[key] = purchasedAccess[key] === true;
  });

  return access;
}

function pickPurchasedAgent(access: AgentAccessMap, availableAgents: AgentKind[] = Object.keys(access)): AgentKind | null {
  return availableAgents.find(agent => access[agent] === true) || null;
}
