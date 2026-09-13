// 小程序登录云函数：用 cloud.getWXContext() 直接拿 openid——
// 不需要 AppSecret、不需要自建后台、不需要备案域名，和小程序已有的云数据库同一条路。
//
// 返回 { openId, agents }：agents 取自该用户在 user_profiles 里的开通情况。
// 开通由管理员在云开发控制台把对应课程的字段改成 true（见 README「小程序部署」）。
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const USER_COLLECTION = "user_profiles";

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();

  try {
    const result = await db
      .collection(USER_COLLECTION)
      .where({ wechatOpenId: OPENID })
      .limit(1)
      .get();
    const profile = result.data && result.data[0];

    return { openId: OPENID, agents: (profile && profile.agents) || {} };
  } catch (error) {
    // 集合还没建、权限不对、读失败：按「未开通」返回，别把异常抛给小程序（前台会白屏）。
    return { openId: OPENID, agents: {}, error: String((error && error.message) || error) };
  }
};
