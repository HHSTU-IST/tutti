const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("./data-dir.cjs");

// 规则文件与作业文件都落在运行数据目录里：部署时把 TUTTI_DATA_DIR 指到持久卷，
// 管理员设的上传规则和学员作业就不会随重新发布一起丢。
const RULES_PATH = process.env.TUTTI_RULES_PATH || path.join(DATA_DIR, "upload-rules.json");
const UPLOADS_DIR = process.env.TUTTI_UPLOADS_DIR || path.join(DATA_DIR, "uploads");
const INDEX_PATH = () => path.join(UPLOADS_DIR, "index.json");

// 默认规则：学号_姓名_课程代码.pdf，例如 2023010101_张三_py.pdf
const DEFAULT_RULES = {
  allowedExtensions: [".pdf", ".docx"],
  maxSizeMb: 10,
  filenamePattern: "^[^_\\\\/]+_[^_\\\\/]+_[a-z]{2}\\.(?:pdf|docx)$",
  filenameHint: "学号_姓名_课程代码，例如 2023010101_张三_py.pdf"
};

const MAX_SIZE_LIMIT_MB = 200;

// base64 每 3 字节膨胀成 4 字符，再留出 JSON 包裹与文件名的余量。
// 上限按「当前规则里的 maxSizeMb」推导，保证一个刚好合规的文件必定能通过传输层、
// 交给 checkFile 给出精确的判定，而不是被一个和规则脱节的固定值提前挡掉。
const BASE64_INFLATION = 4 / 3;
const BODY_SLACK_BYTES = 1024 * 1024;

function uploadBodyLimitBytes(rules) {
  const active = rules || readRules();
  const fileBytes = active.maxSizeMb * 1024 * 1024;
  return Math.ceil(fileBytes * BASE64_INFLATION) + BODY_SLACK_BYTES;
}

// 传输层挡下超大请求时，给出和规则一致的根因文案（而不是「请求体过大」这种看不出所以然的）。
function describeUploadOversize(rules) {
  const active = rules || readRules();
  return `文件超过 ${active.maxSizeMb} MB 上限`;
}

function readRules() {
  if (!fs.existsSync(RULES_PATH)) return Object.assign({}, DEFAULT_RULES);

  try {
    return normalizeRules(JSON.parse(fs.readFileSync(RULES_PATH, "utf8")));
  } catch {
    // 规则文件损坏时退回默认值，避免整个上传功能不可用。
    return Object.assign({}, DEFAULT_RULES);
  }
}

// 文件名长度上限：ReDoS 的燃料是「足够长的输入」，先给文件名封顶，既挡掉明显的超长投毒，
// 也把任何漏网模式的回溯规模约束在一个很小的范围内。真实作业文件名远小于此（默认规则里
// 是 学号_姓名_课程代码），200 字符足够宽松。
const MAX_FILENAME_CHARS = 200;

// 从 src[i]（应为 "["）跳过整个字符类，返回 "]" 之后的下标。字符类里的 + * ? 等都是字面量，
// 不能当量词看，否则默认规则里的 [^_\/]+ 会被误判。
function skipCharClass(src, i) {
  i += 1;
  if (src[i] === "^") i += 1;
  if (src[i] === "]") i += 1; // 紧跟 "^" 或开头的 "]" 是字面量
  while (i < src.length) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === "]") return i + 1;
    i += 1;
  }
  return i;
}

// 给定 "(" 的下标，返回与其配对的 ")" 下标；处理转义与字符类，找不到返回 -1。
function findMatchingParen(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i += 1) {
    const c = src[i];
    if (c === "\\") { i += 1; continue; }
    if (c === "[") { i = skipCharClass(src, i) - 1; continue; }
    if (c === "(") depth += 1;
    else if (c === ")") { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

// body 里是否存在「开放/无界量词」（*、+、{m,}）。有界 {m,n} 不算——它重复次数恒定，不会指数爆炸。
function bodyHasOpenQuantifier(body) {
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (c === "\\") { i += 1; continue; }
    if (c === "[") { i = skipCharClass(body, i) - 1; continue; }
    if (c === "*" || c === "+") return true;
    if (c === "{" && /^\{\d+,\}/.test(body.slice(i))) return true;
  }
  return false;
}

// 紧跟在 ")" 之后的量词是否为无界（*、+、{m,}）。
function groupIsQuantifiedOpenEnded(src, closeIdx) {
  const rest = src.slice(closeIdx + 1);
  return /^[*+]/.test(rest) || /^\{\d+,\}/.test(rest);
}

// 保守的静态检测：只抓最典型的「量词套量词」灾难性回溯，如 (a+)+、(\w*)*、(.*)+。
// 判定偏严——宁可误拒一些少见但安全的写法，也不放过常见 ReDoS。检测在保存与读取两头都会跑。
function isReDoSProne(src) {
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === "\\") { i += 1; continue; }
    if (c === "[") { i = skipCharClass(src, i) - 1; continue; }
    if (c !== "(") continue;

    const closeIdx = findMatchingParen(src, i);
    if (closeIdx < 0) continue;

    if (groupIsQuantifiedOpenEnded(src, closeIdx) && bodyHasOpenQuantifier(src.slice(i + 1, closeIdx))) {
      return true;
    }
  }
  return false;
}

