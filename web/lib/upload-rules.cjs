const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
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

function readRules() {
  if (!fs.existsSync(RULES_PATH)) return Object.assign({}, DEFAULT_RULES);

  try {
    return normalizeRules(JSON.parse(fs.readFileSync(RULES_PATH, "utf8")));
  } catch (error) {
    // 规则文件损坏时退回默认值，避免整个上传功能不可用。
    return Object.assign({}, DEFAULT_RULES);
  }
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
  } catch (error) {
    return [];
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

  const records = readIndex();
  const record = {
    id: storedName,
    courseId,
    username,
    originalName: check.safeName,
    storedName,
    sizeBytes,
    uploadedAt: new Date().toISOString()
  };
  records.push(record);
  fs.writeFileSync(INDEX_PATH(), `${JSON.stringify(records, null, 2)}\n`);

  return record;
}

function listUploads({ username, isAdmin }) {
  return readIndex().filter(record => isAdmin || record.username === username);
}

module.exports = {
  DEFAULT_RULES,
  UPLOADS_DIR,
  checkFile,
  describeRules,
  listUploads,
  normalizeRules,
  readRules,
  saveUpload,
  writeRules
};
