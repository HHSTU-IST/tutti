# 刷题助手

tutti 是可扩展的刷题助手，提供网页端和微信小程序。

## 项目架构

- **框架**: 微信小程序原生框架
- **页面**: WXML + WXSS + TypeScript
- **题库**: 本地 `data/topic-*.ts`，全部内置于同一小程序
- **题库类型**: 共享类型 `types/quiz-bank.ts`
- **智能体开关**: 本地测试开关 `data/access.ts`，生产默认全部为 `false`（由后台 `agents` 决定）
- **登录**: 仅支持微信登录，使用 `wx.login` 获取 code 后交给后台校验
- **授权**: 后台根据用户购买情况返回可加载的刷题助手
- **用户数据库**: 微信云数据库集合 `user_profiles`
- **运行开关**: `services/runtime-config.ts`，会根据小程序环境自动选择开发 / 生产配置

## 部署与运行

两条发布通道共用 `data/topic-*.ts` 这一份题库，可只上一边，也可两边都上。

| 通道       | 入口       | 登录方式               | 运行形态               |
| ---------- | ---------- | ---------------------- | ---------------------- |
| 网页版     | `web/`     | 账号密码（自建账号表） | Node HTTP 服务，单端口 |
| 微信小程序 | 仓库根目录 | 微信登录 + 后台授权    | 微信开发者工具上传发布 |

### 网页版部署

```bash
# 1) 生成运行数据（改过题库或账号后必须重跑，只需 Node ≥ 22.6）
node scripts/build-web-bundle.cjs

# 2) 初始化账号（仅首次）
node scripts/manage-accounts.cjs init

# 3) 启动（无第三方依赖，不需要 npm install）
PORT=3000 HOST=0.0.0.0 node web/server.js
# 有持久化目录的机器上，让它把会话/规则/作业都落到那里，别留在随发布覆盖的 web/data：
# TUTTI_DATA_DIR=/var/lib/tutti PORT=3000 HOST=0.0.0.0 node web/server.js
```

- **单机 / 容器**：任何能跑 Node 的主机起这一个进程，前面挂 Nginx 做 HTTPS 与反向代理即可。
- **WorkBuddy「发布为应用」**：目录选 `web/`，语言 `node`，启动命令 `node server.js`。注意发布只上传该目录，所以**必须先跑构建脚本**生成自包含数据；服务需监听 `PORT` 并绑定 `0.0.0.0`（已默认如此）。
- **运行期环境变量**：除 `PORT` / `HOST` 外还有三个与数据落盘相关的变量。

  | 变量                  | 默认值                      | 作用                                           |
  | --------------------- | --------------------------- | ---------------------------------------------- |
  | `TUTTI_DATA_DIR`      | `web/data`                  | 运行数据目录：会话、上传规则、学员作业都落这里 |
  | `TUTTI_SESSION_STORE` | `file`                      | `file` 落盘（重启不掉线）/ `memory` 纯进程内存 |
  | `TUTTI_SESSION_DIR`   | `<TUTTI_DATA_DIR>/sessions` | 单独指定会话目录，一般不用改                   |

  有持久卷的机器上指向它即可，发布前后各跑一次自检：

  ```bash
  TUTTI_DATA_DIR=/var/lib/tutti PORT=3000 HOST=0.0.0.0 node web/server.js
  node scripts/web-deploy-check.cjs
  ```

当前线上地址：<https://tutti-quiz-web2.app.workbuddy.host/>（在「设置—数据管理—应用」中管理）。历史链接 `tutti-quiz-web.app.workbuddy.link` 已下线失效。

网页版部署清单（`node scripts/web-deploy-check.cjs` 逐项自检，退出码非 0 即还有未通过项）：

- [x] 默认密码不再硬编码：`init` 生成的密码是随机的（也可用 `TUTTI_ADMIN_PASSWORD` / `TUTTI_DEMO_PASSWORD` 指定），已上线的存量账号由自检脚本复核是否还在用 `admin2026` / `demo2026`
- [x] `data/accounts.json` 与 `web/data/accounts.json` 已 `git rm --cached` 并写入 `.gitignore`，账号盐值与哈希不再进公开仓库
- [x] 会话默认落盘：一个会话一个 JSON 文件，放在 `TUTTI_DATA_DIR/sessions/`，重启不掉线；多实例把 `TUTTI_DATA_DIR` 指向同一持久化目录即共用会话（见「已知限制」）
- [ ] `web/data/uploads/` 与 `web/data/upload-rules.json` 需要持久化：把 `TUTTI_DATA_DIR` 指向平台的持久化目录即可，未指向时启动会打印告警、自检显示待处理

**回滚**：重新发布旧版 `web/` 目录即可回退代码；数据回滚先恢复 `data/accounts.json` 备份，再重跑 `node scripts/build-web-bundle.cjs`。

