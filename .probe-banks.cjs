const { loadTopicBank } = require("./scripts/load-topic-bank.cjs");

const bank = loadTopicBank("py");
const topics = ["var", "flow", "func", "oop", "decorator", "magic", "generator", "thread", "code"];

for (const key of topics) {
  const topic = bank[key] || {};
  for (const type of ["single", "judge"]) {
    (topic[type] || []).forEach((q, i) => {
      if (q.explain || q.explanation) return;
      console.log(`--- ${key}.${type}[${i}]`);
      console.log("Q: " + q.question);
      if (type === "single") {
        console.log("O: " + JSON.stringify(q.options));
        console.log("A: " + q.answer);
      } else {
        console.log("A: " + q.answer);
      }
      console.log("");
    });
  }
}

console.log("\n===== al fill 现有题目 =====");
const al = loadTopicBank("al");
for (const key of ["complex", "array", "linked", "stack", "tree", "graph", "sort", "dp"]) {
  (al[key].fill || []).forEach((q, i) => {
    console.log(`${key}.fill[${i}] ${q.question} | 答案: ${q.answer} | explain: ${q.explain || "(无)"}`);
  });
}

console.log("\n===== ml fill 样例 5 条 =====");
const ml = loadTopicBank("ml");
let shown = 0;
for (const key of ["base", "reg", "classify"]) {
  (ml[key].fill || []).slice(0, 2).forEach(q => {
    console.log(`${q.question} | 答案: ${q.answer}`);
    shown += 1;
  });
}
