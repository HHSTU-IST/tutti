# 刷题助手

tutti 是可扩展的刷题助手，提供网页端和微信小程序。两边共用同一份题库与同一套专题划分，但**登录体系与数据不互通**：小程序按微信 openid + 后台授权，网页版按账号密码，答题记录分别存在微信云数据库和网页服务端。

- 想改代码、看接口与数据结构 → [docs/development.md](docs/development.md)
- 只想部署和用 → 继续往下看

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

### 已支持课程

- [x] `py`：Python 编程
- [x] `al`：数据结构与算法
- [x] `ml`：机器学习
- [x] `cv`：图像处理
- [ ] `dl`：深度学习

全部课程题库都编译进同一个小程序，未开通的课程置灰不可进入。新增课程要同步改哪三处，见 [docs/development.md](docs/development.md) 的「新增一门课程」。

## 使用说明

### 学员

**网页版**：打开网址 → 用管理员给的账号密码登录 → 首页列出全部题库，已开通的可点进入，未开通显示「未开通」（点一下会提示去联系管理员）→ 选专题（或「全部专题（混合）」）→ 选题量与题型 → 开始练习 → 逐题作答，提交后立刻显示对错与解析（填空需手输答案）→ 答完显示正确率。当前视图与选择都会写进地址栏（`?view=quiz&course=py&topic=var&count=20&type=all`），刷新不掉进度页、可以分享链接、也能用浏览器后退。

**微信小程序**：微信中打开小程序，自动完成微信登录 → 首页列出全部课程，已购课程显示「进入练习」→ 进入后按专题刷题，统计、进度、错题本按课程分开保存。

### 管理员

1. 用 `admin` 账号登录网页版，**全部题库自动解锁**（普通账号只能进已登记的课程）。
2. **开通课程**：`node scripts/manage-accounts.cjs courses <账号> py,ml` 调整该账号的已购课程（完整 CLI 见 [docs/development.md](docs/development.md) 的「账号管理」）。
3. **上传规则**：课程页底部「上传规则设置」面板改允许格式、文件名正则、命名说明、大小上限，保存后对所有学员的后续上传立即生效。格式与命名的校验在服务端，改前端绕不过。
4. 小程序的课程开通走另一套：由后台在 `agents` 里对应用户返回 `true`，不需要在网页端操作。

## 文档与目录

| 路径                                       | 内容                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/development.md](docs/development.md) | 开发文档：项目架构、题库与答题引擎、网页版实现（权限模型 / 会话与运行数据 / 上传规则 / 接口表）、已知限制、账号管理、部署清单（网页版 / 小程序）、微信登录授权契约、`user_profiles` 结构、本地调试与测试、试卷生成流水线 |
| [docs/design.md](docs/design.md)           | 试卷智能体设计与 Word 导出格式要求                                                                                                                                                          |
| `templates/`                               | 试卷模板与配置：`exam-template.md`、`examif.json`、`export.json`、`latex-replace.json`                                                                                                      |
| `outputs/`                                 | 试卷脚本的生成物（`.md` / `.docx`）                                                                                                                                                         |

```text
├── data/       # 题库 data/topic-*.ts、本地测试开关、网页端账号表
├── docs/       # development.md、design.md
├── outputs/    # 试卷脚本的生成物
├── pages/      # 小程序页面
├── prompts/    # 课程知识点提示
├── scripts/    # 构建、账号、自检、组卷脚本
├── services/   # 核心业务逻辑
├── templates/  # 试卷模板与配置
├── types/      # TypeScript 类型定义
└── web/        # 网页版（Node 服务端 + 静态页面）
```

## 部署与运行

两条发布通道共用 `data/topic-*.ts` 这一份题库，可只上一边，也可两边都上。

> **运行环境**：Node ≥ 22.6.0（`web/package.json` 的 `engines` 已声明，用系统里装好的 Node 即可；项目零依赖，不需要 `npm install`）。小程序端由微信开发者工具编译，不受这个限制。