### 小程序部署

1. 用**微信开发者工具**（稳定版）导入仓库根目录；`project.config.json` 里的 `appid` 目前是 `wxf7f1812c7c4f4106`，换成自己的需在微信公众平台注册后修改该字段。
2. **本地调试**：把 `data/access.ts` 里要测的课程置为 `true`，开发者工具扫码登录即可进入（详见「扫码测试登录」）。
3. **接后台授权**：填 `services/runtime-config.ts` 中 `PRODUCTION_RUNTIME_CONFIG.wechatLoginApiUrl`（必须 HTTPS）。**当前为空，不填线上会白屏**——这是发布前最容易被漏掉的一项；启动时 `console.error` 会打印缺哪一项，首页也会显示「生产配置缺失」。
4. **云数据库**：开发者工具「云开发」新建/选择环境，建集合 `user_profiles`，权限建议「仅创建者可读写」。`app.ts` 的 `wx.cloud.init()` 默认走默认环境；多环境部署时在 `services/runtime-config.ts` 填 `cloudEnv` 指定环境 ID（留空时启动会 `console.warn` 提示）。云数据库读写失败时答题页会降级为本地使用并弹 toast，不会白屏。
5. **发布**：开发者工具右上角「上传」填版本号 → 微信公众平台「版本管理」提交审核 → 审核通过点「发布」。体验版（`envVersion=trial`）与正式版走同一套生产配置，可先拿它做真机验证。

小程序发布前自检（`node scripts/miniprogram-release-check.cjs` 逐项自检，退出码非 0 即还有未通过项；`[手工]` 项脚本判不了）：

- [ ] `wechatLoginApiUrl` 已填且为 HTTPS（未填时启动会 `console.error` 缺失项，首页也会显示「生产配置缺失，请联系管理员」，而不是笼统的「未读取到可用授权」）
- [ ] 云环境已建 `user_profiles` 集合（多环境需填 `cloudEnv`；留空走默认环境，自检会提示）
- [x] 生产开通由后台 `agents` 返回决定（本地测试开关是 `data/access.ts`，只在开发配置生效：`enableLocalWechatTestLogin=false` 时完全不读；自检会校验这个开关没被改回来）
- [ ] trial 体验版真机跑通再提审

自检脚本顺带会查：`appid` 是否已填、`project.config.json` 有没有漏排除 `web/` 与 `scripts/`（否则包体白涨）、`app.json` 声明的页面文件是否齐全。

## 使用说明

### 学员

**网页版**：打开网址 → 用管理员给的账号密码登录 → 首页列出全部题库，已开通的可点进入，未开通显示「未开通」（点一下会提示去联系管理员）→ 选专题（或「全部专题（混合）」）→ 选题量与题型 → 开始练习 → 逐题作答，提交后立刻显示对错与解析（填空需手输答案）→ 答完显示正确率。当前视图与选择都会写进地址栏（`?view=quiz&course=py&topic=var&count=20&type=all`），刷新不掉进度页、可以分享链接、也能用浏览器后退。

**微信小程序**：微信中打开小程序，自动完成微信登录 → 首页列出全部课程，已购课程显示「进入练习」→ 进入后按专题刷题，统计、进度、错题本按课程分开保存。

两边共用同一份题库与同一套专题划分，但**登录体系与数据不互通**：小程序按微信 openid + 后台授权，网页版按账号密码，答题记录分别存在微信云数据库和网页服务端。

### 管理员

1. 用 `admin` 账号登录网页版，**全部题库自动解锁**（普通账号只能进已登记的课程）。
2. **开通课程**：`node scripts/manage-accounts.cjs courses <账号> py,ml` 调整该账号的已购课程。
3. **上传规则**：课程页底部「上传规则设置」面板改允许格式、文件名正则、命名说明、大小上限，保存后对所有学员的后续上传立即生效。格式与命名的校验在服务端，改前端绕不过。
4. 小程序的课程开通走另一套：由后台在 `agents` 里对应用户返回 `true`，不需要在网页端操作。

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
  - [x] 微信登录（小程序端，不提供账号密码等其他方式）
  - [x] 账号密码登录（网页端，自建账号表）
- 导出
  - [x] 导出试卷
  - [x] 导出错题本
- 授权
  - [x] 根据后台购买结果加载题库
  - [x] 全部课程内置同一小程序，已购课程可选、未购课程不可选

## 系统架构概述

```text
hh-tutor/
├── data/           # 题库数据与网页端账号表
├── docs/           # 文档与配置
├── pages/          # 小程序页面
├── prompts/        # 课程知识点提示
├── scripts/        # 工具脚本
├── services/       # 核心业务逻辑
├── types/          # TypeScript 类型定义
└── web/            # 网页版（Node 服务端 + 静态页面）
```

