const path = require("path");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");

const quizEnginePath = path.join(__dirname, "../services/quiz-engine.ts");
const cachedQuizEngine = new Map();

function toCommonJs(source) {
  const exportNames = [];
  const transformed = source.replace(/^export function (\w+)\(/gm, (_, name) => {
    exportNames.push(name);
    return `function ${name}(`;
  });

  if (!exportNames.length) {
    throw new Error(`未识别到可导出的 quiz-engine 函数：${quizEnginePath}`);
  }

  return `${transformed}\nmodule.exports = { ${exportNames.join(", ")} };\n`;
}

function loadQuizEngine() {
  return loadTypeScriptModule(quizEnginePath, {
    cache: cachedQuizEngine,
    transformSource: toCommonJs
  });
}

module.exports = {
  loadQuizEngine
};
