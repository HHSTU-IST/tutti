const el = id => document.getElementById(id);

const TYPE_LABELS = {
  all: "全部",
  single: "单选",
  judge: "判断",
  fill: "填空"
};

const VIEWS = ["login-view", "courses-view", "topics-view", "quiz-view", "summary-view"];

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });

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
  correct: 0,
  view: "login-view",
  // 请求进行中标记：挡住判题的重复提交。
  answering: false,
  // 上传规则被改过但还没保存，离开前要确认。
  rulesDirty: false
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
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }

  return data;
}

// 请求期间把按钮置灰并换文案，避免连点重复提交。
function setBusy(button, busyText) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  return () => {
    button.disabled = false;
    button.textContent = label;
  };
}

async function withBusy(button, busyText, task) {
  const restore = setBusy(button, busyText);
  try {
    return await task();
  } finally {
    restore();
  }
}

// 统一的异步反馈：错误常驻，成功几秒后自动收起。
function flash(target, text, kind = "error") {
  clearTimeout(target.hideTimer);
  target.className = kind === "ok" ? "ok-text" : "error";
  target.textContent = text;
  target.hidden = false;

  if (kind === "ok") {
    target.hideTimer = setTimeout(() => {
      target.hidden = true;
    }, 4000);
  }
}

// 视图、课程、专题、题量、题型都写进查询参数：可刷新、可深链、可后退。
function buildUrl(viewId) {
  const params = new URLSearchParams();
  if (viewId !== "login-view") {
    params.set("view", viewId.replace("-view", ""));
    if (state.course && (viewId === "topics-view" || viewId === "quiz-view")) {
      params.set("course", state.course.id);
      params.set("count", String(state.count));
      params.set("type", state.type);
      if (viewId === "quiz-view" && state.topicKey) params.set("topic", state.topicKey);
    }
  }

  const query = params.toString();
  return query ? `${location.pathname}?${query}` : location.pathname;
}

function show(viewId, options = {}) {
  state.view = viewId;
  VIEWS.forEach(id => {
    el(id).hidden = id !== viewId;
  });

  if (options.fromHistory) return;

  const url = buildUrl(viewId);
  if (options.replace) history.replaceState({ view: viewId }, "", url);
  else history.pushState({ view: viewId }, "", url);
}

// 题量/题型这类就地改动用 replaceState，不往历史里塞记录。
function syncUrl() {
  if (!state.user || state.view === "login-view") return;
  history.replaceState({ view: state.view }, "", buildUrl(state.view));
}

function quizInProgress() {
  return state.view === "quiz-view" && state.index < state.questions.length;
}

function confirmLeaveRules() {
  if (!state.rulesDirty) return true;
  return window.confirm("上传规则还没保存，确定离开吗？");
}

function confirmLeaveQuiz() {
  if (!quizInProgress()) return true;
  return window.confirm("本次练习还没做完，确定返回吗？");
}

