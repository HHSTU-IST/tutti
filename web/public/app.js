const el = id => document.getElementById(id);

const TYPE_LABELS = {
  all: "全部",
  single: "单选",
  judge: "判断",
  fill: "填空"
};

const state = {
  user: null,
  rules: null,
  course: null,
  topics: [],
  topicKey: null,
  count: 10,
  type: "all",
  questions: [],
  index: 0,
  correct: 0
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }

  return data;
}

function show(viewId) {
  ["login-view", "courses-view", "topics-view", "quiz-view", "summary-view"].forEach(id => {
    el(id).hidden = id !== viewId;
  });
}

function renderChips() {
  el("count-chips").replaceChildren(
    ...[10, 20, 30].map(count => {
      const chip = document.createElement("button");
      chip.className = `chip${state.count === count ? " active" : ""}`;
      chip.textContent = `${count} 题`;
      chip.addEventListener("click", () => {
        state.count = count;
        renderChips();
      });
      return chip;
    })
  );

  el("type-chips").replaceChildren(
    ...Object.keys(TYPE_LABELS).map(key => {
      const chip = document.createElement("button");
      chip.className = `chip${state.type === key ? " active" : ""}`;
      chip.textContent = TYPE_LABELS[key];
      chip.addEventListener("click", () => {
        state.type = key;
        renderChips();
      });
      return chip;
    })
  );
}

function renderCourses(courses) {
  const hint = state.user.isAdmin
    ? "管理员账号：全部题库已解锁。"
    : `已开通 ${courses.filter(course => course.unlocked).length} / ${courses.length} 个题库，未开通的题库不可进入。`;
  el("courses-hint").textContent = hint;

  el("course-grid").replaceChildren(
    ...courses.map(course => {
      const card = document.createElement("button");
      card.className = `course-card${course.unlocked ? "" : " locked"}`;
      card.disabled = !course.unlocked;

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = course.title;

      const meta = document.createElement("div");
      meta.className = "card-meta";
      meta.textContent = `${course.topicCount} 个专题 · ${course.questionTotal} 道题`;

      card.append(title, meta);

      const badge = document.createElement("div");
      badge.className = `tag ${course.unlocked ? "tag-soft" : "tag-locked"}`;
      badge.style.marginTop = "10px";
      badge.textContent = course.unlocked ? "进入练习" : "未开通";
      card.append(badge);

      if (course.unlocked) {
        card.addEventListener("click", () => openCourse(course.id));
      } else {
        card.addEventListener("click", () => alert("该课程尚未开通，请联系管理员。"));
      }

      return card;
    })
  );
}

async function loadUploadRules() {
  const data = await api("/api/settings/upload");
  state.rules = data.rules;

  el("rules-panel").hidden = !data.canEdit;
  if (data.canEdit) {
    el("rule-ext").value = data.rules.allowedExtensions.join(",");
    el("rule-pattern").value = data.rules.filenamePattern;
    el("rule-hint").value = data.rules.filenameHint;
    el("rule-size").value = String(data.rules.maxSizeMb);
  }

  renderUploadHint();
}

function renderUploadHint() {
  if (!state.rules) return;
  const rules = state.rules;
  const parts = [`允许格式：${rules.extensionsText}`, `大小上限 ${rules.maxSizeMb} MB`];
  if (rules.filenameHint) parts.push(`命名要求：${rules.filenameHint}`);
  el("upload-rules").textContent = parts.join(" · ");
}

function renderUploads(uploads) {
  el("upload-list").replaceChildren(
    ...uploads.map(upload => {
      const item = document.createElement("li");
      const size = upload.sizeBytes >= 1024 * 1024
        ? `${(upload.sizeBytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(upload.sizeBytes / 1024))} KB`;
      item.textContent = `${upload.originalName} · ${size} · ${new Date(upload.uploadedAt).toLocaleString()}`;
      return item;
    })
  );
}

async function loadUploads() {
  const data = await api("/api/uploads");
  renderUploads(data.uploads.filter(upload => upload.courseId === state.course.id));
}

