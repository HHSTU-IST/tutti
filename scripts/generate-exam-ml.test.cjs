const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const scriptPath = path.join(__dirname, "generate-exam-ml.cjs");

function withMocks(testFn, options = {}) {
  return (t) => {
    delete require.cache[require.resolve(scriptPath)];

    const writes = [];
    const spawns = [];
    const logs = [];
    const orig = { write: fs.writeFileSync, spawn: childProcess.spawnSync, log: console.log };
    const docxScript = path.join(__dirname, "generate-exam-docx.py");

    fs.writeFileSync = (filePath, content) => writes.push({ filePath, content });
    childProcess.spawnSync = (command, args, options2) => {
      spawns.push({ command, args, input: options2 && options2.input });
      // docx 导出可以被测试注入失败结果，用来断言报错信息够不够可操作。
      if (typeof options.docxResult === "function" && (args || []).includes(docxScript)) {
        return options.docxResult({ command, args });
      }
      // rumdl fmt - 从 stdin 读取正文并把格式化结果输出到 stdout，这里回显输入以模拟真实行为。
      const echoed = options2 && typeof options2.input === "string" ? options2.input : "";
      return { status: 0, stdout: echoed, stderr: "" };
    };
    console.log = (value) => logs.push(value);

    try {
      testFn({ t, examModule: require(scriptPath), writes, spawns, logs });
    } finally {
      fs.writeFileSync = orig.write;
      childProcess.spawnSync = orig.spawn;
      console.log = orig.log;
      delete require.cache[require.resolve(scriptPath)];
    }
  };
}

// docx 导出的解释器是解析出来的（PYTHON 环境变量 > 项目 .venv > python3），
// 所以按「参数里带了 generate-exam-docx.py」认这条 spawn，而不是认命令名。
function findDocxSpawn(spawns) {
  return spawns.find((s) => (s.args || []).includes(path.join(__dirname, "generate-exam-docx.py")));
}

test("generate-exam-ml test stays focused on paper generation behavior", () => {
  const source = fs.readFileSync(__filename, "utf8");
  assert.doesNotMatch(source, /load-quiz-engine\.cjs/);
  assert.doesNotMatch(source, /load-topic-bank\.cjs/);
  assert.doesNotMatch(source, /load-ts-module\.cjs/);
});

test("generate-exam-ml exports testable paper generation helpers", withMocks(({ examModule }) => {
  for (const fn of ["loadExamSpec", "makePaper", "buildManifestEntry", "buildVersionArtifacts", "publishGeneratedArtifacts"]) {
    assert.equal(typeof examModule[fn], "function");
  }

  const spec = examModule.loadExamSpec("ml-2026-1-A.md");
  const { paper, answer, counts } = examModule.makePaper(spec);
  const manifestEntry = examModule.buildManifestEntry({
    spec, version: "A", outPaper: "/tmp/ml-2025-2-A.md", outAnswer: "/tmp/ml-2025-2-Ak.md", paper, answer, counts,
  });

  assert.match(paper, /机器学习概论/);
  assert.doesNotMatch(paper, /\{\{[a-zA-Z]+\}\}/);
  assert.match(answer, /参考答案/);
  assert.equal(manifestEntry.version, "A");
  assert.equal(manifestEntry.courseCode, "ml");
  assert.equal(manifestEntry.outPaper, "/tmp/ml-2025-2-A.md");
  assert.deepEqual(manifestEntry.counts, counts);

  assert.equal(examModule.publishGeneratedArtifacts({ manifestEntry, paper, answer }), manifestEntry);

  const versionArtifacts = examModule.buildVersionArtifacts({ spec, version: "A" });
  assert.equal(versionArtifacts.manifestEntry.version, "A");
  assert.equal(versionArtifacts.manifestEntry.courseCode, "ml");
  assert.match(versionArtifacts.paper, /机器学习概论/);
  assert.match(versionArtifacts.answer, /参考答案/);
}));

