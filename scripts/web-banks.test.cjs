const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 网页端题库只有一份真源：仓库 data/topic-*.ts。
// 这里既验「读的就是它」，也顺带守住「别再往 web/data 下复制一份副本」。
const banks = require("../web/lib/banks.cjs");
const { buildCatalogFromRepo } = require("../web/lib/catalog.cjs");

function courseSummary(courses) {
  return courses.map(course => ({
    id: course.id,
    title: course.title,
    topicKeys: course.topics.map(topic => topic.key),
    questionTotal: course.questionTotal
  }));
}

test("题库直接来自 data/topic-*.ts，不再有第二份副本", () => {
  const expected = buildCatalogFromRepo().map(entry => {
    const { bank, ...course } = entry;
    const topics = course.topics.map(topic => ({
      single: topic.single,
      judge: topic.judge,
      fill: topic.fill
    }));
    return Object.assign(course, {
      topicKeys: course.topics.map(topic => topic.key),
      questionTotal: topics.reduce((total, topic) => total + topic.single + topic.judge + topic.fill, 0)
    });
  });

  assert.deepEqual(courseSummary(banks.catalog), courseSummary(expected));
  assert.ok(banks.catalog.length > 0, "至少应有课程可用");

  const webData = path.join(__dirname, "../web/data");
  assert.equal(fs.existsSync(path.join(webData, "banks")), false, "题库不该再往 web/data 下复制一份");
  assert.equal(fs.existsSync(path.join(webData, "courses.json")), false, "题库清单也不该落成产物");
});

test("组卷走仓库题库：能按专题抽到题，答案留在服务端", () => {
  const course = banks.catalog[0];
  const quiz = banks.createQuiz(course.id, banks.ALL_TOPICS, 5, banks.TYPES);

  assert.ok(quiz, "应能组卷");
  assert.equal(quiz.items.length, 5);
  quiz.items.forEach(item => {
    assert.ok(item.question, "题干不能为空");
    assert.ok(item.correctAnswer, "服务端会话要留着答案用于判题");
    assert.equal(Object.prototype.hasOwnProperty.call(banks.toClientQuestion(item), "correctAnswer"), false);
  });

  const topicQuiz = banks.createQuiz(course.id, course.topics[0].key, 3, ["single"]);
  assert.ok(topicQuiz && topicQuiz.items.length > 0, "按单个专题也应能抽到题");
  assert.equal(banks.createQuiz(course.id, "no-such-topic", 3, banks.TYPES), null, "不存在的专题应组卷失败");
});
