# 开发文档

面向要改这个仓库的人：架构、实现细节、接口契约、本地开发、部署清单都在这里。

部署步骤与使用说明在根目录 [README](../README.md)，试卷智能体的设计说明在 [design.md](./design.md)。

## 项目架构

- **框架**: 微信小程序原生框架
- **页面**: WXML + WXSS + TypeScript
- **题库**: 本地 `data/topic-*.ts`，全部内置于同一小程序
- **题库类型**: 共享类型 `types/quiz-bank.ts`
- **智能体开关**: 本地测试开关 `data/access.ts`，生产默认全部为 `false`（由后台 `agents` 决定）
- **登录**: 仅支持微信登录，生产走 `login` 云函数（`cloud.getWXContext()` 取 openid，无需自建后台）
- **授权**: 由 `cloudfunctions/login` 按该用户在 `user_profiles` 里的 `agents` 返回可加载的刷题助手
- **用户数据库**: 微信云数据库集合 `user_profiles`
- **作业上传**: 小程序端直传微信云存储，记录写集合 `homework_uploads`（`services/homework.ts`，开关 `enableHomeworkUpload`）
- **运行开关**: `services/runtime-config.ts`，会根据小程序环境自动选择开发 / 生产配置
- **Node**: 统一要求 ≥ 22.6.0（`web/package.json` 的 `engines`；常量与比较逻辑在 `web/lib/node-version.cjs`，服务启动时会打印实际版本）

## 目录结构

```text
├── cloudfunctions/ # 云函数：login（getWXContext 取 openid + 按 user_profiles.agents 返回开通）
├── data/           # 题库 data/topic-*.ts、本地测试开关、网页端账号表
├── docs/           # 项目文档：development.md（本文件）、design.md（试卷智能体设计）
├── outputs/        # 试卷脚本的生成物（.md / .docx）
├── pages/          # 小程序页面
├── prompts/        # 课程知识点提示
├── scripts/        # 工具脚本：构建、账号、自检、组卷
├── services/       # 核心业务逻辑
├── templates/      # 试卷模板与配置：exam-template.md、examif.json、export.json、export-schema.json、latex-replace.json
├── types/          # TypeScript 类型定义
└── web/            # 网页版（Node 服务端 + 静态页面）
```

## 题库与答题引擎

- **题库加载**：`data/topic-*.ts` 按课程存储题库，格式符合 `QuizBank` 接口
- **答题引擎**：`services/quiz-engine.ts` 提供题目抽取、洗牌、选项随机化等核心功能
- **页面渲染**：`pages/quiz/` 负责小程序端的题目展示和交互
- **题型支持**：单选题、判断题、填空题

小程序端的练习都是同一条「练习队列」：先按题型与题量组出队列，再逐题作答，答完最后一题展示本次成绩。

- **试卷练习**：整门课范围抽 20 道单选、10 道判断、10 道填空（`EXAM_SECTIONS`，与 README 一致）。
- **专题 / 随机练习**：题型为单选 / 判断 / 填空三选一，范围是当前专题或整门课，题量由页面上的「题量」选择决定（1 / 10 / 20 / 30 题）。
- 队列由 `services/quiz-engine.ts` 的 `buildPracticeQueue(bank, topicKeys, sections, resolveTopicName)` 生成，一次可以传多段（试卷练习就是三段）；抽不满时把缺口写进返回值的 `shortfall`，由页面 toast 出来，**不静默截断**。
- 队列结束后 `finishPractice()` 展示本次成绩（答对题数 / 总数 / 正确率 / 本次答错数），「再练一次」按 `practiceModeKey` 重放同一入口。

导出有两条路：**导出试卷**走微信剪贴板（复制当前练习队列，可粘贴到文档或聊天中）；**导出错题本**把 Markdown 语法的内容写进 `wx.env.USER_DATA_PATH` 下的 `.txt`（`错题本-<课程名>.txt`，同一课程重复导出只覆盖同一个文件），内容含题干、可读形式的正确答案与解析，再调 `wx.shareFileMessage` 唤起「发送文件」面板，用户选「文件传输助手」即可存进自己的微信。`wx.shareFileMessage` 在低版本基础库上不存在，写文件失败时也一样——两种情况都退回剪贴板，不会点了没反应。`typings.d.ts` 按项目惯例只声明项目用得到的东西（事件、页面生命周期、云存储等），**用到新接口要同步补进去**，否则 `tsc --noEmit` 会先报错。