刷题智能体提供在线答题功能，支持多课程题库管理、随机抽题和固定模板试卷练习。试卷模式默认抽取 20 道单选、10 道判断和 10 道填空题；导出功能使用微信剪贴板，复制后可粘贴到文档或聊天中。

### 已支持课程

- [x] `py`：Python 编程
- [x] `al`：数据结构与算法
- [x] `ml`：机器学习
- [x] `cv`：图像处理
- [ ] `dl`：深度学习

全部课程题库都编译进同一个小程序，首页登录后列出所有课程。后台 `agents` 中对应值为 `true` 的课程显示「进入练习」，点击进入 `/pages/quiz/quiz?kind=<课程 ID>`；未开通课程置灰显示「未开通」，点击提示尚未开通。答题页会校验 URL 传入的课程是否已授权，防止绕过首页直接进入未付费题库。每门课程的答题统计、专题进度与错题本按课程 ID 分开保存，互不干扰。

本地调试时，把 `data/access.ts` 中对应课程置为 `true` 即可在首页看到它为「已开通」。

### 核心技术实现

- **题库加载**：`data/topic-*.ts` 按课程存储题库，格式符合 `QuizBank` 接口
- **答题引擎**：`services/quiz-engine.ts` 提供题目抽取、洗牌、选项随机化等核心功能
- **页面渲染**：`pages/quiz/` 负责小程序端的题目展示和交互
- **题型支持**：单选题、判断题、填空题

## 网页版（web）

网页版把同一套 `data/topic-*.ts` 题库发布到浏览器，**题库权限由账号决定**：已付费课程可选，未付费课程不可选，管理员账号可进入全部题库。

```bash
node web/server.js                          # 默认 http://localhost:3000
PORT=8080 node web/server.js                # 换端口；HOST 可改绑定地址
TUTTI_DATA_DIR=/var/lib/tutti node web/server.js   # 运行数据（会话/规则/作业）放到持久化目录
```

零第三方依赖，只用 Node 内置模块。运行期读的是 `web/data` 下的 JSON 构建产物，**不要求高版本 Node**；只有 `scripts/build-web-bundle.cjs` 生成产物时需要 Node ≥ 22.6（它要直接读 TypeScript 题库）。

### 权限模型

- **判定在服务端完成**：`web/lib/auth.cjs` 的 `resolveEntitlements()` 是唯一权限来源。未开通课程的专题接口返回 403，题目根本不会下发到浏览器，前端改 JS 也拿不到。
- **管理员**：`role` 为 `admin`，自动解锁全部题库，账号上的 `courses` 被忽略。
- **普通用户**：只能用 `courses` 里登记的课程。
- **判题也在服务端**：下发的题目不含 `correctAnswer` 与 `explain`，答案留在服务端会话里，`POST /api/quiz/check` 返回对错、正确答案和解析。

### 上传规则（仅管理员可编辑）

学员可在课程页上传作业，服务端按规则校验：

- **允许的格式**：扩展名白名单，默认 `.pdf`、`.docx`
- **文件名规则**：正则表达式，默认 `^[^_\\/]+_[^_\\/]+_[a-z]{2}\.(?:pdf|docx)$`（学号_姓名_课程代码，如 `2023010101_张三_py.pdf`）
- **命名说明**：不匹配时提示给学员的文字
- **大小上限**：单文件 MB 数，上限 200 MB

规则存在 `${TUTTI_DATA_DIR}/upload-rules.json`（默认 `web/data/upload-rules.json`，首次运行用内置默认值）。**读取所有人都可以，修改只有管理员**：

```text
GET  /api/settings/upload   # 登录即可读，返回 canEdit 标记
PUT  /api/settings/upload   # 非管理员返回 403
POST /api/upload            # { courseId, fileName, contentBase64 }，校验格式/大小/命名
GET  /api/uploads           # 自己的上传记录；管理员看全部
```

管理员在网页端「上传规则设置」面板里改，保存后对后续上传立即生效。前端只负责展示，真正的校验始终在服务端——改前端 JS 绕不过。上传文件落在 `${TUTTI_DATA_DIR}/uploads/`（默认 `web/data/uploads/`），记录在同目录 `index.json`。

文件名还会挡掉 `../` 这类路径穿越写法，落盘时再按时间戳加随机前缀重命名，避免覆盖。

### 已知限制