async function openCourse(courseId) {
  const data = await api(`/api/courses/${courseId}/topics`);
  state.course = data;
  state.topics = data.topics;
  el("topics-title").textContent = `${data.title} · 选择专题`;
  renderChips();
  renderTopics();
  renderUploads([]);
  loadUploads();
  show("topics-view");
}

function renderTopics() {
  el("topic-list").replaceChildren(
    ...state.topics.map(topic => {
      const total = topic.single + topic.judge + topic.fill;
      const card = document.createElement("button");
      card.className = "topic-card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = topic.name;

      const meta = document.createElement("div");
      meta.className = "card-meta";
      meta.textContent = `单选 ${topic.single} · 判断 ${topic.judge} · 填空 ${topic.fill} · 共 ${total} 题`;

      card.append(title, meta);
      card.addEventListener("click", () => startQuiz(topic.key));
      return card;
    })
  );
}

async function startQuiz(topicKey) {
  state.topicKey = topicKey;
  state.correct = 0;
  state.index = 0;

  const types = state.type === "all" ? ["single", "judge", "fill"] : [state.type];

  try {
    const data = await api("/api/quiz", {
      method: "POST",
      body: { courseId: state.course.id, topicKey, count: state.count, types }
    });
    state.questions = data.questions;
    renderQuestion();
    show("quiz-view");
  } catch (error) {
    alert(error.message);
  }
}

function renderProgress() {
  const done = state.index;
  const total = state.questions.length;
  el("progress-text").textContent = `${done} / ${total}`;
  el("progress-fill").style.width = `${total ? (done / total) * 100 : 0}%`;
}

function renderQuestion() {
  const question = state.questions[state.index];
  if (!question) return;

  renderProgress();
  el("q-type").textContent = question.typeName;
  el("q-topic").textContent = question.topicName;
  el("q-text").textContent = question.question;
  el("q-result").hidden = true;
  el("next-btn").hidden = true;

  const optionsBox = el("q-options");
  const fillBox = el("q-fill");
  optionsBox.replaceChildren();

  if (question.type === "fill") {
    fillBox.hidden = false;
    optionsBox.hidden = true;
    const input = el("fill-input");
    input.value = "";
    input.disabled = false;
    input.focus();
    return;
  }

  fillBox.hidden = true;
  optionsBox.hidden = false;

  question.options.forEach(option => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = `${option.value}. ${option.text}`;
    button.addEventListener("click", () => submitAnswer(option.value, button));
    optionsBox.append(button);
  });
}

async function submitAnswer(value, button) {
  if (questionLocked()) return;

  const question = state.questions[state.index];
  if (question.type !== "fill") {
    Array.from(el("q-options").children).forEach(child => {
      child.disabled = true;
    });
  } else {
    el("fill-input").disabled = true;
  }

  try {
    const result = await api("/api/quiz/check", {
      method: "POST",
      body: { index: state.index, value }
    });

    if (result.correct) state.correct += 1;
    showResult(result, question, button);
  } catch (error) {
    alert(error.message);
  }
}

function questionLocked() {
  return !el("next-btn").hidden;
}

function showResult(result, question, button) {
  if (question.type === "fill") {
    const input = el("fill-input");
    input.classList.remove("correct", "wrong");
    input.classList.add(result.correct ? "correct" : "wrong");
  } else if (button) {
    button.classList.add(result.correct ? "correct" : "wrong");
    if (!result.correct && result.correctValue) {
      Array.from(el("q-options").children).forEach(child => {
        if (child.textContent.startsWith(`${result.correctValue}.`)) child.classList.add("correct");
      });
    }
  }

  const box = el("q-result");
  box.hidden = false;
  box.className = `result ${result.correct ? "ok" : "bad"}`;
  box.replaceChildren();

  const headline = document.createElement("p");
  headline.textContent = result.correct ? "回答正确" : `回答错误，正确答案：${result.correctText}`;
  box.append(headline);

  const explain = document.createElement("p");
  explain.className = "explain";
  explain.textContent = `解析：${result.explain}`;
  box.append(explain);

  const next = el("next-btn");
  next.hidden = false;
  next.textContent = state.index + 1 >= state.questions.length ? "查看成绩" : "下一题";
}

