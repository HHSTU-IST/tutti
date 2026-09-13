const { createCourseGenerator } = require("./exam-courses.cjs");

module.exports = createCourseGenerator("cv");

if (require.main === module) {
  module.exports.runCli();
}
