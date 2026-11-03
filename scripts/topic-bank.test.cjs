const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { loadTopicBank } = require("./load-topic-bank.cjs");

const DATA_DIR = path.join(__dirname, "../data");
const REGISTRY_PATH = path.join(__dirname, "../services/registry.ts");
const QUESTION_TYPES = ["single", "judge", "fill"];

// 题库真源是纯数据文件 data/topic-<id>.js：`module.exports = { …JSON 文本… }`。
function topicFiles() {
  return fs.readdirSync(DATA_DIR).filter(file => /^topic-.*\.js$/.test(file)).sort();
}

function topicFileIds() {
  return topicFiles()
    .map(file => file.replace(/^topic-/, "").replace(/\.js$/, ""))
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

const ASSIGN_ANCHOR = /^module\.exports = /m;

test("registry 的课程清单与 data/topic-*.js 一一对应", () => {
  const ids = topicFileIds();
  assert.ok(ids.length > 0, "data/ 下没有任何 topic-*.js 题库");

  assert.deepEqual(
    registryIds(),
    ids,
    "services/registry.ts 与 data/topic-*.js 必须一一对应：加了题库要在注册表登记，反之亦然"
  );
});

// 题库改成纯数据是为了甩掉「Node 侧自己剥类型」那条实验性依赖（P0-1）。
// 数据就得是数据：注释、尾逗号、单引号字符串、JS 转义写法都会让 JSON.parse 失败，这里先红。
test("题库正文是严格合法的 JSON 文本，require 结果与之完全一致", () => {
  topicFiles().forEach(file => {
    const absolute = path.join(DATA_DIR, file);
    const source = fs.readFileSync(absolute, "utf8");
    const match = ASSIGN_ANCHOR.exec(source);
    assert.ok(match, `${file} 应有一行以 module.exports = 开头`);

    const jsonText = source.slice(match.index + match[0].length, source.lastIndexOf(";"));

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      assert.fail(`${file} 的正文不是严格 JSON（题库只放数据：不许注释、尾逗号、单引号字符串）：${error.message}`);
      return;
    }

    // 除这一行赋值外不该有别的代码：require 出来的对象必须与 JSON 文本一字不差地等价。
    assert.deepEqual(require(absolute), parsed, `${file} require 结果与 JSON 正文不一致（中间有代码改了数据？）`);
  });
});

test("题库真源只有一份：data/ 下不该再留旧的 topic-*.ts", () => {
  const leftovers = fs.readdirSync(DATA_DIR).filter(file => /^topic-.*\.ts$/.test(file)).sort();

  assert.deepEqual(leftovers, [], `data/ 下还留着旧的 TS 题库：${leftovers.join("、")}——网页端与小程序读的都是 .js`);
});

test("registry require 的题库文件都真实存在", () => {
  const source = fs.readFileSync(REGISTRY_PATH, "utf8");
  const required = Array.from(source.matchAll(/require\("\.\.\/data\/(topic-[\w-]+)"\)/g), match => match[1]).sort();

  assert.deepEqual(required, topicFiles().map(file => file.replace(/\.js$/, "")).sort(),
    "services/registry.ts 里 require 的题库必须与 data/ 下的文件一一对应（改名/删除题库时别留下悬空引用）");
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
