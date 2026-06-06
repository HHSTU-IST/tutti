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

    const spec = examModule.loadExamSpec("xm-2026-1-A.md");
    const { paper, answer } = examModule.makePaper(spec);

    assert.match(paper, /机器学习概论/);
    assert.match(answer, /参考答案/);
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
    assert.match(manifest[0].paperTitle, /机器学习概论/);
    assert.match(manifest[0].answerTitle, /参考答案/);
    assert.equal(manifest[0].paperLength > 0, true);
    assert.equal(manifest[0].answerLength > 0, true);
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
