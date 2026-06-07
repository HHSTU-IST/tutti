const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const scriptPath = path.join(__dirname, "generate-exam-xm.cjs");

test("generate-exam-xm test stays focused on paper generation behavior", () => {
  const source = fs.readFileSync(__filename, "utf8");

  assert.doesNotMatch(source, /load-quiz-engine\.cjs/);
  assert.doesNotMatch(source, /load-topic-bank\.cjs/);
  assert.doesNotMatch(source, /load-ts-module\.cjs/);
});

test("generate-exam-xm exports testable paper generation helpers", () => {
  delete require.cache[require.resolve(scriptPath)];

  const originalWriteFileSync = fs.writeFileSync;
  const originalSpawnSync = childProcess.spawnSync;
  const originalLog = console.log;

  fs.writeFileSync = () => {};
  childProcess.spawnSync = () => ({ status: 0, stdout: "", stderr: "" });
  console.log = () => {};

  try {
    const examModule = require(scriptPath);

    assert.equal(typeof examModule.loadExamSpec, "function");
    assert.equal(typeof examModule.makePaper, "function");
    assert.equal(typeof examModule.buildManifestEntry, "function");
    assert.equal(typeof examModule.buildVersionArtifacts, "function");
    assert.equal(typeof examModule.publishGeneratedArtifacts, "function");

    const spec = examModule.loadExamSpec("xm-2026-1-A.md");
    const { paper, answer, counts } = examModule.makePaper(spec);
    const manifestEntry = examModule.buildManifestEntry({
      spec,
      version: "A",
      outPaper: "/tmp/xm-2025-2-A.md",
      outAnswer: "/tmp/xm-2025-2-Ak.md",
      paper,
      answer,
      counts
    });

    assert.match(paper, /机器学习概论/);
    assert.match(answer, /参考答案/);
    assert.equal(manifestEntry.version, "A");
    assert.equal(manifestEntry.courseCode, "xm");
    assert.equal(manifestEntry.outPaper, "/tmp/xm-2025-2-A.md");
    assert.deepEqual(manifestEntry.counts, counts);

    const publishedEntry = examModule.publishGeneratedArtifacts({
      manifestEntry,
      paper,
      answer
    });
    assert.equal(publishedEntry, manifestEntry);

    const versionArtifacts = examModule.buildVersionArtifacts({
      spec,
      version: "A"
    });
    assert.equal(versionArtifacts.manifestEntry.version, "A");
    assert.equal(versionArtifacts.manifestEntry.courseCode, "xm");
    assert.match(versionArtifacts.paper, /机器学习概论/);
    assert.match(versionArtifacts.answer, /参考答案/);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
    childProcess.spawnSync = originalSpawnSync;
    console.log = originalLog;
    delete require.cache[require.resolve(scriptPath)];
  }
});

test("publishGeneratedArtifacts writes files, logs paths, and triggers docx export", () => {
  delete require.cache[require.resolve(scriptPath)];

  const writes = [];
  const spawns = [];
  const logs = [];
  const originalWriteFileSync = fs.writeFileSync;
  const originalSpawnSync = childProcess.spawnSync;
  const originalLog = console.log;

  fs.writeFileSync = (filePath, content) => {
    writes.push({ filePath, content });
  };
  childProcess.spawnSync = (command, args) => {
    spawns.push({ command, args });
    return { status: 0, stdout: "", stderr: "" };
  };
  console.log = value => {
    logs.push(value);
  };

  try {
    const examModule = require(scriptPath);
    const manifestEntry = {
      outPaper: "/tmp/xm-2025-2-A.md",
      outAnswer: "/tmp/xm-2025-2-Ak.md"
    };
    const result = examModule.publishGeneratedArtifacts({
      manifestEntry,
      paper: "paper body",
      answer: "answer body"
    });

    assert.equal(result, manifestEntry);
    assert.deepEqual(writes, [
      { filePath: "/tmp/xm-2025-2-A.md", content: "paper body" },
      { filePath: "/tmp/xm-2025-2-Ak.md", content: "answer body" }
    ]);
    assert.deepEqual(logs, [
      "/tmp/xm-2025-2-A.md",
      "/tmp/xm-2025-2-Ak.md"
    ]);
    assert.equal(spawns.length, 1);
    assert.equal(spawns[0].command, "python3");
    assert.deepEqual(spawns[0].args.slice(-2), [
      path.join(__dirname, "generate-exam-docx.py"),
      "/tmp/xm-2025-2-A.md"
    ]);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
    childProcess.spawnSync = originalSpawnSync;
    console.log = originalLog;
    delete require.cache[require.resolve(scriptPath)];
  }
});