// chip 只在首次构建，之后只改选中态：整组重建会把键盘焦点丢掉。
function syncChipGroup(container, entries, activeValue, onSelect) {
  if (container.children.length !== entries.length) {
    container.replaceChildren(
      ...entries.map(entry => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.dataset.value = entry.value;
        chip.textContent = entry.label;
        chip.addEventListener("click", () => onSelect(chip.dataset.value));
        return chip;
      })
    );
  }

  Array.from(container.children).forEach(chip => {
    const active = chip.dataset.value === activeValue;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
}

function renderChips() {
  syncChipGroup(
    el("count-chips"),
    [10, 20, 30].map(count => ({ value: String(count), label: `${count} 题` })),
    String(state.count),
    value => {
      state.count = Number(value);
      renderChips();
      syncUrl();
    }
  );

  syncChipGroup(
    el("type-chips"),
    Object.keys(TYPE_LABELS).map(key => ({ value: key, label: TYPE_LABELS[key] })),
    state.type,
    value => {
      state.type = value;
      renderChips();
      syncUrl();
    }
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
      card.type = "button";
      card.className = `course-card${course.unlocked ? "" : " locked"}`;

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
        // 用 aria-disabled 而不是 disabled：disabled 的按钮不会触发 click，
        // 「尚未开通」的提示就永远出不来。
        card.setAttribute("aria-disabled", "true");
        card.addEventListener("click", () => {
          flash(el("courses-msg"), `「${course.title}」尚未开通，请联系管理员。`);
        });
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
    state.rulesDirty = false;
  }

  applyUploadAccept();
  renderUploadHint();
}

// accept 跟着规则走：选文件时就能看出允许什么格式（服务端仍会再校验一次）。
function applyUploadAccept() {
  if (!state.rules || !state.rules.allowedExtensions) return;
  el("upload-input").accept = state.rules.allowedExtensions.join(",");
}

function renderUploadHint() {
  if (!state.rules) return;
  const rules = state.rules;
  const parts = [`允许格式：${rules.extensionsText}`, `大小上限 ${rules.maxSizeMb}\u00A0MB`];
  if (rules.filenameHint) parts.push(`命名要求：${rules.filenameHint}`);
  el("upload-rules").textContent = parts.join(" · ");
}

function formatSize(sizeBytes) {
  return sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / 1024 / 1024).toFixed(1)}\u00A0MB`
    : `${Math.max(1, Math.round(sizeBytes / 1024))}\u00A0KB`;
}

function renderUploads(uploads) {
  if (!uploads.length) {
    const empty = document.createElement("li");
    empty.className = "empty muted";
    empty.textContent = "还没有上传记录。";
    el("upload-list").replaceChildren(empty);
    return;
  }

  el("upload-list").replaceChildren(
    ...uploads.map(upload => {
      const item = document.createElement("li");

      const text = document.createElement("span");
      text.textContent = `${upload.originalName} · ${formatSize(upload.sizeBytes)} · ${dateTimeFormatter.format(new Date(upload.uploadedAt))}`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "link-btn";
      remove.textContent = "删除";
      remove.addEventListener("click", () => removeUpload(upload, remove));

      item.append(text, remove);
      return item;
    })
  );
}

// 删掉盘上的文件不可恢复，先问一句再发请求；撤回后列表按服务端返回重拉，不做本地假删除。
async function removeUpload(upload, button) {
  if (!window.confirm(`将删除《${upload.originalName}》，删除后无法恢复，需要重新上传。确定删除？`)) return;

  try {
    await withBusy(button, "删除中…", () =>
      api(`/api/uploads/${encodeURIComponent(upload.id)}`, { method: "DELETE" })
    );
    await loadUploads();
    flash(el("upload-msg"), "已删除。", "ok");
  } catch (error) {
    flash(el("upload-msg"), error.message);
  }
}

async function loadUploads() {
  try {
    const data = await api("/api/uploads");
    renderUploads(data.uploads.filter(upload => upload.courseId === state.course.id));
  } catch (error) {
    renderUploads([]);
    flash(el("upload-msg"), error.message);
  }
}

async function openCourses(options = {}) {
  try {
    const data = await api("/api/courses");
    renderCourses(data.courses);
    show("courses-view", options);
  } catch (error) {
    flash(el("courses-msg"), error.message);
  }
}

async function openCourse(courseId, options = {}) {
  let data;
  try {
    data = await api(`/api/courses/${courseId}/topics`);
  } catch (error) {
    // 深链指到未开通课程时退回题库列表，并说清为什么。
    flash(el("courses-msg"), error.message);
    await openCourses({ fromHistory: true });
    history.replaceState({ view: "courses-view" }, "", buildUrl("courses-view"));
    return false;
  }

  state.course = data;
  state.topics = data.topics;
  el("topics-title").textContent = `${data.title} · 选择专题`;
  renderChips();
  renderTopics();
  renderUploads([]);
  loadUploads();
  show("topics-view", options);
  return true;
}

function renderTopics() {
  el("topic-list").replaceChildren(
    ...state.topics.map(topic => {
      const total = topic.single + topic.judge + topic.fill;
      const card = document.createElement("button");
      card.type = "button";
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

async function startQuiz(topicKey, options = {}) {
  state.topicKey = topicKey;
  state.correct = 0;
  state.index = 0;
  state.answering = false;

  const types = state.type === "all" ? ["single", "judge", "fill"] : [state.type];

  try {
    const data = await withBusy(el("retry-btn"), "组卷中…", () =>
      api("/api/quiz", {
        method: "POST",
        body: { courseId: state.course.id, topicKey, count: state.count, types }
      })
    );
    state.questions = data.questions;
    renderQuestion();
    show("quiz-view", options);
    return true;
  } catch (error) {
    flash(el("topics-msg"), error.message);
    return false;
  }
}

function renderProgress() {
  const total = state.questions.length;
  const done = Math.min(state.index, total);
  el("progress-text").textContent = `${done} / ${total}`;
  // 用 transform 而不是 width：走合成器，不触发重排。
  el("progress-fill").style.transform = `scaleX(${total ? done / total : 0})`;
  el("progress-bar").setAttribute("aria-valuemax", String(total));
  el("progress-bar").setAttribute("aria-valuenow", String(done));
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
    input.classList.remove("correct", "wrong");
    input.removeAttribute("aria-invalid");
    input.focus();
    return;
  }

  fillBox.hidden = true;
  optionsBox.hidden = false;

  question.options.forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.textContent = `${option.value}. ${option.text}`;
    button.addEventListener("click", () => submitAnswer(option.value, button));
    optionsBox.append(button);
  });
}

async function submitAnswer(value, button) {
  if (questionLocked() || state.answering) return;
  state.answering = true;

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
    // 判题失败就放开选项让学员重试，别卡在「已作答」状态。
    if (question.type !== "fill") {
      Array.from(el("q-options").children).forEach(child => {
        child.disabled = false;
      });
    } else {
      el("fill-input").disabled = false;
    }
    showResultError(`判题失败：${error.message}`);
  } finally {
    state.answering = false;
  }
}

function showResultError(message) {
  const box = el("q-result");
  box.hidden = false;
  box.className = "result bad";
  const text = document.createElement("p");
  text.textContent = message;
  box.replaceChildren(text);
}

function questionLocked() {
  return !el("next-btn").hidden;
}

// 对错不能只靠颜色：给按钮补一句读屏能听到的说明。
function markOption(button, kind) {
  button.classList.add(kind);
  button.setAttribute("aria-label", `${button.textContent}（${kind === "correct" ? "正确答案" : "你的选择，错误"}）`);
}

function showResult(result, question, button) {
  if (question.type === "fill") {
    const input = el("fill-input");
    input.classList.remove("correct", "wrong");
    input.classList.add(result.correct ? "correct" : "wrong");
    input.setAttribute("aria-invalid", String(!result.correct));
  } else {
    if (button) markOption(button, result.correct ? "correct" : "wrong");
    if (!result.correct && result.correctValue) {
      Array.from(el("q-options").children).forEach(child => {
        if (child.textContent.startsWith(`${result.correctValue}.`)) markOption(child, "correct");
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
  el("progress-fill").style.transform = "scaleX(1)";
  el("progress-text").textContent = `${total} / ${total}`;
  el("progress-bar").setAttribute("aria-valuenow", String(total));
  el("summary-text").textContent = `答对 ${state.correct} / ${total} 题，正确率 ${rate}%`;
  show("summary-view");
}

async function loadMe() {
  try {
    const me = await api("/api/me");
    state.user = me;
    await enterApp();
  } catch {
    show("login-view", { replace: true });
  }
}

async function enterApp() {
  el("user-tag").hidden = false;
  el("user-tag").textContent = state.user.isAdmin
    ? `${state.user.username} · 管理员`
    : `${state.user.username} · 已开通 ${state.user.unlocked.length} 个题库`;
  el("user-tag").classList.toggle("tag-admin", Boolean(state.user.isAdmin));
  el("logout-btn").hidden = false;

  await loadUploadRules();
  await restoreFromUrl();
}

// 首屏与浏览器前进/后退都走这里：按 URL 还原视图，刷新不再掉回登录页。
async function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  const view = params.get("view") || "courses";
  const count = Number(params.get("count"));
  const type = params.get("type");

  if (Number.isInteger(count) && count > 0) state.count = count;
  if (type && TYPE_LABELS[type]) state.type = type;

  const courseId = params.get("course");
  const topicKey = params.get("topic");

  if (!courseId) {
    await openCourses({ fromHistory: true });
    return;
  }

  const opened = await openCourse(courseId, { fromHistory: true });
  if (!opened) return;

  if (view === "quiz" && topicKey) await startQuiz(topicKey, { fromHistory: true });
  else show("topics-view", { fromHistory: true });
}

el("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const error = el("login-error");
  error.hidden = true;

  try {
    await withBusy(el("login-btn"), "登录中…", () =>
      api("/api/login", {
        method: "POST",
        body: { username: el("username").value, password: el("password").value }
      })
    );
    await loadMe();
  } catch (loginError) {
    error.textContent = loginError.message;
    error.hidden = false;
    error.focus();
  }
});

el("logout-btn").addEventListener("click", async () => {
  if (!confirmLeaveQuiz()) return;

  try {
    await api("/api/logout", { method: "POST" });
  } catch {
    // 会话本来就已经失效也照样回登录页。
  }

  state.user = null;
  state.questions = [];
  el("user-tag").hidden = true;
  el("logout-btn").hidden = true;
  el("password").value = "";
  show("login-view", { replace: true });
});

el("back-to-courses").addEventListener("click", () => {
  if (!confirmLeaveRules()) return;
  openCourses();
});

el("rules-form").addEventListener("submit", async event => {
  event.preventDefault();
  const message = el("rules-msg");
  message.hidden = true;

  try {
    const data = await withBusy(el("rules-btn"), "保存中…", () =>
      api("/api/settings/upload", {
        method: "PUT",
        body: {
          allowedExtensions: el("rule-ext").value.split(",").map(item => item.trim()).filter(Boolean),
          filenamePattern: el("rule-pattern").value,
          filenameHint: el("rule-hint").value,
          maxSizeMb: Number(el("rule-size").value)
        }
      })
    );
    state.rules = data.rules;
    state.rulesDirty = false;
    applyUploadAccept();
    renderUploadHint();
    flash(message, "规则已保存，对所有学员立即生效。", "ok");
  } catch (error) {
    flash(message, error.message);
  }
});

// 规则表单一改就标记「未保存」，切视图或关页面前会拦一下。
["rule-ext", "rule-pattern", "rule-hint", "rule-size"].forEach(id => {
  el(id).addEventListener("input", () => {
    state.rulesDirty = true;
  });
});

el("upload-btn").addEventListener("click", async () => {
  const input = el("upload-input");
  const message = el("upload-msg");
  const file = input.files && input.files[0];

  if (!file) {
    flash(message, "请先选择文件");
    return;
  }

  try {
    const base64 = await withBusy(el("upload-btn"), "读取中…", () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",").pop());
        reader.onerror = () => reject(new Error("读取文件失败"));
        reader.readAsDataURL(file);
      })
    );

    await withBusy(el("upload-btn"), "上传中…", () =>
      api("/api/upload", {
        method: "POST",
        body: { courseId: state.course.id, fileName: file.name, contentBase64: base64 }
      })
    );

    input.value = "";
    await loadUploads();
    flash(message, "上传成功。", "ok");
  } catch (error) {
    flash(message, error.message);
  }
});

el("back-to-topics").addEventListener("click", () => {
  if (!confirmLeaveQuiz()) return;
  show("topics-view");
});

el("next-btn").addEventListener("click", nextQuestion);
el("retry-btn").addEventListener("click", () => startQuiz(state.topicKey, { replace: true }));
el("finish-btn").addEventListener("click", () => show("topics-view"));

el("fill-submit").addEventListener("click", () => submitAnswer(el("fill-input").value, null));
el("fill-input").addEventListener("keydown", event => {
  if (event.key === "Enter") submitAnswer(el("fill-input").value, null);
});

window.addEventListener("popstate", async () => {
  if (!state.user) return;

  // 后退会离开未保存的规则或没做完的练习：先问一句，拒绝就把历史推回去。
  if (state.rulesDirty && state.view === "courses-view" && !confirmLeaveRules()) {
    history.pushState({ view: state.view }, "", buildUrl(state.view));
    return;
  }

  if (quizInProgress() && !confirmLeaveQuiz()) {
    history.pushState({ view: state.view }, "", buildUrl(state.view));
    return;
  }

  await restoreFromUrl();
});

// 练习做一半或规则没保存时关页面，交给浏览器弹确认。
window.addEventListener("beforeunload", event => {
  if (!state.rulesDirty && !quizInProgress()) return;
  event.preventDefault();
  event.returnValue = "";
});

loadMe();
