const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { getQuestions, pickRandomMany, normalizeQuestion, getQuestionText } = require("../services/quiz-engine.ts");

const templatePath = path.join(__dirname, "../docs/exam-template.md");
const examifPath = path.join(__dirname, "../docs/examif.json");
const docxScriptPath = path.join(__dirname, "generate-exam-docx.py");
const template = fs.readFileSync(templatePath, "utf8");
const examif = JSON.parse(fs.readFileSync(examifPath, "utf8"));

function loadTopicBank() {
  const bankPath = path.join(__dirname, "../data/topic-ml.ts");
  const source = fs
    .readFileSync(bankPath, "utf8")
    .replace(
      /^const data: import\("\.\.\/types\/quiz-bank"\)\.QuizBank = /,
      "const data = "
    )
    .replace(/\nexport = data;\s*$/, "\nmodule.exports = data;\n");

  const module = { exports: {} };
  const factory = new Function("module", "exports", source);
  factory(module, module.exports);
  return module.exports;
}

const bank = loadTopicBank();
const DEFAULT_EXAM_LAYOUT = {
  school: "黄河科技学院",
  singleCount: 10,
  judgeCount: 10,
  fillCount: 10,
  calcCount: 3,
  essayCount: 3,
  singleScore: 1,
  judgeScore: 1,
  fillScore: 2,
  calcScore: 10,
  essayScore: 10
};
const COURSE_NAME_MAP = {
  xm: "机器学习概论"
};

const topicOrder = ["base", "reg", "classify", "cluster", "overfit", "tree", "rl", "calc"];
const topicNames = {
  base: "基础概念",
  reg: "回归算法",
  classify: "分类算法",
  cluster: "聚类降维",
  overfit: "过拟合与优化",
  tree: "决策树与集成",
  rl: "强化学习",
  calc: "计算题"
};

function fillTemplate(text, values) {
  return Object.keys(values).reduce((result, key) => result.replaceAll(`{{${key}}}`, values[key]), text);
}

