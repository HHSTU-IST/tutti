const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { loadTopicBank } = require("./load-topic-bank.cjs");

const DATA_DIR = path.join(__dirname, "../data");
const REGISTRY_PATH = path.join(__dirname, "../services/registry.ts");
const QUESTION_TYPES = ["single", "judge", "fill"];

function topicFileIds() {
  return fs
    .readdirSync(DATA_DIR)
    .filter(file => /^topic-.*\.ts$/.test(file))
    .map(file => file.replace(/^topic-/, "").replace(/\.ts$/, ""))
    .sort();
}

// registry.ts 是 ESM + require 混合语法，没法直接求值；它现在只剩 id 与 bank，正则抠 id 足够稳。
function registryIds() {
  const source = fs.readFileSync(REGISTRY_PATH, "utf8");
  return Array.from(source.matchAll(/id:\s*"(\w+)"/g), match => match[1]).sort();
}

// 标题、专题顺序与专题名都以题库 _config 为准，这里集中读一遍给各用例复用。
function readCourse(id) {
  const bank = loadTopicBank(id);
  const config = bank._config || {};
  const topicKeys = Array.isArray(config.topicOrder) && config.topicOrder.length
    ? config.topicOrder
    : Object.keys(bank).filter(key => key !== "_config");

  return { bank, config, topicKeys };
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

test("registry 的课程清单与 data/topic-*.ts 一一对应", () => {
  const ids = topicFileIds();
  assert.ok(ids.length > 0, "data/ 下没有任何 topic-*.ts");

  assert.deepEqual(
    registryIds(),
    ids,
    "services/registry.ts 与 data/topic-*.ts 必须一一对应：加了题库要在注册表登记，反之亦然"
  );
});

test("题库 _config 声明的课程标题与专题与题库内容完全对齐", () => {
  topicFileIds().forEach(agentId => {
    const { bank, config, topicKeys } = readCourse(agentId);

    assert.equal(typeof config.title, "string", `${agentId} 缺少 _config.title`);
    assert.ok(config.title.trim().length > 0, `${agentId} 的 _config.title 为空`);
    assert.ok(topicKeys.length > 0, `${agentId} 未声明任何专题`);

    const nameMap = config.topicNameMap || {};
    topicKeys.forEach(topicKey => {
      const topic = bank[topicKey];

      assert.ok(topic, `${agentId}.${topicKey} 在题库中不存在`);
      assert.ok(
        QUESTION_TYPES.some(type => Array.isArray(topic[type])),
        `${agentId}.${topicKey} 不是有效专题（single/judge/fill 均为空）`
      );
      assert.ok(
        nameMap[topicKey],
        `${agentId}.${topicKey} 缺少 _config.topicNameMap 条目，专题名会退化成 key`
      );
    });
  });
});

test("题库题目结构合法：题干、选项、答案、解析齐全", () => {
  topicFileIds().forEach(agentId => {
    const { bank, topicKeys } = readCourse(agentId);

    topicKeys.forEach(topicKey => {
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
  topicFileIds().forEach(agentId => {
    const { bank, topicKeys } = readCourse(agentId);
    const totals = countByType(bank, topicKeys);

    assert.ok(totals.single >= 20, `${agentId} 单选题仅 ${totals.single} 道，不足 20 道`);
    assert.ok(totals.judge >= 10, `${agentId} 判断题仅 ${totals.judge} 道，不足 10 道`);
    assert.ok(totals.fill >= 10, `${agentId} 填空题仅 ${totals.fill} 道，不足 10 道`);
  });
});
