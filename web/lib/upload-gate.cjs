// 上传并发闸门。上传走 base64、整份文件会先读进内存再 JSON.parse，单请求的内存占用不小；
// 管理员把 maxSizeMb 调大后（body 上限随之按 4/3 放大），真正兜住内存峰值的是「同时有几路在传」。
// 这里给一个纯计数的闸门，逻辑独立、好单测，也不依赖 HTTP。
function readPositiveInt(raw, fallback) {
  const value = Number(String(raw || "").trim());
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const DEFAULT_MAX_CONCURRENT_UPLOADS = readPositiveInt(process.env.TUTTI_MAX_CONCURRENT_UPLOADS, 8);

function createUploadGate(maxConcurrent = DEFAULT_MAX_CONCURRENT_UPLOADS) {
  const limit = maxConcurrent > 0 ? maxConcurrent : DEFAULT_MAX_CONCURRENT_UPLOADS;
  let active = 0;

  // 成功占坑返回 true，满了返回 false。必须与 release 成对使用（请求 settle 后一定释放）。
  function tryAcquire() {
    if (active >= limit) return false;
    active += 1;
    return true;
  }

  function release() {
    active = active > 0 ? active - 1 : 0;
  }

  return { tryAcquire, release, activeCount: () => active, limit: () => limit };
}

module.exports = { DEFAULT_MAX_CONCURRENT_UPLOADS, createUploadGate };
