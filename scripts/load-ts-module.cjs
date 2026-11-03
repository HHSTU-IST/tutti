const fs = require("fs");
const Module = require("module");

const { checkNodeVersion } = require("../web/lib/node-version.cjs");

// Node 只保留了类型「剥离」（strip），带 ESM/CJS 改写的 transform 模式在新版 Node 上已经取消。
// 所以这里只借 Node 的能力删类型标注，模块格式的改写交给下面这几条显式规则：
// 只覆盖本仓 Node 侧真正加载的写法（`export = 标识符`、`export function/const`），
// 出现别的 ESM 语法就地报错，不再依赖实验性 API 的隐式行为。
const NON_ERASABLE_HINT = "Node 的类型剥离只支持可擦除语法（enum、namespace、constructor 参数属性、`export = 表达式` 之类都要改写）";

function withSuppressedTypeStrippingWarning(callback) {
  const originalEmitWarning = process.emitWarning;

  process.emitWarning = function emitWarning(warning, ...args) {
    const message = typeof warning === "string"
      ? warning
      : warning && typeof warning.message === "string"
        ? warning.message
        : "";
    const type = typeof args[0] === "string"
      ? args[0]
      : warning && typeof warning.name === "string"
        ? warning.name
        : "";

    if (type === "ExperimentalWarning" && /strip.{0,32}typescript|typescript.{0,32}strip|type stripping/i.test(message)) {
      return;
    }

    return originalEmitWarning.call(process, warning, ...args);
  };

  try {
    return callback();
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

/** `export = data;` → `module.exports = data;`（data/access.ts 的写法，只认标识符，别的形态直接报错）。 */
function toErasableSource(source, modulePath) {
  const replaced = source.replace(
    /^[ \t]*export[ \t]*=[ \t]*([A-Za-z_$][\w$]*)[ \t]*;[ \t]*$/gm,
    (_, name) => `module.exports = ${name};`
  );

  if (/^[ \t]*export[ \t]*=/m.test(replaced)) {
    throw new Error(`${modulePath}：只支持「export = <标识符>;」，请改成「module.exports = <标识符>;」（${NON_ERASABLE_HINT}）`);
  }

  return replaced;
}

/** 把 strip 之后仍留在行首的 `export function/class/const...` 摘成 CommonJS 导出。 */
function toCommonJs(source, modulePath = "<未命名模块>") {
  const exportNames = [];
  let transformed = source;

  transformed = transformed.replace(
    /^[ \t]*export[ \t]+(?:async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)/gm,
    (_, name) => {
      exportNames.push(name);
      return `function ${name}`;
    }
  );

  transformed = transformed.replace(
    /^[ \t]*export[ \t]+class[ \t]+([A-Za-z_$][\w$]*)/gm,
    (_, name) => {
      exportNames.push(name);
      return `class ${name}`;
    }
  );

  transformed = transformed.replace(
    /^[ \t]*export[ \t]+(const|let|var)[ \t]+([A-Za-z_$][\w$]*)/gm,
    (_, keyword, name) => {
      exportNames.push(name);
      return `${keyword} ${name}`;
    }
  );

  const leftover = transformed.match(/^[ \t]*(?:export|import)[ \t]/m);

  if (leftover) {
    throw new Error(
      `${modulePath}：识别不了的 ESM 语法（行首 ${JSON.stringify(leftover[0].trim())}）。`
      + "Node 侧只支持 type-only import + `export function/class/const` 或 `export = <标识符>`；其它写法请改成 CommonJS。"
    );
  }

  if (!exportNames.length) return { source: transformed, exportNames };

  return { source: `${transformed}\nmodule.exports = { ${exportNames.join(", ")} };\n`, exportNames };
}

function evaluateCommonJs(source) {
  const compiledModule = { exports: {} };
  const factory = new Function("module", "exports", source);

  factory(compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

function stripTypes(erasableSource, modulePath) {
  try {
    // 不传 mode：默认就是 strip，且老版本 Node 未必认这个选项。
    return withSuppressedTypeStrippingWarning(() => Module.stripTypeScriptTypes(erasableSource));
  } catch (error) {
    throw new Error(`${modulePath}：类型剥离失败（${checkNodeVersion().current}）—— ${error.message}。${NON_ERASABLE_HINT}`);
  }
}

function loadTypeScriptModule(modulePath, options = {}) {
  const cache = options.cache || null;
  const cacheKey = options.cacheKey || modulePath;

  if (cache && cache.has(cacheKey)) return cache.get(cacheKey);

  // 类型剥离是 Node 22.6 起的能力：版本不够时给一句人话，别让调用方撞上 undefined。
  if (typeof Module.stripTypeScriptTypes !== "function") {
    throw new Error(`无法加载 ${modulePath}：${checkNodeVersion().message}`);
  }

  const source = fs.readFileSync(modulePath, "utf8");
  const strippedSource = stripTypes(toErasableSource(source, modulePath), modulePath);
  const { source: commonJsSource } = toCommonJs(strippedSource, modulePath);
  const moduleExports = evaluateCommonJs(commonJsSource);

  if (!Object.keys(moduleExports).length) {
    throw new Error(`无法加载 ${modulePath}：求值后没有导出任何符号（检查 \`export\` / \`module.exports\` 写法）`);
  }

  if (cache) {
    cache.set(cacheKey, moduleExports);
  }

  return moduleExports;
}

module.exports = {
  loadTypeScriptModule,
  toCommonJs,
  toErasableSource
};
