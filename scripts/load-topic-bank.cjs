const path = require("path");
const { loadTypeScriptModule } = require("./load-ts-module.cjs");

const cachedTopicBanks = new Map();

function loadTopicBank(courseCode = "ml") {
  const bankPath = path.join(__dirname, `../data/topic-${courseCode}.ts`);
  return loadTypeScriptModule(bankPath, {
    cache: cachedTopicBanks
  });
}

module.exports = {
  loadTopicBank
};