function normalizeRules(input) {
  const source = input && typeof input === "object" ? input : {};
  const extensions = (Array.isArray(source.allowedExtensions) ? source.allowedExtensions : [])
    .map(item => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .map(item => (item.startsWith(".") ? item : `.${item}`));

  if (!extensions.length) {
    throw new Error("至少需要一种允许的文件格式");
  }

  const pattern = String(source.filenamePattern === undefined ? DEFAULT_RULES.filenamePattern : source.filenamePattern);
  try {
    new RegExp(pattern);
  } catch (error) {
    throw new Error(`文件名规则不是合法的正则表达式：${error.message}`);
  }

  // 管理员可改的这个正则会跑在用户提交的文件名上——一个 (a+)+ 式的模式能让单个请求把 CPU 打满。
  // 这道复杂度检查在 normalizeRules 里，意味着「保存」和「读取」两头都会过：手改进规则文件的
  // 危险模式，readRules 会在这里抛错、回退到默认规则，等于被自动中和。
  if (isReDoSProne(pattern)) {
    throw new Error("文件名规则可能存在灾难性回溯（如 (a+)+ 这类嵌套量词），请简化后重试");
  }

  const maxSizeMb = Number(source.maxSizeMb === undefined ? DEFAULT_RULES.maxSizeMb : source.maxSizeMb);
  if (!Number.isFinite(maxSizeMb) || maxSizeMb <= 0 || maxSizeMb > MAX_SIZE_LIMIT_MB) {
    throw new Error(`单个文件大小上限需在 1 到 ${MAX_SIZE_LIMIT_MB} MB 之间`);
  }

  return {
    allowedExtensions: Array.from(new Set(extensions)),
    maxSizeMb: Math.round(maxSizeMb),
    filenamePattern: pattern,
    filenameHint: String(source.filenameHint === undefined ? "" : source.filenameHint).trim()
  };
}

function writeRules(input) {
  const rules = normalizeRules(input);
  fs.mkdirSync(path.dirname(RULES_PATH), { recursive: true });
  fs.writeFileSync(RULES_PATH, `${JSON.stringify(rules, null, 2)}\n`);
  return rules;
}

function describeRules(rules) {
  return Object.assign({}, rules, {
    extensionsText: rules.allowedExtensions.join("、")
  });
}

function checkFile(fileName, sizeBytes, rules) {
  const name = String(fileName || "");
  const base = path.basename(name);

  // 只接受纯文件名，挡掉 ../ 和路径分隔符这类写法。
  if (!base || base !== name || base === "." || base === "..") {
    return { ok: false, error: "文件名不合法" };
  }

  const extension = path.extname(base).toLowerCase();
  if (!rules.allowedExtensions.includes(extension)) {
    return { ok: false, error: `不支持的文件格式 ${extension || "（无扩展名）"}，仅允许 ${rules.allowedExtensions.join("、")}` };
  }

  const size = Number(sizeBytes) || 0;
  if (size > rules.maxSizeMb * 1024 * 1024) {
    return { ok: false, error: `文件超过 ${rules.maxSizeMb} MB 上限` };
  }

  // 先给长度封顶，再跑正则：即便某个危险模式漏过了静态检测，回溯规模也被这个上限钉死在小范围。
  if (base.length > MAX_FILENAME_CHARS) {
    return { ok: false, error: `文件名过长（最多 ${MAX_FILENAME_CHARS} 个字符）` };
  }

  if (rules.filenamePattern && !new RegExp(rules.filenamePattern).test(base)) {
    return {
      ok: false,
      error: rules.filenameHint ? `文件名不符合要求：${rules.filenameHint}` : "文件名不符合要求"
    };
  }

  return { ok: true, error: "", extension, safeName: base.replace(/[\\/:*?"<>|\s]+/g, "_") };
}

function readIndex() {
  if (!fs.existsSync(INDEX_PATH())) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(INDEX_PATH(), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 索引是「读-改-写」的共享文件：多实例共享同一 TUTTI_DATA_DIR 时，两条并发上传会互相覆盖
// （后写的把先写的记录冲掉＝丢更新），中途崩溃还会留下半截 JSON。两层防护：
// 1) 落盘一律 tmp+rename——rename 在同一文件系统上是原子的，读者永远看到完整文件；
// 2) 用 O_EXCL 建的锁文件把整个读-改-写临界区跨进程串行化（与写会话文件同理）。
function writeIndexAtomic(records) {
  const tmpPath = `${INDEX_PATH()}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(records, null, 2)}\n`);
  fs.renameSync(tmpPath, INDEX_PATH());
}

function indexLockPath() {
  return `${INDEX_PATH()}.lock`;
}

// 同步短睡：上传路径本就是同步 fs 操作，争锁极少且窗口极短，阻塞几毫秒不影响吞吐。
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const LOCK_ACQUIRE_TIMEOUT_MS = Number(process.env.TUTTI_INDEX_LOCK_TIMEOUT_MS) > 0 ? Number(process.env.TUTTI_INDEX_LOCK_TIMEOUT_MS) : 5000;
const LOCK_RETRY_MS = 25;
// 持锁进程若中途崩溃没来得及放锁，超过这个时长就判定为陈旧锁并抢占，避免永久卡死。
const LOCK_STALE_MS = 15000;

function withIndexLock(mutate) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const lockPath = indexLockPath();
  const deadline = Date.now() + LOCK_ACQUIRE_TIMEOUT_MS;

  for (;;) {
    let fd;
    try {
      fd = fs.openSync(lockPath, "wx"); // O_CREAT|O_EXCL：只有第一个进程能建成，天然的互斥
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockPath).mtimeMs;
      } catch {
        age = 0; // 锁刚被别人放了：下一轮重试即可
      }

      if (age > LOCK_STALE_MS) {
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {
          // 抢删失败交给下一轮重试或超时。
        }
        continue;
      }

      if (Date.now() >= deadline) {
        const timeout = new Error("上传记录正被其它操作占用，请稍后重试");
        timeout.status = 503;
        throw timeout;
      }

      sleepSync(LOCK_RETRY_MS);
    }
  }

  try {
    return mutate();
  } finally {
    try {
      fs.rmSync(lockPath, { force: true });
    } catch {
      // 锁文件已不在（被陈旧清理）也无妨：本进程的临界区已经走完。
    }
  }
}

function saveUpload({ courseId, username, fileName, sizeBytes, content }) {
  const rules = readRules();
  const check = checkFile(fileName, sizeBytes, rules);
  if (!check.ok) {
    const error = new Error(check.error);
    error.status = 400;
    throw error;
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${check.safeName}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, storedName), content);

  const record = {
    id: storedName,
    courseId,
    username,
    originalName: check.safeName,
    storedName,
    sizeBytes,
    uploadedAt: new Date().toISOString()
  };

  // 读-改-写整段进锁：否则两条并发上传会各自读到同一份旧索引、后写的覆盖先写的。
  withIndexLock(() => {
    const records = readIndex();
    records.push(record);
    writeIndexAtomic(records);
  });

  return record;
}

function listUploads({ username, isAdmin }) {
  return readIndex().filter(record => isAdmin || record.username === username);
}

/**
 * 删除一条上传：先把文件删掉，再删索引里那条记录。
 *
 * 顺序不能反——反过来的话文件留在盘上没人认领，管理员只能自己去目录里翻。
 * 只允许本人或管理员操作；索引文件可能是手改过的，所以 storedName 也当不可信输入处理。
 * 读-改-写同样进锁，避免和管理员的新上传互相覆盖。
 */
function deleteUpload({ id, username, isAdmin }) {
  return withIndexLock(() => {
    const records = readIndex();
    const index = records.findIndex(record => record.id === id);
    if (index < 0) {
      const error = new Error("上传记录不存在");
      error.status = 404;
      throw error;
    }

    const record = records[index];
    if (!isAdmin && record.username !== username) {
      const error = new Error("只能删除自己的上传记录");
      error.status = 403;
      throw error;
    }

    removeStoredFile(record.storedName);

    const remaining = records.slice();
    remaining.splice(index, 1);
    writeIndexAtomic(remaining);

    return record;
  });
}

// 落盘文件名一律在 UPLOADS_DIR 里按纯文件名解析：storedName 里带 ../ 时直接跳过，不碰目录外的文件。
function removeStoredFile(storedName) {
  const name = String(storedName || "");
  if (!name || path.basename(name) !== name) return;

  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, name));
  } catch (error) {
    // 文件已经不在（手工清理过）不算失败：索引记录照样要删，否则界面会留一条删不掉的幽灵记录。
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  DEFAULT_RULES,
  MAX_FILENAME_CHARS,
  MAX_SIZE_LIMIT_MB,
  RULES_PATH,
  UPLOADS_DIR,
  checkFile,
  deleteUpload,
  describeRules,
  describeUploadOversize,
  isReDoSProne,
  listUploads,
  normalizeRules,
  readRules,
  saveUpload,
  uploadBodyLimitBytes,
  writeRules
};