### 错题记录

错题本（`pages/quiz/`）按「专题 + 题干」去重：同一道题重复答错只保留最新一条并提到最前（`upsertWrongQuestion`），进课时会把云端可能残留的重复记录收敛一次（`dedupeWrongQuestions`）。记录与云端 `wrongQuestions` 共用 `types/quiz-bank.ts` 的 `WrongQuestionEntry`：

- `answer` 存**可读形式**而不是 `"A"`——判断题是「正确 / 错误」，单选题带选项文本（选项顺序每题都会重排，只存字母等于什么都没说），填空题就是答案本身；
- `explain` 存解析，填空题题库一般不写解析，此时退化成「参考答案：…」；
- `id` 直接用题目 id（自带时间戳与随机后缀），避免同一毫秒内多次答题撞 id；
- 错题本支持单条移除：改完列表后按整份列表覆盖写回（`saveQuizSnapshot` 会先剔掉该课程的旧记录），删除即生效。

答题页（`pages/quiz/`）的按钮区自上而下是「题量」选择、「出题方式」、「错题本 / 导出」、「练习进度」：试卷练习、真题练习（占位，`showPendingMode()` 只给一句 toast，接真题题库时替换它）、专题单选 / 专题判断 / 专题填空、随机单选 / 随机判断 / 随机填空；**只有「专题」开头的三种会显示「选择专题」卡片**（`data.showTopicPicker`，与 `TOPIC_SCOPED_ACTIONS` 对应），试卷练习与随机练习是整门课范围，不需要选专题。`重置` 走 `wx.showModal` 二次确认，确认后才清空该课程的统计、进度与错题并同步云端。

改这块 UI 时注意：小程序原生 `button` 是**块级按钮**——默认 100% 宽、`font-size: 18px`、`line-height: 2.5555`、`border-radius: 5px`。`app.wxss` 里的全局规则只覆盖了 `display` / `margin` / `border`，**宽度这条收不回来**：给 `button` 写 `width: auto` / `flex: 0 0 auto` 都压不住它那 100%（顶部卡片那两个按钮踩过：撑成各占半行并溢出卡片，还被 `.quiz-page` 的 `overflow-x: hidden` 裁掉两边）。

要「按内容宽」就用**外层 view 定宽**：`.summary-action` / `.error-remove-wrap` 是 `display: flex; flex: 0 0 auto`（按内容定宽），里面的 button `width: 100%` 填满它——不论原生那 100% 生效与否结果都一样。要「按比例分」则让按钮直接 `flex: 1 1 0; min-width: 0`（或放进 `display: grid` 的等宽列里，`.count-row` / `.result-actions` 就是这么做的）。两条路都比硬压 `width` 可靠。

字号 / 行高 / 圆角也必须显式写，否则会拿到原生那套 18px + 2.5555 行高的"胖"按钮。顶部卡片布局：`.summary` 是 column，课程信息（`.summary-head`）占一行，`.summary-actions` 自己占一行、`justify-content: center` 居中。

### 作业上传（小程序端）