| 通道       | 入口       | 登录方式               | 运行形态               |
| ---------- | ---------- | ---------------------- | ---------------------- |
| 网页版     | `web/`     | 账号密码（自建账号表） | Node HTTP 服务，单端口 |
| 微信小程序 | 仓库根目录 | 微信登录 + 后台授权    | 微信开发者工具上传发布 |

### 网页版部署

```bash
# 1) 生成运行数据（改过题库或账号后必须重跑；需要 Node ≥ 22.6.0）
node scripts/build-web-bundle.cjs

# 2) 初始化账号（仅首次）
node scripts/manage-accounts.cjs init

# 3) 启动（无第三方依赖，不需要 npm install）
PORT=3000 HOST=0.0.0.0 node web/server.js
# 有持久化目录的机器上，让它把会话/规则/作业都落到那里，别留在随发布覆盖的 web/data：
# TUTTI_DATA_DIR=/var/lib/tutti PORT=3000 HOST=0.0.0.0 node web/server.js

# 4) 发布到平台（WorkBuddy「发布为应用」）前先跑这一条：重建产物 + 上传包检查 + 部署自检 + 打印发布参数
node scripts/deploy-web.cjs
# 加 --clean 会先清掉 web/data 下的本地运行数据（会话/作业/启动计数），别把本地状态传上线：
node scripts/deploy-web.cjs --clean
```

- **单机 / 容器**：任何能跑 Node 的主机起这一个进程，前面挂 Nginx 做 HTTPS 与反向代理即可。
- **WorkBuddy「发布为应用」**：目录选 `web/`，语言 `node`，启动命令 `node server.js`，**安装命令留空**（跳过 `npm install`：沙箱里装依赖会阻塞启动，60 秒内没监听端口就发布会失败）。注意发布只上传该目录，所以**必须先跑构建脚本**生成自包含数据；服务需监听 `PORT` 并绑定 `0.0.0.0`（已默认如此）。完整发布参数（应用 ID、线上地址、发布后复核步骤）由 `node scripts/deploy-web.cjs` 打印。
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

**部署清单**：发布前逐项过一遍 → [docs/development.md 的「部署清单」](docs/development.md#部署清单)（`node scripts/web-deploy-check.cjs` 自检，退出码非 0 即还有未通过项）。

**回滚**：重新发布旧版 `web/` 目录即可回退代码；数据回滚先恢复 `data/accounts.json` 备份，再重跑 `node scripts/build-web-bundle.cjs`。

### 小程序部署

1. 用**微信开发者工具**（稳定版）导入仓库根目录；`project.config.json` 里的 `appid` 目前是 `wxf7f1812c7c4f4106`，换成自己的需在微信公众平台注册后修改该字段。
2. **本地调试**：把 `data/access.ts` 里要测的课程置为 `true`，开发者工具扫码登录即可进入（详见 [docs/development.md](docs/development.md) 的「扫码测试登录」）。
3. **接后台授权**：填 `services/runtime-config.ts` 中 `PRODUCTION_RUNTIME_CONFIG.wechatLoginApiUrl`（必须 HTTPS）。**当前为空，不填线上会白屏**——这是发布前最容易被漏掉的一项；启动时 `console.error` 会打印缺哪一项，首页也会显示「生产配置缺失」。
4. **云数据库**：开发者工具「云开发」新建/选择环境，建集合 `user_profiles`，权限建议「仅创建者可读写」。`app.ts` 的 `wx.cloud.init()` 默认走默认环境；多环境部署时在 `services/runtime-config.ts` 填 `cloudEnv` 指定环境 ID（留空时启动会 `console.warn` 提示）。云数据库读写失败时答题页会降级为本地使用并弹 toast，不会白屏。
5. **发布**：开发者工具右上角「上传」填版本号 → 微信公众平台「版本管理」提交审核 → 审核通过点「发布」。体验版（`envVersion=trial`）与正式版走同一套生产配置，可先拿它做真机验证。

**发布前自检**：逐项过一遍 → [docs/development.md 的「部署清单」](docs/development.md#部署清单)（`node scripts/miniprogram-release-check.cjs` 自检，退出码非 0 即还有未通过项；`[手工]` 项脚本判不了，需人工确认）。
