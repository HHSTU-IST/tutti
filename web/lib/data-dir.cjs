const fs = require("fs");
const path = require("path");

// 运行期「可写」数据目录：会话文件、上传规则、学员作业都落在这里。
// 与题库、账号表（data/ 下的只读真源）分开：这份数据是运行期长出来的，不能跟着代码走。
const APP_DIR = path.join(__dirname, "..");
const DEFAULT_DATA_DIR = path.join(APP_DIR, "data");

// 默认落在 web/data：单机跑够用，但更新代码时容易被一并覆盖，
// 长期使用或换机器时用 TUTTI_DATA_DIR 指到应用目录之外的固定位置。
const DATA_DIR = path.resolve(process.env.TUTTI_DATA_DIR || DEFAULT_DATA_DIR);

function isInsideAppDir(dir = DATA_DIR) {
  const relative = path.relative(APP_DIR, dir);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

// 探针写文件再删掉：比 existsSync 更能反映「真的能写」。
function ensureWritable(dir = DATA_DIR) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, "");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  DATA_DIR,
  ensureWritable,
  isInsideAppDir
};