function uniqueByQuestion(list) {
  const seen = new Set();
  return list.filter(item => {
    const key = item.question;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTopicQuestions(type, perTopicCount) {
  const result = [];
  topicOrder.forEach(topic => {
    result.push(...pickRandomMany(getQuestions(bank, topic, type), perTopicCount));
  });
  return result;
}

function collectAllQuestions(type) {
  return topicOrder.flatMap(topic => getQuestions(bank, topic, type));
}

function padToCount(current, allQuestions, targetCount) {
  if (current.length >= targetCount) {
    return current.slice(0, targetCount);
  }

  const existing = new Set(current.map(item => item.question));
  const paddingPool = allQuestions.filter(item => !existing.has(item.question));
  return current.concat(pickRandomMany(paddingPool, targetCount - current.length));
}

function calculateAcademicYear(yearRaw, termRaw) {
  const academicYearStart = termRaw % 2 === 1 ? yearRaw - 1 : yearRaw;
  return `${academicYearStart}-${academicYearStart + 1}`;
}

function calculateTermLabel(termRaw) {
  return termRaw % 2 === 0 ? "第二" : "第一";
}

function normalizeVersionRaw(versionRaw) {
  const version = versionRaw.toUpperCase();
  if (version !== "A" && version !== "B") {
    throw new Error(`未识别的卷别：${versionRaw}`);
  }
  return version;
}

function loadExamSpec(inputArg) {
  const entries = Object.entries(examif);
  if (!entries.length) {
    throw new Error(`未读取到考试配置：${examifPath}`);
  }

  let key = inputArg && !inputArg.endsWith(".md") ? inputArg : "";
  let record = key ? examif[key] : null;

  if (!record) {
    const matchedEntry = entries.find(([, value]) => value && value.courseCode === "xm");
    record = matchedEntry ? matchedEntry[1] : entries[0][1];
    key = matchedEntry ? matchedEntry[0] : entries[0][0];
  }

  const courseCode = String(record.courseCode || "").toLowerCase();
  const courseName = record.courseName || COURSE_NAME_MAP[courseCode];
  const yearRaw = Number(record.yearRaw);
  const termRaw = Number(record.termRaw);
  const versionRaw = normalizeVersionRaw(String(record.versionRaw || "A"));

  if (!courseCode || !courseName) {
    throw new Error(`考试配置缺少 courseCode/courseName：${key}`);
  }

  if (!Number.isFinite(yearRaw) || !Number.isFinite(termRaw)) {
    throw new Error(`考试配置中的 yearRaw/termRaw 非法：${key}`);
  }

  return {
    key,
    courseCode,
    yearRaw,
    termRaw,
    versionRaw,
    paperVersion: versionRaw,
    courseName,
    paperCode: record.paperCode || DEFAULT_EXAM_LAYOUT.paperCode,
    targetMajor: record.targetMajor || DEFAULT_EXAM_LAYOUT.targetMajor,
    academicYear: calculateAcademicYear(yearRaw, termRaw),
    term: calculateTermLabel(termRaw)
  };
}

function makePaperFileName(spec, version) {
  return `${spec.courseCode}-${spec.yearRaw}-${spec.termRaw}-${version}`;
}

function generateDocx(mdPath) {
  const result = spawnSync("python3", [docxScriptPath, mdPath], {
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(
      `DOCX转换失败：${mdPath}\n${stderr || stdout || "unknown error"}`
    );
  }

  const output = (result.stdout || "").trim();
  if (output) {
    console.log(output);
  }
}

function renderSingle(question, index) {
  return `${index}. ${getQuestionText(question, "single")}\n\n${question.options.map(option => `(${option.value})${option.text}`).join(" ")}\n`;
}

function renderJudge(question, index) {
  return `${index}. ${getQuestionText(question, "judge")}( )`;
}

function renderFill(question, index) {
  return `${index}. ${getQuestionText(question, "fill")}`;
}

function renderCalc(question, index) {
  return `${index}. ${question.question}`;
}

function ensureSentenceEnding(text) {
  return /[。！？!?；;]$/.test(text) ? text : `${text}。`;
}

function renderEssay(question, index) {
  return `${index}. ${ensureSentenceEnding(question.question)}`;
}

function sectionTotal(count, score) {
  return count * score;
}

function makePaper(spec) {
  const singleRaw = padToCount(
    uniqueByQuestion(collectTopicQuestions("single", 1)),
    uniqueByQuestion(collectAllQuestions("single")),
    DEFAULT_EXAM_LAYOUT.singleCount
  );
  const judgeRaw = padToCount(
    uniqueByQuestion(collectTopicQuestions("judge", 1)),
    uniqueByQuestion(collectAllQuestions("judge")),
    DEFAULT_EXAM_LAYOUT.judgeCount
  );
  const fillRaw = padToCount(
    uniqueByQuestion(collectTopicQuestions("fill", 2)),
    uniqueByQuestion(collectAllQuestions("fill")),
    DEFAULT_EXAM_LAYOUT.fillCount
  );

  const single = singleRaw.map(question => normalizeQuestion(question, "single", topicNames[question.topic || ""] || "", question.topic || ""));
  const judge = judgeRaw.map(question => normalizeQuestion(question, "judge", topicNames[question.topic || ""] || "", question.topic || ""));
  const fill = fillRaw.map(question => normalizeQuestion(question, "fill", topicNames[question.topic || ""] || "", question.topic || ""));

  const calcQuestions = pickRandomMany(bank.calcQuestions || [], DEFAULT_EXAM_LAYOUT.calcCount);
  const essayQuestions = pickRandomMany(bank.combined || [], DEFAULT_EXAM_LAYOUT.essayCount);

  const singleStart = 1;
  const judgeStart = singleStart + DEFAULT_EXAM_LAYOUT.singleCount;
  const fillStart = judgeStart + DEFAULT_EXAM_LAYOUT.judgeCount;
  const calcStart = fillStart + DEFAULT_EXAM_LAYOUT.fillCount;
  const essayStart = calcStart + DEFAULT_EXAM_LAYOUT.calcCount;

  const singleBlock = single.map((question, index) => renderSingle(question, index + singleStart)).join("\n");
  const judgeBlock = judge.map((question, index) => renderJudge(question, index + judgeStart)).join("\n");
  const fillBlock = fill.map((question, index) => renderFill(question, index + fillStart)).join("\n");
  const calcBlock = calcQuestions.map((question, index) => renderCalc(question, index + calcStart)).join("\n\n");
  const essayBlock = essayQuestions.map((question, index) => renderEssay(question, index + essayStart)).join("\n\n");

  const paper = fillTemplate(template, {
    school: DEFAULT_EXAM_LAYOUT.school,
    academicYear: spec.academicYear,
    term: spec.term,
    courseName: spec.courseName,
    paperVersion: spec.paperVersion,
    paperCode: spec.paperCode,
    targetMajor: spec.targetMajor,
    singleQuestions: singleBlock,
    judgeQuestions: judgeBlock,
    fillQuestions: fillBlock,
    calcQuestions: calcBlock,
    essayQuestions: essayBlock
  });

  const answer = [
    `# ${DEFAULT_EXAM_LAYOUT.school}${spec.academicYear}学年${spec.term}学期期末考试`,
    ``,
    `《${spec.courseName}》试题（${spec.paperVersion}卷）参考答案`,
    ``,
    `## 一、单项选择题（每小题${DEFAULT_EXAM_LAYOUT.singleScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.singleCount, DEFAULT_EXAM_LAYOUT.singleScore)}分）`,
    ``,
    single.map((q, i) => `${i + singleStart}. ${q.correctAnswer}`).join(" "),
    ``,
    `## 二、判断题（每小题${DEFAULT_EXAM_LAYOUT.judgeScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.judgeCount, DEFAULT_EXAM_LAYOUT.judgeScore)}分）`,
    ``,
    judge.map((q, i) => `${i + judgeStart}. ${q.correctAnswer === "A" ? "T" : "F"}`).join(" "),
    ``,
    `## 三、填空题（每小题${DEFAULT_EXAM_LAYOUT.fillScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.fillCount, DEFAULT_EXAM_LAYOUT.fillScore)}分）`,
    ``,
    fill.map((q, i) => `${i + fillStart}. ${q.options[0].text}`).join("\n"),
    ``,
    `## 四、计算题（每小题${DEFAULT_EXAM_LAYOUT.calcScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.calcCount, DEFAULT_EXAM_LAYOUT.calcScore)}分）`,
    ``,
    calcQuestions.map((q, i) => `### ${i + calcStart}. ${q.prompt || "计算题"}\n\n${q.answer}`).join("\n\n"),
    ``,
    `## 五、简答题（每小题${DEFAULT_EXAM_LAYOUT.essayScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.essayCount, DEFAULT_EXAM_LAYOUT.essayScore)}分）`,
    ``,
    essayQuestions.map((q, i) => `### ${i + essayStart}. ${q.prompt || "简答题"}\n\n${q.answer}`).join("\n\n")
  ].join("\n");

  return { paper, answer };
}

const fileName = process.argv[2] || "xm-2026-1-A.md";
const spec = loadExamSpec(fileName);
const versions = ["A", "B"];

versions.forEach(version => {
  const currentSpec = Object.assign({}, spec, {
    paperVersion: version,
    versionRaw: version
  });
  const { paper, answer } = makePaper(currentSpec);
  const baseName = makePaperFileName(currentSpec, version);
  const outPaper = path.join(__dirname, `../docs/${baseName}.md`);
  const outAnswer = path.join(__dirname, `../docs/${baseName}k.md`);
  fs.writeFileSync(outPaper, paper);
  fs.writeFileSync(outAnswer, answer);
  console.log(outPaper);
  console.log(outAnswer);
  generateDocx(outPaper);
});
