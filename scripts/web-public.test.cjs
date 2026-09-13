const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 网页端静态资源的一致性检查：改 index.html 时把 id 删掉、改名，这里会先炸，
// 不用等浏览器里点出白屏。
const PUBLIC_DIR = path.join(__dirname, "../web/public");

function readPublicFile(name) {
  return fs.readFileSync(path.join(PUBLIC_DIR, name), "utf8");
}

function collect(source, pattern) {
  return Array.from(source.matchAll(pattern), match => match[1]);
}

function htmlIds(html) {
  return new Set(collect(html, /\bid="([^"]+)"/g));
}

test("app.js 引用的 id 在 index.html 里都存在", () => {
  const ids = htmlIds(readPublicFile("index.html"));
  const referenced = new Set(collect(readPublicFile("app.js"), /\bel\("([^"]+)"\)/g));

  assert.ok(referenced.size >= 20, `应抓到足够多的 id 引用，实际 ${referenced.size}`);
  const missing = [...referenced].filter(id => !ids.has(id));
  assert.deepEqual(missing, [], `index.html 缺少这些 id：${missing.join("、")}`);
});

test("label 与 aria-labelledby 指向的 id 都存在", () => {
  const html = readPublicFile("index.html");
  const ids = htmlIds(html);
  const targets = collect(html, /\bfor="([^"]+)"/g).concat(collect(html, /\baria-labelledby="([^"]+)"/g));

  assert.ok(targets.length > 0, "应至少有一处 label / aria-labelledby 绑定");
  const dangling = targets.filter(id => !ids.has(id));
  assert.deepEqual(dangling, [], `指向了不存在的 id：${dangling.join("、")}`);
});

test("错误提示走内联提示，不再用 alert()", () => {
  const js = readPublicFile("app.js");
  assert.equal(/(^|[^.\w])alert\(/.test(js), false, "错误应内联显示并带 aria-live，不要用 alert()");
});

test("style.css 不含 outline: none 与 transition: all，且有降级动效分支", () => {
  const css = readPublicFile("style.css");
  assert.equal(/outline:\s*none/.test(css), false, "焦点样式不能只靠关掉 outline");
  assert.equal(/transition:\s*all/.test(css), false, "transition 要显式列属性");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "需要 prefers-reduced-motion 降级分支");
});
