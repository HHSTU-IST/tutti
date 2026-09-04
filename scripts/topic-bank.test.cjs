const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const registryPath = path.join(__dirname, "../services/registry.ts");
const { loadTopicBank } = require("./load-topic-bank.cjs");

const QUESTION_TYPES = ["single", "judge", "fill"];

// 注册表使用 ESM 语法且依赖 require()，无法直接用 TS 加载器求值，这里只解析其中稳定的结构。
function parseRegistryAgents(registrySource) {
  const agents = new Map();
  const agentPattern = /id:\s*"(\w+)"[\s\S]*?fallbackTopics:\s*\[([\s\S]*?)\n\s*\]/g;
  let match = agentPattern.exec(registrySource);

  while (match) {
    const [, agentId, topicBlock] = match;
    const pairs = [];
    const pairPattern = /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g;
    let pair = pairPattern.exec(topicBlock);

    while (pair) {
      pairs.push([pair[1], pair[2]]);
      pair = pairPattern.exec(topicBlock);
    }

    agents.set(agentId, pairs);
    match = agentPattern.exec(registrySource);
  }

  return agents;
}

function readAgents() {
  return parseRegistryAgents(fs.readFileSync(registryPath, "utf8"));
}

function countByType(bank, topicKeys) {
  return topicKeys.reduce((totals, topicKey) => {
    const topic = bank[topicKey] || {};
    QUESTION_TYPES.forEach(type => {
      totals[type] += (topic[type] || []).length;
    });
    return totals;
  }, { single: 0, judge: 0, fill: 0 });
}

test("注册表中声明的专题与题库文件完全对齐", () => {
  const agents = readAgents();

  assert.ok(agents.size > 0, "未从 services/registry.ts 解析到任何智能体");
  assert.ok(agents.has("py"), "registry 缺少 py 智能体");
  assert.ok(agents.has("ml"), "registry 缺少 ml 智能体");
  assert.ok(agents.has("al"), "registry 缺少 al 智能体");

  agents.forEach((topics, agentId) => {
    const bank = loadTopicBank(agentId);

    assert.ok(bank && typeof bank === "object", `${agentId} 题库加载失败（data/topic-${agentId}.ts）`);
    assert.ok(topics.length > 0, `${agentId} 未声明任何专题`);
    assert.ok(bank._config, `${agentId} 题库缺少 _config`);

    topics.forEach(([topicKey, fallbackName]) => {
      const topic = bank[topicKey];

      assert.ok(topic, `${agentId}.${topicKey} 在题库中不存在`);
      assert.ok(
        QUESTION_TYPES.some(type => Array.isArray(topic[type])),
        `${agentId}.${topicKey} 不是有效专题（single/judge/fill 均为空）`
      );

      const nameMap = bank._config.topicNameMap || {};
      assert.ok(
        nameMap[topicKey],
        `${agentId}.${topicKey} 缺少 _config.topicNameMap 条目，专题名会回退为「${fallbackName}」`
      );
    });
  });
});

test("题库题目结构合法：题干、选项、答案、解析齐全", () => {
  const agents = readAgents();

  agents.forEach((topics, agentId) => {
    const bank = loadTopicBank(agentId);

    topics.forEach(([topicKey]) => {
      const topic = bank[topicKey] || {};

      QUESTION_TYPES.forEach(type => {
        (topic[type] || []).forEach((question, index) => {
          const label = `${agentId}.${topicKey}.${type}[${index}]`;

          assert.equal(typeof question.question, "string", `${label} 缺少 question 字段`);
          assert.ok(question.question.trim().length > 0, `${label} 题干为空`);

          // 填空题答案是短词组，本身即解析，历史上不写 explain；单选/判断必须给出解析。
          if (type !== "fill") {
            assert.ok(question.explain || question.explanation, `${label} 缺少解析`);
          }

          if (type === "single") {
            assert.ok(Array.isArray(question.options), `${label} options 不是数组`);
            assert.ok(question.options.length >= 2, `${label} 选项少于 2 个`);
            assert.equal(
              new Set(question.options).size,
              question.options.length,
              `${label} 存在重复选项`
            );
            question.options.forEach(option => {
              assert.ok(String(option).trim().length > 0, `${label} 存在空选项`);
            });
            assert.ok(
              Number.isInteger(question.answer)
                && question.answer >= 0
                && question.answer < question.options.length,
              `${label} answer 越界：${question.answer}（选项数 ${question.options.length}）`
            );
          }

          if (type === "judge") {
            assert.equal(typeof question.answer, "boolean", `${label} 判断题 answer 必须是布尔值`);
          }

          if (type === "fill") {
            assert.ok(
              question.answer !== undefined && String(question.answer).trim().length > 0,
              `${label} 填空题缺少答案`
            );
          }
        });
      });
    });
  });
});

test("每个智能体的题量满足一次完整组卷（单选 20 / 判断 10 / 填空 10）", () => {
  const agents = readAgents();

  agents.forEach((topics, agentId) => {
    const bank = loadTopicBank(agentId);
    const totals = countByType(bank, topics.map(([topicKey]) => topicKey));

    assert.ok(totals.single >= 20, `${agentId} 单选题仅 ${totals.single} 道，不足 20 道`);
    assert.ok(totals.judge >= 10, `${agentId} 判断题仅 ${totals.judge} 道，不足 10 道`);
    assert.ok(totals.fill >= 10, `${agentId} 填空题仅 ${totals.fill} 道，不足 10 道`);
  });
});
