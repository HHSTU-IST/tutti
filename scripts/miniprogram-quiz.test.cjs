const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");

const APP_DIR = path.join(__dirname, "..");
const engine = loadQuizEngine();

const QUESTION_TYPES = ["single", "judge", "fill"];

function fakeBank() {
  return {
    _config: { title: "测试课程" },
    a: {
      single: [
        { question: "a1", options: ["甲", "乙"], answer: 0, explain: "解析" },
        { question: "a2", options: ["甲", "乙"], answer: 1, explain: "解析" }
      ],
      judge: [{ question: "aj1", answer: true, explain: "解析" }],
      fill: [{ question: "af1", answer: "42" }]
    },
    b: {
      single: [{ question: "b1", options: ["甲", "乙"], answer: 0, explain: "解析" }],
      judge: [],
      fill: []
    }
  };
}

function wrongQuestion(topic, question, createdAt) {
  return {
    id: `${topic}-${createdAt}`,
    agent: "py",
    topic,
    question,
    answer: "正确",
    createdAt
  };
}

test("buildPracticeQueue：单专题范围只抽该专题，并按题型给出题型名", () => {
  const result = engine.buildPracticeQueue(
    fakeBank(),
    ["a"],
    [{ type: "single", count: 2, label: "单选题" }],
    () => "甲专题"
  );

  assert.equal(result.questions.length, 2, "该专题有 2 道单选，题量 2 应全部抽出");
  assert.deepEqual(result.shortfall, [], "题量够时不应报缺口");
  result.questions.forEach(question => {
    assert.equal(question.topic, "a");
    assert.equal(question.topicName, "甲专题");
    assert.equal(question.typeName, "单选题");
    assert.equal(question.type, "single");
  });
});

test("buildPracticeQueue：题量不足时返回已有的题，并把缺口写进 shortfall", () => {
  const result = engine.buildPracticeQueue(
    fakeBank(),
    ["b"],
    [{ type: "judge", count: 5, label: "判断题" }],
    key => key
  );

  assert.equal(result.questions.length, 0, "b 专题没有判断题，应返回空队列");
  assert.deepEqual(result.shortfall, ["判断题仅 0/5 题"]);
});

test("buildPracticeQueue：多段式组卷（试卷练习）每段题量独立", () => {
  const bank = loadTopicBank("py");
  const topicKeys = bank._config.topicOrder;
  const resolveTopicName = key => bank._config.topicNameMap[key] || key;

  const result = engine.buildPracticeQueue(bank, topicKeys, [
    { type: "single", count: 20, label: "单选题" },
    { type: "judge", count: 10, label: "判断题" },
    { type: "fill", count: 10, label: "填空题" }
  ], resolveTopicName);

  assert.deepEqual(result.shortfall, [], "py 题库题量应满足一次完整组卷");
  QUESTION_TYPES.forEach((type, index) => {
    const expected = [20, 10, 10][index];
    assert.equal(
      result.questions.filter(question => question.type === type).length,
      expected,
      `${type} 段应抽满 ${expected} 道`
    );
  });
});

test("buildPracticeQueue：抽出的题目结构完整（答案落在选项内、id 不重复）", () => {
  const bank = loadTopicBank("ml");
  const result = engine.buildPracticeQueue(
    bank,
    bank._config.topicOrder,
    [{ type: "single", count: 20, label: "单选题" }, { type: "fill", count: 10, label: "填空题" }],
    key => bank._config.topicNameMap[key] || key
  );

  assert.equal(new Set(result.questions.map(question => question.id)).size, result.questions.length);

  result.questions.forEach(question => {
    assert.ok(question.question.trim().length > 0, "题干不能为空");
    assert.ok(String(question.correctAnswer).length > 0, "正确答案不能为空");

    if (question.type === "fill") {
      assert.deepEqual(question.options, [], "填空题不应有选项");
      return;
    }

    assert.ok(
      question.options.some(option => option.value === question.correctAnswer),
      `正确答案 ${question.correctAnswer} 不在选项里`
    );
  });
});

test("错题去重：同专题同题干只留一条，不同专题的同名题各算一条", () => {
  const list = [
    wrongQuestion("a", "同一道题", 3),
    wrongQuestion("a", "同一道题", 2),
    wrongQuestion("b", "同一道题", 1)
  ];

  assert.deepEqual(
    engine.dedupeWrongQuestions(list).map(item => item.createdAt),
    [3, 1],
    "同专题同题的重复记录应只保留较新的那条"
  );
});

