const { createCourseGenerator } = require("./exam-courses.cjs");

module.exports = createCourseGenerator("ml");

if (require.main === module) {
  module.exports.runCli();
}
