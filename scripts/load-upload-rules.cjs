const path = require("path");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");

const uploadRulesPath = path.join(__dirname, "../services/upload-rules.ts");
const cachedUploadRules = new Map();

// services/upload-rules.ts 只有 type-only import + `export function`，改写交给 load-ts-module.cjs。
function loadUploadRules() {
  return loadTypeScriptModule(uploadRulesPath, {
    cache: cachedUploadRules
  });
}

module.exports = {
  loadUploadRules
};
