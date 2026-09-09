# 试卷智能体

试卷智能体自动从题库随机组卷，并导出符合高校考试格式的 Word 文档。

## 核心功能状态

- [x] 随机生成试卷（已完成）
- [x] 随机生成试卷
- [ ] 导出为 .docx 文件
  - [x] 字体
    - 颜色：黑色
    - 一级标题：黑体
    - 大题：黑体
    - 试卷代码：宋体
    - 适用对象：黑体
    - 大题题注：宋体
    - 小题：宋体
    - 非汉字字符：罗马字体
    - 黑体均不加粗
  - [x] 字号
    - 第一个一级标题：16 pt
    - 第二个一级标题：18 pt
    - 试卷代码：14 pt
    - 适用对象：14 pt
    - 大题及题注：12 pt
    - 小题：12 pt
  - [x] 纸张：B5
  - [x] 页边距
    - 上、下：1 inch
    - 左、右：0.8 inch
  - [x] 行间距：单倍行距
  - [x] 页脚：（第{page}页 共{total}页）
  - [x] 大题
    - 二级标题
    - 上方空一行
  - [x] 小题
    - 编号全卷统一
    - 不缩进
  - [x] 表格
    - 位置：居中
    - 边框：全部为实线

### 考试信息

exam 信息需要从 `examif.json` 中读取

- courseName
  - xm：机器学习概论
- yearRaw
  - 2025：2025-2026学年
  - 2026：2026-2027学年
  - 2027：2027-2028学年
  - 以此类推
- termRaw
  - 1：第一学期
  - 2：第二学期
  - 以此类推
- versionRaw
  - A：A卷
  - B：B卷

生成的文件名为

- 试卷：`{courseCode}-{yearRaw}-{termRaw}-{versionRaw}.md`
- 答案：`{courseCode}-{yearRaw}-{termRaw}-{versionRaw}k.md`

### 配置与数据流程

#### 输入配置文件

`examif.json` - 考试基本信息配置

```json
{
  "key1": {
    "courseCode": "xm",           // 课程代码
    "courseName": "机器学习概论", // 课程名称
    "yearRaw": 2025,              // 年份原始值
    "termRaw": 2,                 // 学期原始值
    "versionRaw": "A"             // 卷别
  }
}
```

#### 输出文件名规则

- 试卷文件：`{courseCode}-{yearRaw}-{termRaw}-{versionRaw}.md`
- 答案文件：`{courseCode}-{yearRaw}-{termRaw}-{versionRaw}k.md`
- Word 文档：同文件名，后缀 .docx

#### 核心脚本

1. **`scripts/generate-exam-ml.cjs`** - 试卷生成主程序
   - 从题库按知识点权重随机抽题
   - 填充 `exam-template.md` 模板生成 Markdown 试卷
   - 调用 Python 脚本导出 Word 文档

2. **`scripts/generate-exam-docx.py`** - Word 导出工具
   - 读取 `export.json` 样式配置
   - 使用 python-docx 生成符合格式要求的 Word 文档
   - 自动处理字体、字号、页边距、页码等格式

## 待开发任务

### 刷题智能体

- [ ] 完成 `al`（数据结构与算法）题库建设
- [ ] 完成 `dl`（深度学习）题库建设
- [ ] 增加答题统计和错题本功能

### 试卷智能体

- [ ] 支持更多课程的自动组卷
- [ ] 优化题目知识点覆盖率算法
- [ ] 支持在线预览试卷功能