function nextQuestion() {
  state.index += 1;
  if (state.index >= state.questions.length) {
    showSummary();
    return;
  }
  renderQuestion();
}

function showSummary() {
  const total = state.questions.length;
  const rate = total ? Math.round((state.correct / total) * 100) : 0;
  el("progress-fill").style.width = "100%";
  el("progress-text").textContent = `${total} / ${total}`;
  el("summary-text").textContent = `答对 ${state.correct} / ${total} 题，正确率 ${rate}%`;
  el("summary-view").classList.add("summary-card");
  show("summary-view");
}

async function loadMe() {
  try {
    const me = await api("/api/me");
    state.user = me;
    enterApp();
  } catch (error) {
    show("login-view");
  }
}

async function enterApp() {
  el("user-tag").hidden = false;
  el("user-tag").textContent = state.user.isAdmin
    ? `${state.user.username} · 管理员`
    : `${state.user.username} · 已开通 ${state.user.unlocked.length} 个题库`;
  el("user-tag").classList.toggle("tag-admin", Boolean(state.user.isAdmin));
  el("logout-btn").hidden = false;

  const data = await api("/api/courses");
  renderCourses(data.courses);
  await loadUploadRules();
  show("courses-view");
}

el("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const error = el("login-error");
  error.hidden = true;

  try {
    await api("/api/login", {
      method: "POST",
      body: { username: el("username").value, password: el("password").value }
    });
    await loadMe();
  } catch (loginError) {
    error.textContent = loginError.message;
    error.hidden = false;
  }
});

el("logout-btn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  el("user-tag").hidden = true;
  el("logout-btn").hidden = true;
  el("password").value = "";
  show("login-view");
});

el("back-to-courses").addEventListener("click", async () => {
  const data = await api("/api/courses");
  renderCourses(data.courses);
  show("courses-view");
});

el("rules-form").addEventListener("submit", async event => {
  event.preventDefault();
  const message = el("rules-msg");

  try {
    const data = await api("/api/settings/upload", {
      method: "PUT",
      body: {
        allowedExtensions: el("rule-ext").value.split(",").map(item => item.trim()).filter(Boolean),
        filenamePattern: el("rule-pattern").value,
        filenameHint: el("rule-hint").value,
        maxSizeMb: Number(el("rule-size").value)
      }
    });
    state.rules = data.rules;
    renderUploadHint();
    message.className = "ok-text";
    message.textContent = "规则已保存，对所有学员立即生效。";
  } catch (error) {
    message.className = "error";
    message.textContent = error.message;
  }
  message.hidden = false;
});

el("upload-btn").addEventListener("click", async () => {
  const input = el("upload-input");
  const message = el("upload-msg");
  const file = input.files && input.files[0];

  if (!file) {
    message.className = "error";
    message.textContent = "请先选择文件";
    message.hidden = false;
    return;
  }

  let base64 = "";
  try {
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",").pop());
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsDataURL(file);
    });
  } catch (error) {
    message.className = "error";
    message.textContent = error.message;
    message.hidden = false;
    return;
  }

  try {
    await api("/api/upload", {
      method: "POST",
      body: { courseId: state.course.id, fileName: file.name, contentBase64: base64 }
    });
    message.className = "ok-text";
    message.textContent = "上传成功";
    input.value = "";
    await loadUploads();
  } catch (error) {
    message.className = "error";
    message.textContent = error.message;
  }
  message.hidden = false;
});

el("back-to-topics").addEventListener("click", () => show("topics-view"));
el("next-btn").addEventListener("click", nextQuestion);
el("retry-btn").addEventListener("click", () => startQuiz(state.topicKey));
el("finish-btn").addEventListener("click", () => show("topics-view"));

el("fill-submit").addEventListener("click", () => submitAnswer(el("fill-input").value, null));
el("fill-input").addEventListener("keydown", event => {
  if (event.key === "Enter") submitAnswer(el("fill-input").value, null);
});

loadMe();