test("runCli returns a manifest for both generated paper versions", () => {
  delete require.cache[require.resolve(scriptPath)];

  const writes = [];
  const spawns = [];
  const logs = [];
  const originalWriteFileSync = fs.writeFileSync;
  const originalSpawnSync = childProcess.spawnSync;
  const originalLog = console.log;

  fs.writeFileSync = (filePath, content) => {
    writes.push({ filePath, content });
  };
  childProcess.spawnSync = (command, args) => {
    spawns.push({ command, args });
    return { status: 0, stdout: "", stderr: "" };
  };
  console.log = value => {
    logs.push(value);
  };

  try {
    const examModule = require(scriptPath);
    const manifest = examModule.runCli("xm-2026-1-A.md");

    assert.equal(Array.isArray(manifest), true);
    assert.equal(manifest.length, 2);
    assert.deepEqual(manifest.map(item => item.version), ["A", "B"]);
    assert.deepEqual(
      manifest.map(item => path.basename(item.outPaper)),
      ["xm-2025-2-A.md", "xm-2025-2-B.md"]
    );
    assert.deepEqual(
      manifest.map(item => path.basename(item.outAnswer)),
      ["xm-2025-2-Ak.md", "xm-2025-2-Bk.md"]
    );
    assert.equal(typeof manifest[0].paperTitle, "string");
    assert.equal(typeof manifest[0].answerTitle, "string");
    assert.equal(typeof manifest[0].paperLength, "number");
    assert.equal(typeof manifest[0].answerLength, "number");
    assert.equal(typeof manifest[0].paperBytes, "number");
    assert.equal(typeof manifest[0].answerBytes, "number");
    assert.deepEqual(manifest[0].counts, {
      single: 20,
      judge: 10,
      fill: 10,
      calc: 2,
      essay: 3
    });
    assert.equal(manifest[0].courseCode, "xm");
    assert.equal(manifest[0].courseName, "机器学习概论");
    assert.equal(manifest[0].paperCode, "010822405");
    assert.equal(manifest[0].academicYear, "2025-2026");
    assert.equal(manifest[0].term, "第二");
    assert.match(manifest[0].targetMajor, /计算机科学与技术/);
    assert.match(manifest[0].paperTitle, /机器学习概论/);
    assert.match(manifest[0].answerTitle, /参考答案/);
    assert.equal(manifest[0].paperLength > 0, true);
    assert.equal(manifest[0].answerLength > 0, true);
    assert.equal(manifest[0].paperBytes >= manifest[0].paperLength, true);
    assert.equal(manifest[0].answerBytes >= manifest[0].answerLength, true);
    assert.equal(writes.length, 4);
    assert.equal(spawns.length, 2);
    assert.equal(logs.length, 4);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
    childProcess.spawnSync = originalSpawnSync;
    console.log = originalLog;
    delete require.cache[require.resolve(scriptPath)];
  }
});

test("runCli can generate a selected version list", () => {
  delete require.cache[require.resolve(scriptPath)];

  const writes = [];
  const spawns = [];
  const originalWriteFileSync = fs.writeFileSync;
  const originalSpawnSync = childProcess.spawnSync;
  const originalLog = console.log;

  fs.writeFileSync = (filePath, content) => {
    writes.push({ filePath, content });
  };
  childProcess.spawnSync = (command, args) => {
    spawns.push({ command, args });
    return { status: 0, stdout: "", stderr: "" };
  };
  console.log = () => {};

  try {
    const examModule = require(scriptPath);
    const manifest = examModule.runCli("xm-2026-1-A.md", ["B"]);

    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].version, "B");
    assert.equal(path.basename(manifest[0].outPaper), "xm-2025-2-B.md");
    assert.equal(path.basename(manifest[0].outAnswer), "xm-2025-2-Bk.md");
    assert.equal(writes.length, 2);
    assert.equal(spawns.length, 1);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
    childProcess.spawnSync = originalSpawnSync;
    console.log = originalLog;
    delete require.cache[require.resolve(scriptPath)];
  }
});
