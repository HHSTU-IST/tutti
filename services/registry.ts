import { AgentKind } from "./purchase";
import { CourseInfo, QuizBank, TopicBank, TopicItem } from "../types/quiz-bank";

const pyBank = require("../data/topic-py") as QuizBank;
const mlBank = require("../data/topic-ml") as QuizBank;
const alBank = require("../data/topic-al") as QuizBank;
const cvBank = require("../data/topic-cv") as QuizBank;

export interface AgentDefinition extends CourseInfo {
  id: AgentKind;
  bank: QuizBank;
}

export interface CourseOption {
  id: AgentKind;
  title: string;
  topicCount: number;
  questionTotal: number;
}

export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  py: {
    id: "py",
    title: "Python 刷题助手",
    bank: pyBank,
    fallbackTopics: [
      ["var", "变量"],
      ["flow", "流程控制"],
      ["func", "函数"],
      ["oop", "面向对象"],
      ["decorator", "装饰器"],
      ["magic", "魔术方法"],
      ["generator", "生成器"],
      ["thread", "多线程"],
      ["code", "代码题"]
    ]
  },
  ml: {
    id: "ml",
    title: "机器学习刷题助手",
    bank: mlBank,
    fallbackTopics: [
      ["base", "基础"],
      ["reg", "回归"],
      ["classify", "分类"],
      ["cluster", "聚类"],
      ["overfit", "模型选择"],
      ["tree", "树模型"],
      ["rl", "强化学习"],
      ["calc", "计算题"]
    ]
  },
  al: {
    id: "al",
    title: "数据结构与算法刷题助手",
    bank: alBank,
    fallbackTopics: [
      ["complex", "复杂度分析"],
      ["array", "数组与字符串"],
      ["linked", "链表"],
      ["stack", "栈与队列"],
      ["tree", "树与二叉树"],
      ["graph", "图"],
      ["sort", "排序算法"],
      ["dp", "动态规划"]
    ]
  },
  cv: {
    id: "cv",
    title: "图像处理刷题助手",
    bank: cvBank,
    fallbackTopics: [
      ["base", "基础概念"],
      ["image", "图像表示"],
      ["color", "颜色空间"],
      ["filter", "滤波卷积"],
      ["edge", "边缘与形态学"],
      ["feature", "特征与匹配"],
      ["geometry", "几何变换"],
      ["deep", "深度视觉"],
      ["eval", "评价指标"]
    ]
  }
};

export function getAvailableAgentIds(): AgentKind[] {
  return Object.keys(AGENT_REGISTRY);
}

export function getAgentBank(kind: AgentKind): QuizBank | null {
  return AGENT_REGISTRY[kind] ? AGENT_REGISTRY[kind].bank : null;
}

export function getAgentCourse(kind: AgentKind): CourseInfo | null {
  const agent = AGENT_REGISTRY[kind];
  if (!agent) return null;

  return {
    title: agent.title,
    fallbackTopics: agent.fallbackTopics
  };
}

export function isTopicBank(value: unknown): value is TopicBank {
  return Boolean(value && typeof value === "object" && ("single" in value || "judge" in value));
}

export function getTopicName(bank: QuizBank, kind: AgentKind, key: string): string {
  const course = getAgentCourse(kind);
  return (bank._config && bank._config.topicNameMap && bank._config.topicNameMap[key])
    || (course && (course.fallbackTopics.find(item => item[0] === key) || [key, key])[1])
    || key;
}

export function buildAgentTopics(kind: AgentKind): TopicItem[] {
  const bank = getAgentBank(kind);
  const course = getAgentCourse(kind);
  if (!bank || !course) return [];

  return course.fallbackTopics
    .filter(([key]) => isTopicBank(bank[key]))
    .map(([key, fallbackName]) => {
      const topic = bank[key] as TopicBank;
      return {
        key,
        name: getTopicName(bank, kind, key) || fallbackName,
        total: (topic.single || []).length + (topic.judge || []).length,
        buttonClass: "topic-btn"
      };
    });
}

// 课程清单用于首页展示：全部题库都内置在同一个小程序里，是否可进入由后台授权决定。
export function listAgentCourses(): CourseOption[] {
  return Object.keys(AGENT_REGISTRY).map(id => {
    const agent = AGENT_REGISTRY[id];
    const topics = agent.fallbackTopics.filter(([key]) => isTopicBank(agent.bank[key]));

    return {
      id,
      title: agent.title,
      topicCount: topics.length,
      questionTotal: topics.reduce((total, [key]) => {
        const topic = agent.bank[key] as TopicBank;
        return total + (topic.single || []).length + (topic.judge || []).length + (topic.fill || []).length;
      }, 0)
    };
  });
}