网页版的作业上传走服务端接口（见[「上传规则」](#上传规则仅管理员可编辑)）；小程序端是**另一套**：不碰自建后台（不必备案域名），文件直传微信云存储，记录写云数据库集合 `homework_uploads`。

- **入口**：首页课程卡片里的「上传作业」（`pages/index/index.ts` 的 `openHomework`，用 `catchtap` 拦住冒泡，别顺带触发「进入练习」）→ `/pages/homework/homework?kind=<课程 ID>`；页面同样会校验 URL 参数里的课程是否已授权，不能绕过首页进未开通课程的作业区。
- **选文件**：小程序的沙箱读不到手机文件系统，只能用 `wx.chooseMessageFile` 从聊天记录里选（一次一份）。
- **校验**：`services/upload-rules.ts` 的 `checkHomeworkFile()` 在本机先判扩展名、大小、文件名正则；失败时给的是能照着改的原因（走 `wx.showModal`，不是一晃而过的 toast）。网页端那道校验在服务端，小程序是直传，客户端这道就是唯一一道。
- **落地**：文件存 `homework/<课程 ID>/<时间戳-随机串-安全文件名>`，记录含 `courseId` / `wechatOpenId` / `originalName` / `storedName` / `fileID` / `sizeBytes` / `uploadedAt`（ISO 字符串，与网页端记录同风格），结构定义在 `types/homework.ts`。
- **删除**：**先删云存储文件、再删记录**——反过来会留下没人认领的文件；按文档 `_id` 删，客户端 SDK 只能删自己的。
- **开关**：`services/runtime-config.ts` 的 `enableHomeworkUpload`，与 `enableCloudDatabase` 分开。作业还要占云存储额度，两件事该能分别开关；开发配置恒为 `false`（本地没有云环境，传上去只会失败），生产默认开。
- **规则只有一份内嵌副本**：小程序读不到服务端的 `${TUTTI_DATA_DIR}/upload-rules.json`，`services/upload-rules.ts` 里保留同值默认值；`scripts/miniprogram-homework.test.cjs` 会比对两边的扩展名、大小上限、正则 `source` 以及同一批文件名下的校验结论，漂了就失败。**管理员在网页端改的规则不会影响小程序**，要改小程序侧得改这份代码再重新发布。

### 已支持课程

- [x] `py`：Python 编程
- [x] `al`：数据结构与算法
- [x] `ml`：机器学习
- [x] `cv`：图像处理
- [ ] `dl`：深度学习

全部课程题库都编译进同一个小程序，首页登录后列出所有课程。后台 `agents` 中对应值为 `true` 的课程显示「进入练习」，点击进入 `/pages/quiz/quiz?kind=<课程 ID>`；未开通课程置灰显示「未开通」，点击提示联系管理员。答题页会校验 URL 传入的课程是否已授权，防止绕过首页直接进入未付费题库。每门课程的答题统计、专题进度与错题本按课程 ID 分开保存，互不干扰。

首页顶部按钮随登录态变化：未登录（或登录失败）时是「微信登录 / 重新登录」，已登录后变成「**刷新授权**」并多出一个「退出登录」。刷新授权就是重跑一次 `resolveUserSession()`，把后台最新的 `agents` 拉下来——管理员刚开通某门课时，学员点一下即可，不必卸载重进。「退出登录」走 `wx.showModal` 确认后调 `services/purchase.ts` 的 `clearUserSession()`，清掉本地会话与本地测试 openid，页面回到未登录态。

### 课程元数据的唯一真源

课程标题、专题顺序、专题名（以及每个专题的单选/判断/填空内容）**只写在题库文件 `data/topic-*.ts` 的 `_config` 里**：

```ts
"_config": {
  "title": "Python 课程",
  "topicOrder": ["var", "flow", "func", "oop", "decorator", "magic", "generator", "thread", "code"],
  "topicNameMap": { "var": "变量", "flow": "控制流", "…": "…" }
}
```

- 小程序端：`services/registry.ts` 只登记 `id → bank`，标题/专题都从 `_config` 读。
- 网页端构建：`web/lib/catalog.cjs` 也直接读 `_config`（不再正则解析 `registry.ts`）。
- 组卷脚本：`scripts/generate-exam.cjs` 从 `bank._config` 取专题顺序与名称。
- `scripts/topic-bank.test.cjs` 会校验：注册表与 `data/topic-*.ts` 一一对应、`title` 非空、`topicOrder` 里的专题在题库中存在且 `topicNameMap` 有条目。

### 新增一门课程（智能体）

1. 新建题库 `data/topic-<id>.ts`，在 `_config` 里写好 `title`、`topicOrder`、`topicNameMap`；
2. 在 `services/registry.ts` 的 `AGENT_REGISTRY` 里登记 `{ id, bank }`（只需这两项）；
3. 在 `data/access.ts` 里加该课程的本地测试开关（生产不受它影响，开通由后台 `agents` 决定）；
4. 跑 `node --test`：注册表对齐、专题与题量校验都在 `scripts/topic-bank.test.cjs` 里；
5. 要出试卷的话，在 `scripts/exam-courses.cjs` 的 `COURSES` 里加一行参数，并在 `templates/examif.json` 里补该课程的考试信息。

## 网页版实现

网页版把同一套 `data/topic-*.ts` 题库发布到浏览器，**题库权限由账号决定**：已付费课程可选，未付费课程不可选，管理员账号可进入全部题库。

### 题库来源

`web/lib/banks.cjs` 启动时用 `web/lib/catalog.cjs` 的 `buildCatalogFromRepo()` 直接读仓库的 `data/topic-*.ts`（经 `scripts/load-topic-bank.cjs` 做 Node ≥ 22.6 的类型剥离）。没有构建步骤、也没有第二份副本：改完题库重启服务即生效。

代价是一条部署约束：**`web/` 与 `data/` 必须一起存在**（服务读的是 `../data/topic-*.ts`），只拷贝 `web/` 目录是跑不起来的。课程标题与专题顺序同样取自题库 `_config`，与小程序端 `services/registry.ts` 同源。

### 权限模型

- **判定在服务端完成**：`web/lib/auth.cjs` 的 `resolveEntitlements()` 是唯一权限来源。未开通课程的专题接口返回 403，题目根本不会下发到浏览器，前端改 JS 也拿不到。
- **管理员**：`role` 为 `admin`，自动解锁全部题库，账号上的 `courses` 被忽略。
- **普通用户**：只能用 `courses` 里登记的课程。
- **判题也在服务端**：下发的题目不含 `correctAnswer` 与 `explain`，答案留在服务端会话里，`POST /api/quiz/check` 返回对错、正确答案和解析。

### 会话与运行数据

- **会话默认落盘**：一个会话一个 JSON 文件，放在 `${TUTTI_DATA_DIR}/sessions/`，进程重启不掉线。多实例把 `TUTTI_DATA_DIR` 指向同一持久化目录即共用会话，注销立即生效（每个请求都会核对文件）。
- 目录本身不共享时得自己接 Redis 之类共享存储，或设 `TUTTI_SESSION_STORE=memory` 退回单进程内存（重启掉线）。
- **进行中的练习只在内存**：组卷结果（含答案）不落盘，重启后重新组卷即可，已答题目与错题记录以浏览器端为准。
- **上传文件落磁盘**：作业在 `${TUTTI_DATA_DIR}/uploads/`、管理员规则在 `${TUTTI_DATA_DIR}/upload-rules.json`，默认落在 `web/data`——该目录随发布一起被覆盖，线上必须把 `TUTTI_DATA_DIR` 指到持久化目录。
- **启动记录**：每次启动都会更新 `${TUTTI_DATA_DIR}/runtime-state.json`（`firstBootAt` / `lastBootAt` / `boots`）。`GET /api/health` 会回显 `boots` 与 `firstBootAt`：重新发布后这两个值若重置，说明平台重建了数据目录，上传规则与作业其实没被保住——这是判断「目录到底持不持久」的唯一实测依据，别靠猜。
- 会话 id 会被拼进文件名，所以读取前先卡 `^[a-f0-9]{32,128}$`，挡掉 `../` 这类路径穿越写法。

### 上传规则（仅管理员可编辑）

学员可在课程页上传作业，服务端按规则校验：

- **允许的格式**：扩展名白名单，默认 `.pdf`、`.docx`
- **文件名规则**：正则表达式，默认 `^[^_\\/]+_[^_\\/]+_[a-z]{2}\.(?:pdf|docx)$`（学号_姓名_课程代码，如 `2023010101_张三_py.pdf`）
- **命名说明**：不匹配时提示给学员的文字
- **大小上限**：单文件 MB 数，上限 200 MB

规则的读写在 `web/lib/upload-rules.cjs`：`checkFile()` 是唯一的校验入口（上传、删除都从这里过），`saveUpload()` 落盘时按「时间戳-随机串-安全名」重命名，`deleteUpload()` 只允许本人或管理员删，删文件时把 `storedName` 收敛成纯文件名再拼接——索引文件被手改过也越不出 `${TUTTI_DATA_DIR}/uploads/`。这套规则**只作用于网页端**，小程序端另有内嵌副本，见[「作业上传（小程序端）」](#作业上传小程序端)。

规则的读写规则：

```text
GET  /api/settings/upload   # 登录即可读，返回 canEdit 标记
PUT  /api/settings/upload   # 非管理员返回 403
POST /api/upload            # { courseId, fileName, contentBase64 }，校验格式/大小/命名
GET  /api/uploads           # 自己的上传记录；管理员看全部
```

前端只负责展示，真正的校验始终在服务端——改前端 JS 绕不过。文件名还会挡掉 `../` 这类路径穿越写法，落盘时按时间戳加随机前缀重命名，避免覆盖。

### 接口

| 方法    | 路径                      | 说明                                                                                                      |
| ------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| GET     | `/api/health`             | 免登录健康检查：`dataDirBoots` / `dataDirFirstBootAt` / `uptimeSec` / `courses`（不回显路径与运行时细节） |
| POST    | `/api/login`              | 登录，下发 HttpOnly 会话 Cookie                                                                           |
| POST    | `/api/logout`             | 退出                                                                                                      |
| GET     | `/api/me`                 | 当前账号与已解锁课程                                                                                      |
| GET     | `/api/courses`            | 课程列表，含 `unlocked` 标记                                                                              |
| GET     | `/api/courses/:id/topics` | 专题列表，未开通返回 403                                                                                  |
| POST    | `/api/quiz`               | 组卷，未开通返回 403                                                                                      |
| POST    | `/api/quiz/check`         | 判题，返回对错、正确答案、解析                                                                            |
| GET/PUT | `/api/settings/upload`    | 上传规则；PUT 仅管理员                                                                                    |
| POST    | `/api/upload`             | 上传作业，按规则校验                                                                                      |
| GET     | `/api/uploads`            | 上传记录（普通账号只看自己的，管理员看全部）                                                              |
| DELETE  | `/api/uploads/:id`        | 删除一条上传记录：本人或管理员；越权 403、不存在 404，删除时同时清掉盘上的文件                            |

### 已知限制

- **上传跨端不互通**：网页版的作业在 `${TUTTI_DATA_DIR}/uploads/`，小程序的在微信云存储 + `homework_uploads` 集合，两边各自查看、各自删除（网页版走 `DELETE /api/uploads/:id`，小程序在页面上删），管理员看不到另一边。
- **上传规则不跨端同步**：网页端的规则存在服务端，小程序读不到，用的是 `services/upload-rules.ts` 里的内嵌副本——改一边不影响另一边（一致性靠 `scripts/miniprogram-homework.test.cjs` 兜着）。
- **题型仅单/判/填**：判题引擎只覆盖这三种，新增题型需同时改 `services/quiz-engine.ts`、`web/lib/engine.cjs` 与 `web/lib/banks.cjs`（可抽取的 `TYPES` 在那里）。
- **前端视图状态写进 URL**：`?view=course|topics|quiz|summary&course=<id>&topic=<key>&count=<n>&type=<t>`，由 `web/public/app.js` 的 `show()` / `restoreFromUrl()` 维护；改视图切换逻辑时要同步这两处。
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

`init` 建的两个账号是 `admin`（管理员，全部题库）与 `demo`（仅 `py`）。密码不是固定的：默认随机生成并在 `init` 时打印一次，也可以在 `init` 前用 `TUTTI_ADMIN_PASSWORD` / `TUTTI_DEMO_PASSWORD` 指定。

> 账号真源是 `data/accounts.json`，CLI 只改这一处，服务端读的也是这一处：改完重启服务即生效。已经在用的人要重新登录一次，才会带上新的课程权限（会话里的解锁课程是登录时定的）。

## 微信登录与开通（云函数）

登录不再自建后台：`services/purchase.ts` 用 `wx.cloud.callFunction` 调 `login` 云函数（函数名在 `services/runtime-config.ts` 的 `loginFunctionName`），实现放在 `cloudfunctions/login/index.js`——它用 `cloud.getWXContext()` 直接取调用者 openid，所以**不需要 AppSecret、不需要 HTTPS 域名与备案**。返回格式：

```json
{
  "openId": "用户微信 openid",
  "agents": {
    "py": true,
    "ml": false
  }
}
```

`openId` 也可命名为 `wechatOpenId`（小程序两种都认）。`agents` 的 key 是课程 ID，value 表示是否已开通：`cloudfunctions/login` 读的就是该用户在 `user_profiles` 文档里的 `agents` 字段，所以**开通课程 = 在云开发控制台把该用户文档的 `agents.<课程>` 改成 `true`**，改完让学员重新登录（会话缓存在 storage 里，不重登还是旧的开通情况）。集合还没建或读失败时，函数按「未开通」返回，不会把异常抛给小程序。

本地开发不走云函数：`enableLocalWechatTestLogin=true` 时用 `wx.login` 的 code 生成本地测试 openid，并读 `data/access.ts` 当开通情况（见「扫码测试登录」）。生产配置里这个开关恒为 `false`，自检会校验。云函数调用失败时退回本地缓存会话，不会把已登录的学员踢下线；首次登录就失败的话，首页会显示 `getLastLoginFailure()` 给出的原因（例如「确认云开发里已上传 cloudfunctions/login」），而不是笼统的「未读取到可用授权」。

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

保存内容包括微信 ID、题库购买情况、错题记录、答题统计和答题进度。`wrongQuestions` 的元素结构（可读答案与解析）见上文[「错题记录」](#错题记录)。答题、移除错题与重置时会自动同步当前课程的数据；云数据库读写失败时答题页降级为本地使用并弹 toast，不会白屏。

作业上传（小程序端）用的是另一个集合 `homework_uploads`，一条一个文件，同样按「仅创建者可读写」的权限设计：

```json
{
  "courseId": "py",
  "wechatOpenId": "用户微信 openid",
  "originalName": "2023010101_张三_py.pdf",
  "storedName": "1758200000000-a1b2c3-2023010101_张三_py.pdf",
  "fileID": "cloud://.../homework/py/1758200000000-a1b2c3-2023010101_张三_py.pdf",
  "sizeBytes": 204800,
  "uploadedAt": "2026-10-01T04:20:00.000Z"
}
```

读取只列自己（查询条件里写死 `wechatOpenId`），删除按 `_id` 删自己那条；`fileID` 只在删除云存储文件时用，不展示到界面上。集合与云存储权限都要在云开发控制台建好，见[部署清单](#小程序)。

## 本地开发

### 扫码测试登录

当前 `services/purchase.ts` 支持本地扫码测试模式：当 `services/runtime-config.ts` 选择开发配置时，小程序仍会调用 `wx.login()`，开发者工具扫码登录后会生成本地测试 openid。

测试授权读取 `data/access.ts`，例如：

```ts
const access: Record<string, boolean> = {
  py: true,
  ml: false
};
```

将某个智能体改为 `true` 后，扫码登录即可进入对应题库。接入真实后端时，修改 `services/runtime-config.ts` 里的生产配置，填入真实后台地址和云数据库设置，后端用 `code` 换取真实 openid 并返回 `agents` 授权即可。

### 测试与自检

```bash
node --test                                   # 全部用例：小程序自检、接口、安全、运行数据、前端静态一致性
node scripts/web-deploy-check.cjs             # 网页版启动前自检（账号表、默认密码、会话落盘、数据目录）
node scripts/miniprogram-release-check.cjs    # 小程序发布前自检
```

网页端测试会临时起服务，并把会话、上传规则、作业文件全部指向临时目录（`TUTTI_DATA_DIR`、`TUTTI_ACCOUNTS_PATH`），不读写仓库里的真实数据，多个测试文件并行也不会互踩。`scripts/web-public.test.cjs` 还会检查前端静态资源的一致性（app.js 引用的 id 是否都存在、有没有 `alert()`、CSS 反模式等）。

小程序侧的用例在 `scripts/miniprogram-quiz.test.cjs`：组卷队列（`buildPracticeQueue` 的范围、题量、缺口、题目结构）与错题去重都直接加载 `services/quiz-engine.ts` 断言；另外两条静态检查守的是「改了 `data` 字段名忘了改 wxml」这类只在真机上暴露的错误——`pages/*/*.wxml` 里的每个 `bindtap` 都要在页面 `.ts` 里有同名方法，每个 `{{变量}}` 都要在页面 `data` 里声明。

作业上传的一致性在 `scripts/miniprogram-homework.test.cjs`：`services/upload-rules.ts`（经 `scripts/load-upload-rules.cjs` 做类型剥离后加载）与 `web/lib/upload-rules.cjs` 的规则取值、正则 `source`、同一批文件名下的校验结论逐项比对，另有开关在两套运行配置里都有显式取值、作业页已注册进 `app.json` 这类静态检查。

## 部署清单

启动（网页版）或发布（小程序）前逐项过一遍。两条通道各有一个自检脚本，退出码非 0 即还有未通过项。

### 网页版

`node scripts/web-deploy-check.cjs` 会把下面能自动判定的项跑一遍。

- [x] 默认密码不再硬编码：`init` 生成的密码是随机的（也可用 `TUTTI_ADMIN_PASSWORD` / `TUTTI_DEMO_PASSWORD` 指定），自检脚本会复核存量账号是否还在用 `admin2026` / `demo2026`
- [x] `data/accounts.json` 已 `git rm --cached` 并写入 `.gitignore`，账号盐值与哈希不进公开仓库（真源只有这一份，服务端直接读它）
- [x] 会话默认落盘：一个会话一个 JSON 文件，放在 `TUTTI_DATA_DIR/sessions/`，重启不掉线；多实例把 `TUTTI_DATA_DIR` 指向同一持久化目录即共用会话（见 [会话与运行数据](#会话与运行数据)）

### 小程序

`node scripts/miniprogram-release-check.cjs` 逐项自检（`[手工]` 项脚本判不了，需人工确认）：

- [x] 生产登录走 `login` 云函数：`cloudfunctions/login` 已入库（`cloud.getWXContext()` 取 openid，不需要 AppSecret 与备案域名），`project.config.json` 配了 `cloudfunctionRoot`，`services/purchase.ts` 用 `wx.cloud.callFunction` 调它——这三条自检逐项核对
- [ ] `cloudfunctions/login` 已上传到云开发：开发者工具里右键该目录 →「上传并部署：云端安装依赖」`[手工]`
- [ ] 云开发控制台建好 `user_profiles` 集合，权限设为「仅创建者可读写」；开通课程就是改该用户文档的 `agents.<课程>` 为 `true`，改完让学员重新登录 `[手工]`
- [ ] 开了作业上传（`enableHomeworkUpload=true`，生产默认开）就再建集合 `homework_uploads`（权限同样「仅创建者可读写」），云存储权限保持「所有用户可读、仅创建者可写」；没建时上传会失败并回显云开发的报错，不影响答题 `[手工]`
- [x] 生产开通由登录云函数按 `user_profiles.agents` 决定（本地测试开关是 `data/access.ts`，只在开发配置生效：`enableLocalWechatTestLogin=false` 时完全不读；自检会校验这个开关没被改回来）
- [x] 作业上传的集合名在 `services/homework.ts` 与 README 里一致（自检核对，改一处忘了另一处会失败）
- [ ] trial 体验版真机跑通再提审

自检脚本顺带会查：`appid` 是否已填、`project.config.json` 有没有漏排除 `web/`、`scripts/`、`docs/`、`templates/`、`outputs/`、`cloudfunctions/`（否则包体白涨）、`app.json` 声明的页面文件是否齐全、以及各题库 `_config` 与注册表是否对齐。

## 试卷生成流水线

`templates/` 放模板与配置，`outputs/` 放生成物（都在小程序上传包的排除清单里，不会打进去）：

| 路径                           | 作用                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| `templates/exam-template.md`   | 试卷模板，课程相关取值写成 `{{占位符}}`                            |
| `templates/examif.json`        | 考试基本信息：课程代码、名称、学年、学期、卷别、试卷代码、适用对象 |
| `templates/export.json`        | Word 导出的纸张、页边距与各段样式配置                              |
| `templates/export-schema.json` | `export.json` 的必填键校验骨架（值为 `null`，只校验键是否存在）    |
| `templates/latex-replace.json` | 数学式的文本化替换规则                                             |
| `outputs/*.md`                 | 生成的试卷与答案（`-A` / `-Ak` / `-B` / `-Bk`）                    |
| `outputs/*.docx`               | 由 Markdown 导出的 Word 文档                                       |

```bash
# 按 templates/examif.json 里该课程的配置，生成 A、B 两卷（正文 + 答案），并触发 docx 导出
node scripts/generate-exam-ml.cjs
node scripts/generate-exam-cv.cjs

# 显式指定 examif.json 里的配置 key
node scripts/generate-exam-ml.cjs machine-learning

# 只把已有的 Markdown 导出成 Word
python scripts/generate-exam-docx.py outputs/ml-2025-2-B.md
```

docx 导出依赖 `pandoc`；不装 pandoc 时 Markdown 仍会生成，只是 Word 那一步失败。排版细节与格式要求见 [design.md](./design.md)。
