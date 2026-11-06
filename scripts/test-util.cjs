// 测试专用工具：把重复出现在 5 个 web-*.test.cjs 里的 makeUser 归成一份，
// 并且改走 auth.hashPassword/generateSalt，与生产 PBKDF2_ITERATIONS 保持同源。
// 修前每处各写 crypto.pbkdf2Sync(pw, salt, 120000, 32, "sha256")，一旦生产把
// 迭代数升到 200k/300k，这 5 处测试会静默产出与 verifyPasswordAsync 不匹配的哈希，
// 全线登录/判权用例假绿——本轮审计里最典型的"改了没信号"债。
//
// 说明：web-deploy.test.cjs 的 makeUser 已接受外部注入的 auth 实例（配合它
// 多轮 loadFresh 场景），语义独立，不并到本文件里。
//
// 延迟 require：auth.cjs 会读 process.env.TUTTI_ACCOUNTS_PATH 等，测试文件
// 通常在模块顶端设好 env，但为了不让"谁先 require 谁定 env"变成隐藏依赖，
// 每次用到再拿，Node require 缓存保证只实际加载一次。
function makeUser(username, password, role, courses) {
  const auth = require("../web/lib/auth.cjs");
  const salt = auth.generateSalt();
  return { username, role, courses, salt, hash: auth.hashPassword(password, salt) };
}

module.exports = { makeUser };
