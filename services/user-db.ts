import { AgentAccessMap, AgentKind } from "./purchase";
import { RUNTIME_CONFIG } from "./runtime-config";

export interface WrongQuestionRecord {
  id: string;
  agent: AgentKind;
  topic: string;
  question: string;
  answer: string;
  createdAt: number;
}

export interface AnswerStats {
  rightNum: number;
  wrongNum: number;
  totalNum: number;
}

export interface AgentProgress {
  topicDone: Record<string, number>;
}

export interface UserProfile {
  _id?: string;
  wechatOpenId: string;
  agents: AgentAccessMap;
  wrongQuestions: WrongQuestionRecord[];
  stats: Record<AgentKind, AnswerStats>;
  progress: Record<AgentKind, AgentProgress>;
  createdAt: number;
  updatedAt: number;
}

interface CollectionResult<T> {
  data: T[];
}

const USER_COLLECTION = "user_profiles";

export function createEmptyStats(): AnswerStats {
  return {
    rightNum: 0,
    wrongNum: 0,
    totalNum: 0
  };
}

export function createEmptyProgress(): AgentProgress {
  return {
    topicDone: {}
  };
}

export async function getOrCreateUserProfile(wechatOpenId: string, agents: AgentAccessMap): Promise<UserProfile | null> {
  if (!wechatOpenId || !canUseCloudDatabase()) return null;

  const exists = await getUserProfile(wechatOpenId);
  if (exists) {
    const updatedProfile = {
      ...exists,
      agents: { ...exists.agents, ...agents },
      updatedAt: Date.now()
    };
    await updateUserProfile(wechatOpenId, {
      agents: updatedProfile.agents,
      updatedAt: updatedProfile.updatedAt
    });
    return updatedProfile;
  }

  const now = Date.now();
  const profile: UserProfile = {
    wechatOpenId,
    agents,
    wrongQuestions: [],
    stats: {},
    progress: {},
    createdAt: now,
    updatedAt: now
  };

  await getCollection().add({ data: profile as unknown as Record<string, unknown> });
  return profile;
}

export async function saveQuizSnapshot(
  wechatOpenId: string,
  agent: AgentKind,
  snapshot: {
    stats: AnswerStats;
    topicDone: Record<string, number>;
    wrongQuestions: WrongQuestionRecord[];
  }
): Promise<void> {
  if (!wechatOpenId || !canUseCloudDatabase()) return;

  const profile = await getOrCreateUserProfile(wechatOpenId, {});
  if (!profile) return;

  const stats = {
    ...profile.stats,
    [agent]: snapshot.stats
  };
  const progress = {
    ...profile.progress,
    [agent]: { topicDone: snapshot.topicDone }
  };
  const wrongQuestions = profile.wrongQuestions
    .filter(item => item.agent !== agent)
    .concat(snapshot.wrongQuestions.map(item => ({ ...item, agent })));

  await updateUserProfile(wechatOpenId, {
    stats,
    progress,
    wrongQuestions,
    updatedAt: Date.now()
  });
}

export async function resetQuizSnapshot(wechatOpenId: string, agent: AgentKind): Promise<void> {
  if (!wechatOpenId || !canUseCloudDatabase()) return;

  const profile = await getOrCreateUserProfile(wechatOpenId, {});
  if (!profile) return;

  await updateUserProfile(wechatOpenId, {
    stats: {
      ...profile.stats,
      [agent]: createEmptyStats()
    },
    progress: {
      ...profile.progress,
      [agent]: createEmptyProgress()
    },
    wrongQuestions: profile.wrongQuestions.filter(item => item.agent !== agent),
    updatedAt: Date.now()
  });
}

export function applyUserQuizSnapshot(
  profile: UserProfile | null,
  agent: AgentKind
): {
  stats: AnswerStats;
  topicDone: Record<string, number>;
  wrongQuestions: WrongQuestionRecord[];
} {
  return {
    stats: (profile && profile.stats[agent]) || createEmptyStats(),
    topicDone: (profile && profile.progress[agent] && profile.progress[agent].topicDone) || {},
    wrongQuestions: profile ? profile.wrongQuestions.filter(item => item.agent === agent) : []
  };
}

function canUseCloudDatabase(): boolean {
  return RUNTIME_CONFIG.enableCloudDatabase && Boolean(wx.cloud && wx.cloud.database);
}

async function getUserProfile(wechatOpenId: string): Promise<UserProfile | null> {
  const result = await getCollection()
    .where({ wechatOpenId })
    .limit(1)
    .get() as CollectionResult<UserProfile>;

  return result.data[0] || null;
}

function updateUserProfile(wechatOpenId: string, data: Partial<UserProfile>): Promise<unknown> {
  return getCollection()
    .where({ wechatOpenId })
    .update({ data });
}

function getCollection() {
  return wx.cloud.database().collection(USER_COLLECTION);
}
