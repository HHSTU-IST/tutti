# 刷题助手

hh-tutor 为原生微信小程序，不使用 Vite、Vue 或前端进行依赖构建。

## 项目架构

- **框架**: 微信小程序原生框架
- **页面**: WXML + WXSS + TypeScript
- **题库**: 本地 `data/topic-py.ts`、`data/topic-ml.ts`
- **题库类型**: 共享类型 `types/quiz-bank.ts`
- **智能体开关**: 本地 `data/access.json`，生产默认全部为 `false`
- **登录**: 仅支持微信登录，使用 `wx.login` 获取 code 后交给后台校验
- **授权**: 后台根据用户购买情况返回可加载的刷题助手
- **用户数据库**: 微信云数据库集合 `user_profiles`
- **运行开关**: `services/runtime-config.ts`，会根据小程序环境自动选择开发 / 生产配置

## 主要功能

- 界面
  - [x] 答题进度
- 题库
  - [x] 按专题分类
  - [x] 随机抽取
  - [x] 打乱选项顺序
  - [x] 答案解析
  - [x] 按试卷模板出题
- 统计
  - [x] 错题本
- 自定义内容
  - [x] 题库预导入
- 登录
  - [x] 微信登录
  - [x] 禁止账号密码等其他登录方式
- 导出
  - [x] 导出试卷
  - [x] 导出错题本
- 授权
  - [x] 根据后台购买结果加载题库
  - [x] 用户不可手动切换刷题助手

## 系统架构概述

```text
hh-tutor/
├── data/           # 题库数据
├── docs/           # 文档与配置
├── pages/          # 小程序页面
├── prompts/        # 课程知识点提示
├── scripts/        # 工具脚本
├── services/       # 核心业务逻辑
└── types/          # TypeScript 类型定义
```

刷题智能体提供在线答题功能，支持多课程题库管理、随机抽题和固定模板试卷练习。试卷模式默认抽取 20 道单选、10 道判断和 10 道填空题；导出功能使用微信剪贴板，复制后可粘贴到文档或聊天中。

### 已支持课程

- [x] `py`：Python 编程
- [x] `al`：数据结构与算法
- [x] `ml`：机器学习
- [ ] `cv`：图像处理
- [ ] `dl`：深度学习

### 核心技术实现

- **题库加载**：`data/topic-*.ts` 按课程存储题库，格式符合 `QuizBank` 接口
- **答题引擎**：`services/quiz-engine.ts` 提供题目抽取、洗牌、选项随机化等核心功能
- **页面渲染**：`pages/quiz/` 负责小程序端的题目展示和交互
- **题型支持**：单选题、判断题、填空题

## 微信登录授权接口

授权入口在 `services/purchase.ts`。后台接口返回格式：

```json
{
  "openId": "用户微信 openid",
  "agents": {
    "py": true,
    "ml": false
  }
}
```

小程序会先调用 `wx.login` 获取 `code`，再向后台发送：

```json
{
  "code": "微信登录临时凭证"
}
```

`openId` 也可命名为 `wechatOpenId`。`agents` 的 key 是智能体 ID，value 表示是否已购买。生产环境默认值为全 `false`，本地测试环境会读取 `data/access.ts` 作为覆盖。购买后后台返回对应 key 为 `true`。没有登录、没有授权或接口未配置时，用户界面保持空白。

## 用户数据库

数据库入口在 `services/user-db.ts`，使用微信云数据库集合 `user_profiles`。每个微信用户一条记录，按 `wechatOpenId` 查询和更新。

记录结构：

```json
{
  "wechatOpenId": "用户微信 openid",
  "agents": {
    "py": true,
    "ml": false
  },
  "wrongQuestions": [],
  "stats": {
    "py": {
      "rightNum": 0,
      "wrongNum": 0,
      "totalNum": 0
    }
  },
  "progress": {
    "py": {
      "topicDone": {
        "var": 0
      }
    }
  },
  "createdAt": 0,
  "updatedAt": 0
}
```

保存内容包括微信 ID、题库购买情况、错题记录、答题统计和答题进度。答题和重置时会自动同步当前刷题助手的数据。

新增智能体时，需要同步增加：

- `data/access.json` 中的默认开关
- 对应题库文件
- `services/registry.ts` 中的智能体注册表

> 参考示例：数据结构与算法智能体 `al` 已完整接入——题库在 `data/topic-al.ts`，注册见 `services/registry.ts` 的 `AGENT_REGISTRY.al`，本地测试开关见 `data/access.ts`（开发环境置 `true` 即可扫码进入）。

## 扫码测试登录

当前 `services/purchase.ts` 支持本地扫码测试模式：当 `services/runtime-config.ts` 选择开发配置时，小程序仍会调用 `wx.login()`，开发者工具扫码登录后会生成本地测试 openid。

测试授权读取 `data/access.ts`，例如：

```ts
const access: Record<string, boolean> = {
  py: true,
  ml: false
};
```

将某个智能体改为 `true` 后，扫码登录即可进入对应题库。接入真实后端时，修改 `services/runtime-config.ts` 里的生产配置，填入真实后台地址和云数据库设置，后端用 `code` 换取真实 openid 并返回 `agents` 授权即可。
