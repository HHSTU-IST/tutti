const fs = require("fs");
const Module = require("module");

function withSuppressedStripTypeScriptWarning(callback) {
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

    if (type === "ExperimentalWarning" && message.includes("stripTypeScriptTypes")) {
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

function evaluateCommonJs(source) {
  const compiledModule = { exports: {} };
  const factory = new Function("module", "exports", source);

  factory(compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

function loadTypeScriptModule(modulePath, options = {}) {
  const cache = options.cache || null;
  const cacheKey = options.cacheKey || modulePath;
  const transformSource = options.transformSource || (source => source);

  if (cache && cache.has(cacheKey)) return cache.get(cacheKey);

  const source = fs.readFileSync(modulePath, "utf8");
  const strippedSource = withSuppressedStripTypeScriptWarning(() => Module.stripTypeScriptTypes(source, {
    mode: "transform"
  }));
  const moduleExports = evaluateCommonJs(transformSource(strippedSource));

  if (cache) {
    cache.set(cacheKey, moduleExports);
  }

  return moduleExports;
}

module.exports = {
  loadTypeScriptModule
};
