const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const scriptPath = path.join(__dirname, "generate-exam-ml.cjs");

function withMocks(testFn) {
  return (t) => {
    delete require.cache[require.resolve(scriptPath)];

    const writes = [];
    const spawns = [];
    const logs = [];
    const orig = { write: fs.writeFileSync, spawn: childProcess.spawnSync, log: console.log };

    fs.writeFileSync = (filePath, content) => writes.push({ filePath, content });
    childProcess.spawnSync = (command, args) => {
      spawns.push({ command, args });
      return { status: 0, stdout: "", stderr: "" };
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
  assert.equal(manifestEntry.courseCode, "xm");
  assert.equal(manifestEntry.outPaper, "/tmp/ml-2025-2-A.md");
  assert.deepEqual(manifestEntry.counts, counts);

  assert.equal(examModule.publishGeneratedArtifacts({ manifestEntry, paper, answer }), manifestEntry);

  const versionArtifacts = examModule.buildVersionArtifacts({ spec, version: "A" });
  assert.equal(versionArtifacts.manifestEntry.version, "A");
  assert.equal(versionArtifacts.manifestEntry.courseCode, "xm");
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
  assert.deepEqual(writes, [
    { filePath: "/tmp/ml-2025-2-A.md", content: "paper body" },
    { filePath: "/tmp/ml-2025-2-Ak.md", content: "answer body" },
  ]);
  assert.deepEqual(logs, ["/tmp/ml-2025-2-A.md", "/tmp/ml-2025-2-Ak.md"]);
  assert.equal(spawns.length, 1);
  assert.equal(spawns[0].command, "python3");
  assert.deepEqual(spawns[0].args.slice(-2), [
    path.join(__dirname, "generate-exam-docx.py"),
    "/tmp/ml-2025-2-A.md",
  ]);
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
  assert.equal(m.courseCode, "xm");
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
  assert.equal(writes.length, 4);
  assert.equal(spawns.length, 2);
  assert.equal(logs.length, 4);
}));

test("runCli can generate a selected version list", withMocks(({ examModule, writes, spawns }) => {
  const manifest = examModule.runCli("ml-2026-1-A.md", ["B"]);

  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].version, "B");
  assert.equal(path.basename(manifest[0].outPaper), "ml-2025-2-B.md");
  assert.equal(path.basename(manifest[0].outAnswer), "ml-2025-2-Bk.md");
  assert.equal(writes.length, 2);
  assert.equal(spawns.length, 1);
}));
