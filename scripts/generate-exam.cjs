const fs = require("fs");
const path = require("path");
// Resolved at call time so callers (and tests) can stub child_process.spawnSync.
const childProcess = require("child_process");
// Template is shared by every course: course-specific values are {{placeholders}}.
const templatePath = path.join(__dirname, "../docs/exam-template.md");
const examifPath = path.join(__dirname, "../docs/examif.json");
const docxScriptPath = path.join(__dirname, "generate-exam-docx.py");
const examif = JSON.parse(fs.readFileSync(examifPath, "utf8"));

let templateCache = null;

function getTemplate() {
  if (templateCache !== null) return templateCache;

  if (!fs.existsSync(templatePath)) {
    throw new Error(`未找到试卷模板：${templatePath}。模板为各课程共用，课程名通过 {{courseName}} 占位符替换。`);
  }

  templateCache = fs.readFileSync(templatePath, "utf8");
  return templateCache;
}

const DEFAULT_EXAM_LAYOUT = {
  school: "黄河科技学院",
  singleCount: 20,
  judgeCount: 10,
  fillCount: 10,
  calcCount: 2,
  essayCount: 3,
  singleScore: 1,
  judgeScore: 1,
  fillScore: 1,
  calcScore: 15,
  essayScore: 10
};

const COURSE_NAME_MAP = {
  xm: "机器学习概论",
  cv: "计算机视觉基础"
};