test("fillTemplate keeps replacement-pattern characters and rejects missing values", () => {
  delete require.cache[require.resolve(scriptPath)];
  const { fillTemplate } = require(scriptPath);

  // 题干含 LaTeX（$P(Y|X)$ 等）时，字符串形式的替换值会把这些序列当成替换模式并静默改写题干。
  assert.equal(fillTemplate("a {{x}} b", { x: "$&" }), "a $& b");
  assert.equal(fillTemplate("{{a}}/{{b}}", { a: "$1", b: "$$" }), "$1/$$");
  assert.equal(fillTemplate("[{{a}}]", { a: "$`" }), "[$`]");
  assert.equal(fillTemplate("f(x)={{expr}}", { expr: "$P(Y|X)$" }), "f(x)=$P(Y|X)$");
  assert.equal(fillTemplate("n={{n}}", { n: 42 }), "n=42");

  assert.throws(() => fillTemplate("{{paperCode}}", { paperCode: undefined }), /没有取值/);

  delete require.cache[require.resolve(scriptPath)];
});

test("publishGeneratedArtifacts writes files, logs paths, and triggers docx export", withMocks(({ examModule, writes, spawns, logs }) => {
  const manifestEntry = { outPaper: "/tmp/ml-2025-2-A.md", outAnswer: "/tmp/ml-2025-2-Ak.md" };
  const result = examModule.publishGeneratedArtifacts({ manifestEntry, paper: "paper body", answer: "answer body" });

  assert.equal(result, manifestEntry);

  // 每个产物只写一次：排版在内存中完成后落盘，不存在「先写原文再写格式化结果」的重复写。
  assert.deepEqual(writes, [
    { filePath: "/tmp/ml-2025-2-A.md", content: "paper body" },
    { filePath: "/tmp/ml-2025-2-Ak.md", content: "answer body" },
  ]);
  const writtenPaths = writes.map((w) => w.filePath);
  assert.equal(new Set(writtenPaths).size, writtenPaths.length, "同一个文件不应被写入多次");

  assert.deepEqual(logs, ["/tmp/ml-2025-2-A.md", "/tmp/ml-2025-2-Ak.md"]);

  // 2 次 rumdl（正文 + 答案）+ 1 次 python（docx 导出）
  assert.equal(spawns.length, 3);
  const rumdlSpawns = spawns.filter((s) => s.command === "rumdl");
  assert.equal(rumdlSpawns.length, 2);
  assert.deepEqual(rumdlSpawns.map((s) => s.args), [["format", "-"], ["format", "-"]]);
  assert.deepEqual(rumdlSpawns.map((s) => s.input), ["paper body", "answer body"]);

  const docxSpawn = findDocxSpawn(spawns);
  assert.ok(docxSpawn, "应触发 docx 导出");
  assert.match(path.basename(docxSpawn.command), /^python(\d+(\.\d+)?)?(\.exe)?$/i, "docx 导出要用 python 解释器");
  assert.deepEqual(docxSpawn.args.slice(-2), [
    path.join(__dirname, "generate-exam-docx.py"),
    "/tmp/ml-2025-2-A.md",
  ]);
}));

test("docx 导出的解释器优先级：PYTHON > 项目 .venv > python3", withMocks(({ examModule, spawns }) => {
  const manifestEntry = { outPaper: "/tmp/ml-2025-2-A.md", outAnswer: "/tmp/ml-2025-2-Ak.md" };
  const originalPython = process.env.PYTHON;

  try {
    process.env.PYTHON = "/opt/custom/python-3.14";
    examModule.publishGeneratedArtifacts({ manifestEntry, paper: "p", answer: "a" });
    assert.equal(findDocxSpawn(spawns).command, "/opt/custom/python-3.14", "PYTHON 环境变量要压过一切");

    spawns.length = 0;
    delete process.env.PYTHON;
    examModule.publishGeneratedArtifacts({ manifestEntry, paper: "p", answer: "a" });
    const resolved = findDocxSpawn(spawns).command;
    const venvWin = path.join(__dirname, "../.venv/Scripts/python.exe");
    const venvPosix = path.join(__dirname, "../.venv/bin/python");
    const hasVenv = fs.existsSync(venvWin) || fs.existsSync(venvPosix);

    if (hasVenv) {
      assert.equal(resolved, fs.existsSync(venvWin) ? venvWin : venvPosix, "项目 .venv 存在时要用它，否则装好的依赖找不到");
    } else {
      assert.equal(resolved, "python3", "没有 .venv 时退回 python3，交给系统环境");
    }
  } finally {
    if (originalPython === undefined) delete process.env.PYTHON;
    else process.env.PYTHON = originalPython;
  }
}));

