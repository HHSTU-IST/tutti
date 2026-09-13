#!/usr/bin/env node
// 生成网页版的自包含运行数据：web/data/courses.json + web/data/banks/*.json。
// 发布沙箱只上传 web/ 目录，所以运行期不能依赖 web/ 之外的 data/topic-*.ts。
const fs = require("fs");
const path = require("path");

const { buildCatalogFromRepo, REPO_DATA_DIR, summarize } = require("../web/lib/catalog.cjs");

const OUT_DIR = path.join(__dirname, "../web/data");
const BANKS_DIR = path.join(OUT_DIR, "banks");

function main() {
  const entries = buildCatalogFromRepo();
  if (!entries.length) {
    console.error("没有构建出任何课程，请检查 data/topic-*.ts。");
    process.exitCode = 1;
    return;
  }

  // 只重建题库产物：web/data 下还有 upload-rules.json 与 uploads/，
  // 整目录删除会把管理员设置的上传规则和已上传的文件一起清掉。
  fs.rmSync(BANKS_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(OUT_DIR, "courses.json"), { force: true });
  fs.mkdirSync(BANKS_DIR, { recursive: true });

  const courses = entries.map(({ bank, ...course }) => course);

  fs.writeFileSync(
    path.join(OUT_DIR, "courses.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), courses }, null, 2)}\n`
  );

  entries.forEach(({ id, bank }) => {
    fs.writeFileSync(path.join(BANKS_DIR, `${id}.json`), JSON.stringify(bank));
  });

  const accountsSrc = path.join(REPO_DATA_DIR, "accounts.json");
  if (fs.existsSync(accountsSrc)) {
    fs.copyFileSync(accountsSrc, path.join(OUT_DIR, "accounts.json"));
  } else {
    console.warn("未找到 data/accounts.json，请先执行 node scripts/manage-accounts.cjs init");
  }

  courses.forEach(course => {
    const { topicCount, questionTotal } = summarize(course.topics);
    console.log(`  ${course.id.padEnd(4)} ${course.title.padEnd(14)} ${topicCount} 个专题 / ${questionTotal} 道题`);
  });
  console.log(`\n已生成 web/data/（${courses.length} 门课程）`);
}

main();
