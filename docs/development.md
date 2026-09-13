# 开发文档

面向要改这个仓库的人：架构、实现细节、接口契约、本地开发与自检都在这里。

部署步骤、部署清单与使用说明在根目录 [README](../README.md)，试卷智能体的设计说明在 [design.md](./design.md)。

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
- **Node**: 统一要求 ≥ 22.6.0（`web/package.json` 的 `engines`；常量与比较逻辑在 `web/lib/node-version.cjs`，服务启动时会打印实际版本）

## 目录结构

```text
├── data/           # 题库 data/topic-*.ts、本地测试开关、网页端账号表
├── docs/           # 项目文档：development.md（本文件）、design.md（试卷智能体设计）
├── outputs/        # 试卷脚本的生成物（.md / .docx）
├── pages/          # 小程序页面
├── prompts/        # 课程知识点提示
├── scripts/        # 工具脚本：构建、账号、自检、组卷
├── services/       # 核心业务逻辑
├── templates/      # 试卷模板与配置：exam-template.md、examif.json、export.json、latex-replace.json
├── types/          # TypeScript 类型定义
└── web/            # 网页版（Node 服务端 + 静态页面）
```

## 题库与答题引擎

- **题库加载**：`data/topic-*.ts` 按课程存储题库，格式符合 `QuizBank` 接口
- **答题引擎**：`services/quiz-engine.ts` 提供题目抽取、洗牌、选项随机化等核心功能
- **页面渲染**：`pages/quiz/` 负责小程序端的题目展示和交互
- **题型支持**：单选题、判断题、填空题

小程序端支持多课程题库管理、随机抽题和固定模板试卷练习。试卷模式默认抽取 20 道单选、10 道判断和 10 道填空题；导出功能使用微信剪贴板，复制后可粘贴到文档或聊天中。

### 已支持课程

- [x] `py`：Python 编程
- [x] `al`：数据结构与算法
- [x] `ml`：机器学习
- [x] `cv`：图像处理
- [ ] `dl`：深度学习

全部课程题库都编译进同一个小程序，首页登录后列出所有课程。后台 `agents` 中对应值为 `true` 的课程显示「进入练习」，点击进入 `/pages/quiz/quiz?kind=<课程 ID>`；未开通课程置灰显示「未开通」，点击提示尚未开通。答题页会校验 URL 传入的课程是否已授权，防止绕过首页直接进入未付费题库。每门课程的答题统计、专题进度与错题本按课程 ID 分开保存，互不干扰。

### 新增一门课程（智能体）

需要同步改三处：

- `data/access.ts` 中的本地测试开关（同时提供默认全 `false` map 的键列表）
- 对应题库文件 `data/topic-<id>.ts`
- `services/registry.ts` 中的 `AGENT_REGISTRY`

> 参考示例：`al` 与 `cv` 均已完整接入——题库分别在 `data/topic-al.ts`、`data/topic-cv.ts`，注册见 `services/registry.ts` 的 `AGENT_REGISTRY`，本地测试开关见 `data/access.ts`（开发环境置 `true` 即可扫码进入）。

## 网页版实现

网页版把同一套 `data/topic-*.ts` 题库发布到浏览器，**题库权限由账号决定**：已付费课程可选，未付费课程不可选，管理员账号可进入全部题库。

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
- 会话 id 会被拼进文件名，所以读取前先卡 `^[a-f0-9]{32,128}$`，挡掉 `../` 这类路径穿越写法。

### 上传规则（仅管理员可编辑）

学员可在课程页上传作业，服务端按规则校验：

- **允许的格式**：扩展名白名单，默认 `.pdf`、`.docx`
- **文件名规则**：正则表达式，默认 `^[^_\\/]+_[^_\\/]+_[a-z]{2}\.(?:pdf|docx)$`（学号_姓名_课程代码，如 `2023010101_张三_py.pdf`）
- **命名说明**：不匹配时提示给学员的文字
- **大小上限**：单文件 MB 数，上限 200 MB

规则的读写规则：

```text
GET  /api/settings/upload   # 登录即可读，返回 canEdit 标记
PUT  /api/settings/upload   # 非管理员返回 403
POST /api/upload            # { courseId, fileName, contentBase64 }，校验格式/大小/命名
GET  /api/uploads           # 自己的上传记录；管理员看全部
```

前端只负责展示，真正的校验始终在服务端——改前端 JS 绕不过。文件名还会挡掉 `../` 这类路径穿越写法，落盘时按时间戳加随机前缀重命名，避免覆盖。

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

### 已知限制

- **上传暂无删除接口**：管理端目前只能经 `/api/uploads` 查看；删文件需手动清理 `${TUTTI_DATA_DIR}/uploads/`（连同同目录 `index.json` 里的记录）。
- **题型仅单/判/填**：判题引擎与构建脚本只覆盖这三种，新增题型需同时改 `services/quiz-engine.ts`、`web/lib/engine.cjs` 与 `scripts/build-web-bundle.cjs`。
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

> 账号真源是 `data/accounts.json`，CLI 只改这一处；改完后重跑 `node scripts/build-web-bundle.cjs` 同步到 `web/data/accounts.json`，再重新发布才在线上生效（发布沙箱只上传 `web/`）。

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

保存内容包括微信 ID、题库购买情况、错题记录、答题统计和答题进度。答题和重置时会自动同步当前刷题助手的数据；云数据库读写失败时答题页降级为本地使用并弹 toast，不会白屏。

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
node --test                                   # 全部用例：小程序自检、接口、安全、部署、前端静态一致性
node scripts/web-deploy-check.cjs             # 网页版部署自检
node scripts/miniprogram-release-check.cjs    # 小程序发布前自检
```

网页端测试会临时起服务，并把会话、上传规则、作业文件全部指向临时目录（`TUTTI_DATA_DIR`、`TUTTI_ACCOUNTS_PATH`），不读写仓库里的真实数据，多个测试文件并行也不会互踩。`scripts/web-public.test.cjs` 还会检查前端静态资源的一致性（app.js 引用的 id 是否都存在、有没有 `alert()`、CSS 反模式等）。

## 试卷生成流水线

`templates/` 放模板与配置，`outputs/` 放生成物（都在小程序上传包的排除清单里，不会打进去）：

| 路径                            | 作用                                     |
| ------------------------------- | ---------------------------------------- |
| `templates/exam-template.md`    | 试卷模板，课程相关取值写成 `{{占位符}}`  |
| `templates/examif.json`         | 考试基本信息：课程代码、名称、学年、学期、卷别、试卷代码、适用对象 |
| `templates/export.json`         | Word 导出的纸张、页边距与各段样式配置    |
| `templates/latex-replace.json`  | 数学式的文本化替换规则                   |
| `outputs/*.md`                  | 生成的试卷与答案（`-A` / `-Ak` / `-B` / `-Bk`） |
| `outputs/*.docx`                | 由 Markdown 导出的 Word 文档             |

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
