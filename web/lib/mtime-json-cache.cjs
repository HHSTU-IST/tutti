// 一个极简的「文件没变就别再 JSON.parse」缓存。
// 判据：mtimeMs 与 size 两个都相同才复用；任一不同（或 statSync 抛）就走重新 read + parse。
//
// 为什么值得这一层：审计里 auth.readAccounts 与 uploadRules.readRules 每个认证请求都要
// 读盘（readFileSync + JSON.parse），accounts.json 与 upload-rules.json 都是 KB 级小文件，
// 但 loop 上跑几百 QPS 时这两次同步 IO + 解析就足以吃满一个核。加缓存后 loop 上稳态只跑
// 一次 statSync（syscall 便宜得多），文件真被管理员改了 mtime/size 就自动失效。
//
// 不做的事：
//   - 不 watch 文件系统（inotify 平台相关，容器里还常被禁用）；
//   - 不做到 nanosecond 精度（ctimeMs/birthtimeMs 在不同 fs 上语义各异，别赌）；
//   - 不无界缓存（单文件、单槽，最坏就是丢掉一次缓存命中，重新读一次）。
//
// mtime 精度：POSIX 上 mtimeMs 是浮毫秒（内核给到 ~ns），NTFS 是 100ns；同秒覆写 +
// 恰好字节数不变——理论会漏检，写侧 writeFileSync 之后紧跟 cache.invalidate() 就无隐患。
// readRules / writeAccounts 都是同进程改写，所以都做了显式失效，只等 mtime 更新是兜底路径。

const fs = require("fs");

/**
 * 给一个 JSON 文件挂一层 (mtimeMs,size)→value 的单槽缓存。
 *
 * @param {() => string} pathGetter 惰性求路径：测试里会改 RULES_PATH 等模块级 const，
 *   只有每次访问都重新拿路径才不会锁死在旧值上。
 * @param {object} [opts]
 * @param {*} [opts.fallbackWhenMissing] ENOENT 时返回该值（readAccounts 用 `{version:1,users:[]}`，
 *   readRules 用 undefined 好让上层回退到 DEFAULT_RULES）。
 * @param {(parsed: any) => any} [opts.transform] 可选：把 parsed 结果二次加工（例如 normalizeRules），
 *   加工后的值也会被缓存，热路径就完全跳过 IO + parse + transform。transform 抛错时走 fallbackOnError。
 * @param {() => any} [opts.fallbackOnError] transform 或 JSON.parse 抛错时用它产生兜底值（也会被缓存，
 *   避免同一份坏文件每次读都重试 transform）。默认抛。
 * @returns {{ read: () => any, prime: (value: any, stat?: any) => void, invalidate: () => void }}
 */
function createMtimeJsonCache(pathGetter, opts = {}) {
  const fallback = "fallbackWhenMissing" in opts ? opts.fallbackWhenMissing : null;
  const transform = typeof opts.transform === "function" ? opts.transform : null;
  const fallbackOnError = typeof opts.fallbackOnError === "function" ? opts.fallbackOnError : null;
  let slot = null; // { key: "mtimeMs|size", value }

  function read() {
    const target = pathGetter();
    let stat;
    try {
      stat = fs.statSync(target);
    } catch (error) {
      slot = null;
      if (error && error.code === "ENOENT") return fallback;
      throw error;
    }
    const key = `${stat.mtimeMs}|${stat.size}`;
    if (slot && slot.key === key) return slot.value;

    let value;
    try {
      const raw = fs.readFileSync(target, "utf8");
      const parsed = JSON.parse(raw);
      value = transform ? transform(parsed) : parsed;
    } catch (error) {
      if (!fallbackOnError) throw error;
      value = fallbackOnError(error);
    }
    slot = { key, value };
    return value;
  }

  // 已知本进程刚写过同一份内容时，可以显式把 value 塞回槽里，省一次下轮 read 的 parse。
  function prime(value, stat) {
    if (!stat) {
      slot = null;
      return;
    }
    slot = { key: `${stat.mtimeMs}|${stat.size}`, value };
  }

  function invalidate() {
    slot = null;
  }

  return { read, prime, invalidate };
}

module.exports = { createMtimeJsonCache };
