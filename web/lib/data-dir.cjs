const fs = require("fs");
const path = require("path");

// 运行期「可写」数据目录：会话文件、上传规则、学员作业都落在这里。
// 注意与 web/data 下的构建产物（courses.json / banks/*.json）区分：后者只读，随发布覆盖。
const APP_DIR = path.join(__dirname, "..");
const DEFAULT_DATA_DIR = path.join(APP_DIR, "data");

// 默认 web/data（发布沙箱只上传 web/，重新发布会连数据一起换掉）；
// 部署时用 TUTTI_DATA_DIR 指向平台提供的持久化目录。
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
