const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { loadUploadRules } = require("./load-upload-rules.cjs");

const APP_DIR = path.join(__dirname, "..");
// 网页端规则是这一套的第二处实现：小程序读不到服务端那份文件，只能内嵌副本。
const webRules = require("../web/lib/upload-rules.cjs");
const rules = loadUploadRules();

test("小程序内嵌的上传规则与网页端默认规则同值", () => {
  const mini = rules.defaultUploadRules();
  const web = webRules.DEFAULT_RULES;

  assert.deepEqual(mini.allowedExtensions, web.allowedExtensions);
  assert.equal(mini.maxSizeMb, web.maxSizeMb);
  assert.equal(mini.filenameHint, web.filenameHint);
  // 字符串转义很容易在复制时错一个反斜杠，所以比 RegExp 规范化后的 source，而不是比原字符串。
  assert.equal(new RegExp(mini.filenamePattern).source, new RegExp(web.filenamePattern).source);
});

test("校验结论与网页端 checkFile 完全一致", () => {
  const cases = [
    ["2023010101_张三_py.pdf", 1024 * 1024, "正常文件"],
    ["2023010101_张三_dl.docx", 3 * 1024 * 1024, "允许的另一种格式"],
    ["作业.pdf", 1024, "文件名不符合命名规则"],
    ["2023010101_张三_py.zip", 1024, "格式不允许"],
    ["2023010101_张三_py", 1024, "没有扩展名"],
    ["../2023010101_张三_py.pdf", 1024, "带路径的文件名"],
    ["", 1024, "空文件名"],
    ["2023010101_张三_py.pdf", 20 * 1024 * 1024, "超过大小上限"]
  ];

  cases.forEach(([fileName, sizeBytes, label]) => {
    const mini = rules.checkHomeworkFile(fileName, sizeBytes, rules.defaultUploadRules());
    const web = webRules.checkFile(fileName, sizeBytes, webRules.DEFAULT_RULES);

    assert.equal(mini.ok, web.ok, `${label}（${fileName}）的结论应与网页端一致`);
    if (web.ok) assert.equal(mini.safeName, web.safeName, `${label} 的落盘文件名应与网页端一致`);
  });
});

test("校验失败时给出的是能照着改的具体原因", () => {
  const rejected = rules.checkHomeworkFile("作业.pdf", 1024, rules.defaultUploadRules());
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /文件名不符合要求/, "命名不符要提示命名要求，而不是笼统的失败");

  const oversized = rules.checkHomeworkFile("2023010101_张三_py.pdf", 11 * 1024 * 1024, rules.defaultUploadRules());
  assert.match(oversized.error, /10 MB/);
});

test("文件大小文案：KB 与 MB 的边界", () => {
  assert.equal(rules.describeFileSize(0), "1 KB");
  assert.equal(rules.describeFileSize(2048), "2 KB");
  assert.equal(rules.describeFileSize(1024 * 1024), "1.0 MB");
  assert.equal(rules.describeFileSize(2.5 * 1024 * 1024), "2.5 MB");
});

test("作业上传开关在开发与生产配置里都有显式取值", () => {
  const source = fs.readFileSync(path.join(APP_DIR, "services/runtime-config.ts"), "utf8");
  const occurrences = source.match(/enableHomeworkUpload:\s*(?:true|false)/g) || [];

  assert.equal(occurrences.length, 2, "开发与生产两套配置都要显式写 enableHomeworkUpload");
  assert.ok(
    source.includes("enableHomeworkUpload: false") && source.includes("enableHomeworkUpload: true"),
    "开发配置要关掉（本地没有云环境），生产配置要打开（否则线上没有作业入口）"
  );
});

test("作业上传页面的字段与接口都接上了", () => {
  const page = fs.readFileSync(path.join(APP_DIR, "pages/homework/homework.ts"), "utf8");
  const appJson = JSON.parse(fs.readFileSync(path.join(APP_DIR, "app.json"), "utf8"));

  assert.ok(appJson.pages.includes("pages/homework/homework"), "app.json 里没注册作业页，点入口会跳到不存在的页面");
  ["uploadHomeworkFile", "listHomeworkUploads", "deleteHomeworkUpload"].forEach(name => {
    assert.match(page, new RegExp(`\\b${name}\\(`), `pages/homework/homework.ts 没调用 ${name}`);
  });
});
