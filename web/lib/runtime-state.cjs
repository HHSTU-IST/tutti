const fs = require("fs");
const path = require("path");

const { DATA_DIR } = require("./data-dir.cjs");

const STATE_PATH = path.join(DATA_DIR, "runtime-state.json");

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    return null;
  }
}

/**
 * 记下「这个数据目录被启动过几次」。
 *
 * 判持久化用：重新发布后如果 `boots` 从 1 重新数、`firstBootAt` 变了，
 * 说明平台的发布把整个目录重建了（管理员设的上传规则与学员作业会一起没）。
 * 只有启动记录还在、计数继续累加，才说明这个目录真的被保留。
 */
function markBoot(now = Date.now()) {
  const previous = readState();
  const state = {
    firstBootAt: (previous && previous.firstBootAt) || new Date(now).toISOString(),
    lastBootAt: new Date(now).toISOString(),
    boots: (Number(previous && previous.boots) || 0) + 1
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch (error) {
    return Object.assign(state, { writable: false, error: error.message });
  }

  return Object.assign(state, { writable: true });
}

module.exports = { STATE_PATH, markBoot, readState };