function createExamGenerator({ bank, engine, courseCode, topicOrder, topicNames, fillPerTopic, defaultFileName }) {
  const { getQuestions, pickRandomMany, normalizeQuestion, getQuestionText } = engine;

  function fillTemplate(text, values) {
    return Object.keys(values).reduce((result, key) => {
      const value = values[key];

      if (value === undefined || value === null) {
        throw new Error(`试卷模板占位符 {{${key}}} 没有取值，请检查 docs/examif.json 中的配置。`);
      }

      // 使用函数式 replacement：字符串形式的替换值会把题干里的 $& / $1 / $$ / $` 当成替换模式，
      // 导致含 LaTeX 的题干被静默改写。
      return result.replaceAll(`{{${key}}}`, () => String(value));
    }, text);
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
    if (current.length >= targetCount) return current.slice(0, targetCount);

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
      const matchedEntry = entries.find(([, value]) => value && value.courseCode === courseCode);
      record = matchedEntry ? matchedEntry[1] : entries[0][1];
      key = matchedEntry ? matchedEntry[0] : entries[0][0];
    }

    const actualCourseCode = String(record.courseCode || "").toLowerCase();
    const courseName = record.courseName || COURSE_NAME_MAP[actualCourseCode];
    const yearRaw = Number(record.yearRaw);
    const termRaw = Number(record.termRaw);
    const versionRaw = normalizeVersionRaw(String(record.versionRaw || "A"));

    if (!actualCourseCode || !courseName) {
      throw new Error(`考试配置缺少 courseCode/courseName：${key}`);
    }

    if (!Number.isFinite(yearRaw) || !Number.isFinite(termRaw)) {
      throw new Error(`考试配置中的 yearRaw/termRaw 非法：${key}`);
    }

    return {
      key,
      courseCode: actualCourseCode,
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
    const pythonBin = process.env.PYTHON || "python3";
    const result = childProcess.spawnSync(pythonBin, [docxScriptPath, mdPath], {
      encoding: "utf8",
      stdio: "pipe"
    });

    if (result.status !== 0) {
      const stderr = (result.stderr || "").trim();
      const stdout = (result.stdout || "").trim();
      throw new Error(`DOCX转换失败：${mdPath}\n${stderr || stdout || "unknown error"}`);
    }

    const output = (result.stdout || "").trim();
    if (output) console.log(output);
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

  function joinGrouped(items, perLine) {
    const lines = [];
    for (let i = 0; i < items.length; i += perLine) {
      lines.push(items.slice(i, i + perLine).join(" "));
    }
    return lines.join("\n");
  }

  function sectionTotal(count, score) {
    return count * score;
  }

  function makePaper(spec) {
    const questionSets = ["single", "judge", "fill"].map(type => padToCount(
      uniqueByQuestion(collectTopicQuestions(type, type === "fill" ? fillPerTopic : 1)),
      uniqueByQuestion(collectAllQuestions(type)),
      DEFAULT_EXAM_LAYOUT[`${type}Count`]
    ));
    const [singleRaw, judgeRaw, fillRaw] = questionSets;
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

    const paper = fillTemplate(getTemplate(), {
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
      joinGrouped(single.map((q, i) => `${i + singleStart}. ${q.correctAnswer}`), 5),
      ``,
      `## 二、判断题（每小题${DEFAULT_EXAM_LAYOUT.judgeScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.judgeCount, DEFAULT_EXAM_LAYOUT.judgeScore)}分）`,
      ``,
      joinGrouped(judge.map((q, i) => `${i + judgeStart}. ${q.correctAnswer === "A" ? "T" : "F"}`), 5),
      ``,
      `## 三、填空题（每小题${DEFAULT_EXAM_LAYOUT.fillScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.fillCount, DEFAULT_EXAM_LAYOUT.fillScore)}分）`,
      ``,
      joinGrouped(fill.map((q, i) => `${i + fillStart}. ${q.options[0].text}`), 5),
      ``,
      `## 四、计算题（每小题${DEFAULT_EXAM_LAYOUT.calcScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.calcCount, DEFAULT_EXAM_LAYOUT.calcScore)}分）`,
      ``,
      calcQuestions.map((q, i) => `### ${i + calcStart}. ${q.prompt || "计算题"}\n\n${q.answer}`).join("\n\n"),
      ``,
      `## 五、简答题（每小题${DEFAULT_EXAM_LAYOUT.essayScore}分，共${sectionTotal(DEFAULT_EXAM_LAYOUT.essayCount, DEFAULT_EXAM_LAYOUT.essayScore)}分）`,
      ``,
      essayQuestions.map((q, i) => `### ${i + essayStart}. ${q.prompt || "简答题"}\n\n${q.answer}`).join("\n\n")
    ].join("\n");

    return {
      paper,
      answer,
      counts: {
        single: single.length,
        judge: judge.length,
        fill: fill.length,
        calc: calcQuestions.length,
        essay: essayQuestions.length
      }
    };
  }

  function getTitlePreview(text) {
    return text.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 2).join(" ");
  }

  function buildManifestEntry({ spec, version, outPaper, outAnswer, paper, answer, counts }) {
    return {
      version,
      courseCode: spec.courseCode,
      courseName: spec.courseName,
      paperCode: spec.paperCode,
      academicYear: spec.academicYear,
      term: spec.term,
      targetMajor: spec.targetMajor,
      outPaper,
      outAnswer,
      paperTitle: getTitlePreview(paper),
      answerTitle: getTitlePreview(answer),
      paperLength: paper.length,
      answerLength: answer.length,
      paperBytes: Buffer.byteLength(paper, "utf8"),
      answerBytes: Buffer.byteLength(answer, "utf8"),
      counts
    };
  }

  function publishGeneratedArtifacts({ manifestEntry, paper, answer }) {
    fs.writeFileSync(manifestEntry.outPaper, paper);
    fs.writeFileSync(manifestEntry.outAnswer, answer);
    console.log(manifestEntry.outPaper);
    console.log(manifestEntry.outAnswer);
    generateDocx(manifestEntry.outPaper);
    return manifestEntry;
  }

  function buildVersionArtifacts({ spec, version }) {
    const currentSpec = Object.assign({}, spec, { paperVersion: version, versionRaw: version });
    const { paper, answer, counts } = makePaper(currentSpec);
    const baseName = makePaperFileName(currentSpec, version);
    const outPaper = path.join(__dirname, `../docs/${baseName}.md`);
    const outAnswer = path.join(__dirname, `../docs/${baseName}k.md`);

    return {
      manifestEntry: buildManifestEntry({ spec: currentSpec, version, outPaper, outAnswer, paper, answer, counts }),
      paper,
      answer
    };
  }

  function runCli(fileName = process.argv[2] || defaultFileName, versions = ["A", "B"]) {
    const spec = loadExamSpec(fileName);
    return versions.map(version => {
      const { manifestEntry, paper, answer } = buildVersionArtifacts({ spec, version });
      return publishGeneratedArtifacts({ manifestEntry, paper, answer });
    });
  }

  return {
    buildManifestEntry,
    buildVersionArtifacts,
    fillTemplate,
    loadExamSpec,
    makePaper,
    makePaperFileName,
    publishGeneratedArtifacts,
    runCli
  };
}

module.exports = { createExamGenerator };
