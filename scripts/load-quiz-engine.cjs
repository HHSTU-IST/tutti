const path = require("path");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");

const quizEnginePath = path.join(__dirname, "../services/quiz-engine.ts");
const cachedQuizEngine = new Map();

// ESM → CommonJS 的改写在 load-ts-module.cjs 里统一处理，这里只负责「加载 + 缓存」。
function loadQuizEngine() {
  return loadTypeScriptModule(quizEnginePath, {
    cache: cachedQuizEngine
  });
}

module.exports = {
  loadQuizEngine
};
