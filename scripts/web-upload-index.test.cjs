const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

// 验证上传索引的两层防护：tmp+rename 原子落盘、以及跨进程读-改-写锁（防丢更新）。
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutti-idx-"));
const uploadsDir = path.join(tempDir, "uploads");

process.env.TUTTI_DATA_DIR = tempDir;
process.env.TUTTI_UPLOADS_DIR = uploadsDir;
process.env.TUTTI_RULES_PATH = path.join(tempDir, "upload-rules.json");

const uploadRules = require("../web/lib/upload-rules.cjs");
const MODULE_PATH = require.resolve("../web/lib/upload-rules.cjs");
const INDEX_FILE = path.join(uploadsDir, "index.json");

function readIndexRaw() {
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
}

function recordCount() {
  return fs.existsSync(INDEX_FILE) ? readIndexRaw().length : 0;
}

function seedRecord() {
  return uploadRules.saveUpload({
    courseId: "py",
    username: "stu-local",
    fileName: "2023010101_A_py.pdf",
    sizeBytes: 3,
    content: Buffer.from("xyz")
  });
}

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("saveUpload 原子落盘：不留下 .tmp / .lock 残留，索引可解析", () => {
  const before = recordCount();
  seedRecord();

  assert.equal(recordCount(), before + 1, "记录数应正好加一");
  const leftovers = fs.readdirSync(uploadsDir).filter(name => name.endsWith(".tmp") || name.endsWith(".lock"));
  assert.deepEqual(leftovers, [], `目录里不应残留临时/锁文件，实际有 ${leftovers.join(", ")}`);
});

test("陈旧锁会被接管：即便有进程崩了没放锁，下一次上传仍能写入", () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const lockPath = path.join(uploadsDir, "index.json.lock");
  fs.writeFileSync(lockPath, "deadpid");
  // 把 mtime 推到 16 秒前，超过 LOCK_STALE_MS(15s)，触发接管。
  const old = (Date.now() - 16_000) / 1000;
  fs.utimesSync(lockPath, old, old);

  const before = recordCount();
  assert.doesNotThrow(() => seedRecord(), "面对陈旧锁不应卡死或报错");
  assert.equal(recordCount(), before + 1, "接管后应正常写入一条");
  assert.equal(fs.existsSync(lockPath), false, "写入完成后锁应被释放");
});

test("并发上传不丢更新：多进程同时写，最终记录数等于总提交数", async () => {
  const childScript = path.join(tempDir, "writer.cjs");
  fs.writeFileSync(
    childScript,
    `const rules = require(process.env.UPLOAD_RULES_MODULE);
     const n = Number(process.env.CHILD_WRITES || "5");
     const pid = process.pid;
     for (let i = 0; i < n; i += 1) {
       rules.saveUpload({ courseId: "py", username: "stu-" + pid, fileName: "2023010101_A_py.pdf", sizeBytes: 3, content: Buffer.from("payload") });
     }`
  );

  const CHILDREN = 3;
  const PER_CHILD = 6;
  const PARENT_WRITES = 6;
  const expectedDelta = CHILDREN * PER_CHILD + PARENT_WRITES;
  const before = recordCount();

  const children = Array.from({ length: CHILDREN }, () =>
    new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [childScript], {
        env: {
          ...process.env,
          TUTTI_DATA_DIR: tempDir,
          TUTTI_UPLOADS_DIR: uploadsDir,
          TUTTI_RULES_PATH: process.env.TUTTI_RULES_PATH,
          UPLOAD_RULES_MODULE: MODULE_PATH,
          CHILD_WRITES: String(PER_CHILD)
        },
        stdio: "ignore"
      });
      proc.on("error", reject);
      proc.on("exit", code => (code === 0 ? resolve() : reject(new Error(`子进程退出码 ${code}`))));
    })
  );

  // 父进程同时也在写，和子进程抢同一把锁，制造真实的读-改-写竞争。
  const parentWrites = (async () => {
    for (let i = 0; i < PARENT_WRITES; i += 1) seedRecord();
  })();

  await Promise.all([Promise.all(children), parentWrites]);

  const after = recordCount();
  assert.equal(after - before, expectedDelta, "并发写入不应互相覆盖（丢更新）");
  assert.ok(fs.existsSync(INDEX_FILE), "索引文件应存在且是完整 JSON（前面 readIndexRaw 已成功解析）");
});