test("记错题：同题重复答错时替换并提到最前，不新增条目", () => {
  const existing = [wrongQuestion("a", "题一", 1), wrongQuestion("b", "题二", 2)];
  const merged = engine.upsertWrongQuestion(existing, wrongQuestion("a", "题一", 9));

  assert.equal(merged.length, 2, "重复答错不应让错题本变长");
  assert.deepEqual(merged.map(item => item.createdAt), [9, 2]);
});

// registry.ts 是 ESM + require 混合语法，Node 求值不了（require 在 new Function 里不存在），
// 与 topic-bank.test.cjs 一样只能静态核对源码。
test("专题题量分母包含填空题：否则含填空题的专题进度永远到不了 100%", () => {
  const source = fs.readFileSync(path.join(APP_DIR, "services/registry.ts"), "utf8");
  const totalLine = source.split("\n").find(line => line.includes("total:"));

  assert.ok(totalLine, "services/registry.ts 里没找到 buildAgentTopics 的 total 计算");
  QUESTION_TYPES.forEach(type => {
    assert.ok(totalLine.includes(`topic.${type}`), `total 没把 ${type} 算进去：${totalLine.trim()}`);
  });
});

function extractDataKeys(source) {
  const start = source.indexOf("\n  data: {");
  assert.ok(start >= 0, "页面 .ts 里没找到 data 块");

  let depth = 0;
  let end = -1;
  for (let index = source.indexOf("{", start); index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  assert.ok(end > start, "data 块的大括号没有闭合");

  return new Set(Array.from(source.slice(start, end).matchAll(/^\s{2,}(\w+):/gm), match => match[1]));
}

function wxmlFiles() {
  return fs
    .readdirSync(path.join(APP_DIR, "pages"))
    .map(dir => path.join(APP_DIR, "pages", dir, `${dir}.wxml`))
    .filter(file => fs.existsSync(file));
}

// 这两条守的是「改了 data 字段名、忘了改 wxml」这类只在真机上才暴露的错误。
test("页面 wxml 里的 bindtap 处理函数都在页面 ts 里存在", () => {
  wxmlFiles().forEach(wxmlPath => {
    const tsPath = wxmlPath.replace(/\.wxml$/, ".ts");
    const tsSource = fs.readFileSync(tsPath, "utf8");
    const wxmlSource = fs.readFileSync(wxmlPath, "utf8");
    const handlers = Array.from(wxmlSource.matchAll(/bindtap="(\w+)"/g), match => match[1]);

    assert.ok(handlers.length > 0, `${path.basename(wxmlPath)} 里没有任何 bindtap`);
    handlers.forEach(handler => {
      assert.match(
        tsSource,
        new RegExp(`\\n\\s+${handler}\\(`),
        `${path.basename(wxmlPath)} 绑定的 ${handler} 在 ${path.basename(tsPath)} 里没有对应方法`
      );
    });
  });
});

test("页面 wxml 引用的变量都在页面 ts 的 data 里声明", () => {
  // item / index 是 wx:for 提供的局部变量，其余是字面量与逻辑关键字。
  const LOCALS = new Set(["item", "index", "true", "false", "null", "undefined"]);

  wxmlFiles().forEach(wxmlPath => {
    const tsPath = wxmlPath.replace(/\.wxml$/, ".ts");
    const keys = extractDataKeys(fs.readFileSync(tsPath, "utf8"));
    const wxmlSource = fs.readFileSync(wxmlPath, "utf8");
    const expressions = Array.from(wxmlSource.matchAll(/\{\{([\s\S]*?)\}\}/g), match => match[1]);

    expressions.forEach(expression => {
      // 先把字符串字面量挖掉，否则 'action-selected' 这类值会被当成变量名。
      const withoutLiterals = expression.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

      Array.from(withoutLiterals.matchAll(/(?<![\w.])[A-Za-z_$][\w$]*/g), match => match[0]).forEach(name => {
        if (LOCALS.has(name)) return;
        assert.ok(
          keys.has(name),
          `${path.basename(wxmlPath)} 引用了 {{${name}}}，但它不在 ${path.basename(tsPath)} 的 data 里`
        );
      });
    });
  });
});
