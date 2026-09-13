import { AgentKind } from "./purchase";
import { BankConfig, QuizBank, TopicBank, TopicItem } from "../types/quiz-bank";

const pyBank = require("../data/topic-py") as QuizBank;
const mlBank = require("../data/topic-ml") as QuizBank;
const alBank = require("../data/topic-al") as QuizBank;
const cvBank = require("../data/topic-cv") as QuizBank;

export interface AgentDefinition {
  id: AgentKind;
  bank: QuizBank;
}

export interface CourseOption {
  id: AgentKind;
  title: string;
  topicCount: number;
  questionTotal: number;
}

// 注册表只回答「有哪些课程、各自对应哪个题库」。
// 标题、专题顺序与专题名一律以题库 `data/topic-*.ts` 的 `_config` 为准，
// 避免同一份元数据在小程序、网页端构建脚本里各存一份并逐渐漂移。
export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  py: { id: "py", bank: pyBank },
  ml: { id: "ml", bank: mlBank },
  al: { id: "al", bank: alBank },
  cv: { id: "cv", bank: cvBank }
};

export function getAvailableAgentIds(): AgentKind[] {
  return Object.keys(AGENT_REGISTRY);
}

export function getAgentBank(kind: AgentKind): QuizBank | null {
  return AGENT_REGISTRY[kind] ? AGENT_REGISTRY[kind].bank : null;
}

function getAgentConfig(kind: AgentKind): BankConfig {
  const bank = getAgentBank(kind);
  return (bank && bank._config) || {};
}

export function getAgentTitle(kind: AgentKind): string {
  return getAgentConfig(kind).title || String(kind).toUpperCase();
}

export function getAgentCourse(kind: AgentKind): { title: string } | null {
  return AGENT_REGISTRY[kind] ? { title: getAgentTitle(kind) } : null;
}

function isTopicBank(value: unknown): value is TopicBank {
  return Boolean(value && typeof value === "object" && ("single" in value || "judge" in value));
}

// 专题顺序来自 `_config.topicOrder`（同时是「有哪些专题」的白名单）；缺省时按题库键顺序兜底。
function declaredTopicKeys(kind: AgentKind): string[] {
  const bank = getAgentBank(kind);
  if (!bank) return [];

  const order = getAgentConfig(kind).topicOrder;
  const keys = Array.isArray(order) && order.length ? order : Object.keys(bank);
  return keys.filter(key => key !== "_config" && isTopicBank(bank[key]));
}

export function getTopicName(kind: AgentKind, key: string): string {
  const names = getAgentConfig(kind).topicNameMap || {};
  return names[key] || key;
}

export function buildAgentTopics(kind: AgentKind): TopicItem[] {
  const bank = getAgentBank(kind);
  if (!bank) return [];

  return declaredTopicKeys(kind).map(key => {
    const topic = bank[key] as TopicBank;

    return {
      key,
      name: getTopicName(kind, key),
      total: (topic.single || []).length + (topic.judge || []).length,
      buttonClass: "topic-btn"
    };
  });
}

// 课程清单用于首页展示：全部题库都内置在同一个小程序里，是否可进入由后台授权决定。
export function listAgentCourses(): CourseOption[] {
  return getAvailableAgentIds().map(id => {
    const bank = getAgentBank(id) as QuizBank;
    const topicKeys = declaredTopicKeys(id);
    const questionTotal = topicKeys.reduce((total, key) => {
      const topic = bank[key] as TopicBank;
      return total + (topic.single || []).length + (topic.judge || []).length + (topic.fill || []).length;
    }, 0);

    return {
      id,
      title: getAgentTitle(id),
      topicCount: topicKeys.length,
      questionTotal
    };
  });
}
