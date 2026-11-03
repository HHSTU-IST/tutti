const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const scriptPath = path.join(__dirname, "generate-exam-ml.cjs");
const courseConfigPath = path.join(__dirname, "exam-courses.cjs");
const quizLoaderPath = path.join(__dirname, "load-quiz-engine.cjs");
const topicLoaderPath = path.join(__dirname, "load-topic-bank.cjs");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");
const { loadQuizEngine } = require("./load-quiz-engine.cjs");
const { loadTopicBank } = require("./load-topic-bank.cjs");
const { loadUploadRules } = require("./load-upload-rules.cjs");

test("组卷链路通过显式 loader 加载运行时 TypeScript 模块", () => {
  // 装配在 exam-courses.cjs，入口脚本只负责「交给工厂 + 跑 CLI」。
  const configSource = fs.readFileSync(courseConfigPath, "utf8");
  assert.match(configSource, /loadQuizEngine\s*\(/);
  assert.match(configSource, /loadTopicBank\s*\(/);

  const entrySource = fs.readFileSync(scriptPath, "utf8");
  assert.match(entrySource, /createCourseGenerator\("ml"\)/);
  assert.doesNotMatch(entrySource, /require\("\.\.\/services\/quiz-engine\.ts"\)/);
  assert.doesNotMatch(entrySource, /function loadTopicBank\s*\(/);
  assert.doesNotMatch(entrySource, /readFileSync\(bankPath,\s*"utf8"\)/);
});

test("TS loaders share one runtime helper", () => {
  const quizLoaderSource = fs.readFileSync(quizLoaderPath, "utf8");
  const rulesLoaderSource = fs.readFileSync(path.join(__dirname, "load-upload-rules.cjs"), "utf8");

  [quizLoaderSource, rulesLoaderSource].forEach(source => {
    assert.match(source, /require\("\.\/load-ts-module\.cjs"\)/);
    assert.doesNotMatch(source, /withSuppressedStripTypeScriptWarning/);
    assert.doesNotMatch(source, /stripTypeScriptTypes/);
  });
});

// 题库是纯数据，这条不变量别让「实验性类型剥离」再长回来：
// load-topic-bank.cjs 只允许普通 require，出现 TS 加载器就说明路子又歪了。
test("题库加载器不依赖类型剥离：纯数据普通 require", () => {
  const topicLoaderSource = fs.readFileSync(topicLoaderPath, "utf8");

  assert.doesNotMatch(topicLoaderSource, /load-ts-module/, "题库不该再走 TS 加载器");
  assert.doesNotMatch(topicLoaderSource, /stripTypeScriptTypes/);
  assert.match(topicLoaderSource, /require\(bankPath\)/, "应直接 require 纯数据题库文件");
  assert.equal(fs.existsSync(path.join(__dirname, "../data/topic-ml.ts")), false, "data/ 下不该再留 topic-*.ts 题库");
});

test("loadQuizEngine caches and returns callable exports", () => {
  const first = loadQuizEngine();
  const second = loadQuizEngine();

  assert.equal(first, second);
  assert.equal(typeof first.getQuestions, "function");
  assert.equal(typeof first.normalizeQuestion, "function");
});

test("loadTopicBank loads the ML bank and reuses cached data", () => {
  const first = loadTopicBank("ml");
  const second = loadTopicBank("ml");

  assert.equal(first, second);
  assert.equal(first._config.topicNameMap.base, "基础概念");
  assert.equal(Array.isArray(first.base.single), true);
});

// P0-1 的守卫：题库现在是纯数据（普通 require），services 与 data/access.ts 仍靠 Node 的类型剥离 +
// 自研 ESM→CJS 改写。光检查源码字符串是查不出它跑不动的，所以下面真的把每个模块求值一遍——
// Node 换版本、题库格式或 TS 写法变化，这里先红。
test("Node 侧加载的每个题库与 TS 模块都能在真实 Node 上求值出可用导出", () => {
  const courses = ["py", "al", "cv", "ml"];

  courses.forEach(code => {
    const bank = loadTopicBank(code);

    assert.equal(typeof bank._config.title, "string", `${code} 题库缺 _config.title`);
    assert.ok(bank._config.topicOrder.length > 0, `${code} 题库缺 _config.topicOrder`);
    bank._config.topicOrder.forEach(topic => {
      assert.ok(Array.isArray(bank[topic].single) || Array.isArray(bank[topic].judge) || Array.isArray(bank[topic].fill),
        `${code}/${topic} 没有任何题型数组`);
    });
  });

  const access = loadTypeScriptModule(path.join(__dirname, "../data/access.ts"));
  assert.deepEqual(Object.keys(access).sort(), [...courses].sort(), "data/access.ts 的课程键要能求出来");

  const engine = loadQuizEngine();
  ["getQuestions", "normalizeQuestion", "buildPracticeQueue", "upsertWrongQuestion"].forEach(fn => {
    assert.equal(typeof engine[fn], "function", `quiz-engine 缺 ${fn}`);
  });

  const rules = loadUploadRules();
  ["defaultUploadRules", "checkHomeworkFile", "describeUploadRules"].forEach(fn => {
    assert.equal(typeof rules[fn], "function", `upload-rules 缺 ${fn}`);
  });
});

test("加载器不认识的语法要指名文件报错，不能静默返回半个模块", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-loader-"));
  const valueImport = path.join(tempDir, "value-import.ts");
  const badExportAssignment = path.join(tempDir, "bad-export-assignment.ts");

  try {
    fs.writeFileSync(valueImport, 'import { helper } from "./helper";\nexport function run() { return helper(); }\n');
    assert.throws(() => loadTypeScriptModule(valueImport), /识别不了的 ESM 语法/, "值导入必须被拦住");

    fs.writeFileSync(badExportAssignment, "export = { a: 1 };\n");
    assert.throws(() => loadTypeScriptModule(badExportAssignment), /export = <标识符>/, "非标识符的 export = 要给出改写指引");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
