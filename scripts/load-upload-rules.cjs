const path = require("path");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");

const uploadRulesPath = path.join(__dirname, "../services/upload-rules.ts");
const cachedUploadRules = new Map();

// 与 load-quiz-engine.cjs 同一套路：把 `export function` 摘成普通函数，末尾补 module.exports。
// services/upload-rules.ts 只用 type-only import（会被 stripTypeScriptTypes 去掉），所以能这样求值。
function toCommonJs(source) {
  const exportNames = [];
  const transformed = source.replace(/^export function (\w+)\(/gm, (_, name) => {
    exportNames.push(name);
    return `function ${name}(`;
  });

  if (!exportNames.length) {
    throw new Error(`未识别到可导出的 upload-rules 函数：${uploadRulesPath}`);
  }

  return `${transformed}\nmodule.exports = { ${exportNames.join(", ")} };\n`;
}

function loadUploadRules() {
  return loadTypeScriptModule(uploadRulesPath, {
    cache: cachedUploadRules,
    transformSource: toCommonJs
  });
}

module.exports = {
  loadUploadRules
};