test("docx 导出失败要把解释器与脚本的报错原样端出来", withMocks(({ examModule }) => {
  const manifestEntry = { outPaper: "/tmp/ml-2025-2-A.md", outAnswer: "/tmp/ml-2025-2-Ak.md" };

  assert.throws(
    () => examModule.publishGeneratedArtifacts({ manifestEntry, paper: "p", answer: "a" }),
    (error) => {
      assert.match(error.message, /DOCX转换失败/);
      assert.match(error.message, /缺少依赖 defusedxml。/, "脚本给出的可操作提示不能被吞掉");
      return true;
    },
  );
}, {
  docxResult: () => ({ status: 1, stdout: "", stderr: "缺少依赖 defusedxml。" }),
}));

test("docx 导出解释器起不来时报错要指名启动失败，不能只说 unknown error", withMocks(({ examModule }) => {
  const manifestEntry = { outPaper: "/tmp/ml-2025-2-A.md", outAnswer: "/tmp/ml-2025-2-Ak.md" };

  assert.throws(
    () => examModule.publishGeneratedArtifacts({ manifestEntry, paper: "p", answer: "a" }),
    (error) => {
      assert.doesNotMatch(error.message, /unknown error/, "启动失败必须报出原因");
      assert.match(error.message, /ENOENT/, "要带出 spawnSync 的错误码");
      return true;
    },
  );
}, {
  // 解释器路径不存在时 spawnSync 的形态：status null、两路输出皆空，线索只在 result.error。
  docxResult: ({ command }) => ({ status: null, stdout: "", stderr: "", error: Object.assign(new Error("spawnSync ENOENT"), { code: "ENOENT", path: command }) }),
}));

test("runCli returns a manifest for both generated paper versions", withMocks(({ examModule, writes, spawns, logs }) => {
  const manifest = examModule.runCli("ml-2026-1-A.md");

  assert.equal(Array.isArray(manifest), true);
  assert.equal(manifest.length, 2);
  assert.deepEqual(manifest.map((m) => m.version), ["A", "B"]);
  assert.deepEqual(
    manifest.map((m) => path.basename(m.outPaper)),
    ["ml-2025-2-A.md", "ml-2025-2-B.md"],
  );
  assert.deepEqual(
    manifest.map((m) => path.basename(m.outAnswer)),
    ["ml-2025-2-Ak.md", "ml-2025-2-Bk.md"],
  );

  const m = manifest[0];
  assert.equal(typeof m.paperTitle, "string");
  assert.equal(typeof m.answerTitle, "string");
  assert.equal(typeof m.paperLength, "number");
  assert.equal(typeof m.answerLength, "number");
  assert.equal(typeof m.paperBytes, "number");
  assert.equal(typeof m.answerBytes, "number");
  assert.deepEqual(m.counts, { single: 20, judge: 10, fill: 10, calc: 2, essay: 3 });
  assert.equal(m.courseCode, "ml");
  assert.equal(m.courseName, "机器学习概论");
  assert.equal(m.paperCode, "010822405");
  assert.equal(m.academicYear, "2025-2026");
  assert.equal(m.term, "第二");
  assert.match(m.targetMajor, /计算机科学与技术/);
  assert.match(m.paperTitle, /机器学习概论/);
  assert.match(m.answerTitle, /参考答案/);
  assert.ok(m.paperLength > 0);
  assert.ok(m.answerLength > 0);
  assert.ok(m.paperBytes >= m.paperLength);
  assert.ok(m.answerBytes >= m.answerLength);
  // 2 个版本 x (正文 + 答案) = 4 次写；每次写对应 1 次 rumdl，外加每个版本 1 次 docx 导出。
  assert.equal(writes.length, 4);
  assert.equal(new Set(writes.map((w) => w.filePath)).size, 4, "每个版本的文件只写一次");
  assert.equal(spawns.filter((s) => s.command === "rumdl").length, 4);
  assert.equal(spawns.filter((s) => (s.args || []).includes(path.join(__dirname, "generate-exam-docx.py"))).length, 2);
  assert.equal(logs.length, 4);
}));

test("runCli can generate a selected version list", withMocks(({ examModule, writes, spawns }) => {
  const manifest = examModule.runCli("ml-2026-1-A.md", ["B"]);

  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].version, "B");
  assert.equal(path.basename(manifest[0].outPaper), "ml-2025-2-B.md");
  assert.equal(path.basename(manifest[0].outAnswer), "ml-2025-2-Bk.md");
  assert.equal(writes.length, 2);
  assert.equal(spawns.length, 3);
}));