- **会话默认落盘**：一个会话一个 JSON 文件，放在 `${TUTTI_DATA_DIR}/sessions/`，进程重启不掉线。多实例把 `TUTTI_DATA_DIR` 指向同一持久化目录即共用会话，注销立即生效；目录本身不共享时得自己接 Redis 之类共享存储，或设 `TUTTI_SESSION_STORE=memory` 退回单进程内存（重启掉线）。
- **进行中的练习只在内存**：组卷结果（含答案）不落盘，重启后重新组卷即可，已答题目与错题记录以浏览器端为准。
- **上传文件落磁盘**：作业在 `${TUTTI_DATA_DIR}/uploads/`、管理员规则在 `${TUTTI_DATA_DIR}/upload-rules.json`，默认落在 `web/data`——该目录随发布一起被覆盖，线上必须把 `TUTTI_DATA_DIR` 指到持久化目录，否则平台重启或重新发布后规则与作业会丢。
- **上传暂无删除接口**：管理端目前只能经 `/api/uploads` 查看；删文件需手动清理 `${TUTTI_DATA_DIR}/uploads/`（连同同目录 `index.json` 里的记录）。
- **题型仅单/判/填**：判题引擎与构建脚本只覆盖这三种，新增题型需同时改 `services/quiz-engine.ts`、`web/lib/engine.cjs` 与 `scripts/build-web-bundle.cjs`。
- **备份**：定期备份 `data/accounts.json`（账号与课程权限）与整个 `TUTTI_DATA_DIR`（会话、上传规则、作业文件）。

### 账号管理

账号表在 `data/accounts.json`，只存 `pbkdf2` 盐值与哈希，不存明文密码。用 CLI 维护：

```bash
node scripts/manage-accounts.cjs init                                   # 首次初始化默认账号
node scripts/manage-accounts.cjs list                                   # 查看账号与已购课程
node scripts/manage-accounts.cjs add 张三 pwd1234 --courses py,ml        # 新增普通账号
node scripts/manage-accounts.cjs add kefu pwd1234 --role admin          # 新增管理员
node scripts/manage-accounts.cjs courses 张三 py,ml,al                  # 调整已购课程
node scripts/manage-accounts.cjs passwd 张三 newpwd                     # 改密码
node scripts/manage-accounts.cjs passwd admin --random                  # 随机生成强密码，只打印一次
node scripts/manage-accounts.cjs remove 张三                            # 删除
```

`init` 建的两个账号是 `admin`（管理员，全部题库）与 `demo`（仅 `py`）。密码不再是固定的 `admin2026` / `demo2026`：默认随机生成并在 `init` 时打印一次，也可以在 `init` 前用 `TUTTI_ADMIN_PASSWORD` / `TUTTI_DEMO_PASSWORD` 指定。存量账号是否还在用老默认密码，用 `node scripts/web-deploy-check.cjs` 复核。

> 账号真源是 `data/accounts.json`，CLI 只改这一处；改完后重跑 `node scripts/build-web-bundle.cjs` 同步到 `web/data/accounts.json`，再重新发布才在线上生效（发布沙箱只上传 `web/`）。

### 接口

| 方法    | 路径                      | 说明                            |
| ------- | ------------------------- | ------------------------------- |
| POST    | `/api/login`              | 登录，下发 HttpOnly 会话 Cookie |
| POST    | `/api/logout`             | 退出                            |
| GET     | `/api/me`                 | 当前账号与已解锁课程            |
| GET     | `/api/courses`            | 课程列表，含 `unlocked` 标记    |
| GET     | `/api/courses/:id/topics` | 专题列表，未开通返回 403        |
| POST    | `/api/quiz`               | 组卷，未开通返回 403            |
| POST    | `/api/quiz/check`         | 判题，返回对错、正确答案、解析  |
| GET/PUT | `/api/settings/upload`    | 上传规则；PUT 仅管理员          |
| POST    | `/api/upload`             | 上传作业，按规则校验            |
| GET     | `/api/uploads`            | 上传记录                        |

### 网页端测试

```bash
node scripts/web-deploy-check.cjs      # 部署自检：默认密码 / 账号表同步 / 会话存储 / 数据目录
node --test                            # 跑 scripts 下全部用例：接口、安全、部署、前端静态一致性
```

测试会临时起服务，并把会话、上传规则、作业文件全部指向临时目录（`TUTTI_DATA_DIR`、`TUTTI_ACCOUNTS_PATH`），不读写仓库里的真实数据，多个测试文件并行也不会互踩。

> 会话默认落盘到 `${TUTTI_DATA_DIR}/sessions/`，重启服务不会掉线；只有显式设 `TUTTI_SESSION_STORE=memory` 才是「重启即全员掉线」的旧行为。

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

- `data/access.ts` 中的本地测试开关（同时提供默认全 `false` map 的键列表）
- 对应题库文件
- `services/registry.ts` 中的智能体注册表

> 参考示例：数据结构与算法智能体 `al` 与图像处理智能体 `cv` 均已完整接入——题库分别在 `data/topic-al.ts`、`data/topic-cv.ts`，注册见 `services/registry.ts` 的 `AGENT_REGISTRY`，本地测试开关见 `data/access.ts`（开发环境置 `true` 即可扫码进入）。

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
