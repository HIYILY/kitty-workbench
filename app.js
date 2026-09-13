/* Kitty 工作台 · 核心逻辑 */
"use strict";

/* ---------------- 工具 ---------------- */
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const WEEK_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const minuteOfDay = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmtDate = (d) => (d ? `${d.getMonth() + 1}月${d.getDate()}日` : "");

const store = {
  get(k, dflt) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

function toast(msg, ms = 2400) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch (e) {}
  } else {
    toast(`${title}：${body}`, 5000);
  }
}

/* ---------------- 中文日期识别 ---------------- */
function parseDateTime(text) {
  let s = (text || "").trim();
  let date = null, time = null;
  let m = s.match(/(\d{1,2})[:：](\d{1,2})/);
  if (m) { time = pad(+m[1]) + ":" + pad(+m[2]); s = s.replace(m[0], " "); }
  else {
    m = s.match(/(凌晨|早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*[点點]\s*(半|一刻|(\d{1,2})\s*分)?/);
    if (m) {
      let h = +m[2]; const tag = m[1] || ""; let min = 0;
      if (m[3] === "半") min = 30; else if (m[3] === "一刻") min = 15; else if (m[4]) min = +m[4];
      if ((tag.includes("下午") || tag.includes("晚上") || tag.includes("中午")) && h < 12) h += 12;
      time = pad(h % 24) + ":" + pad(min);
      s = s.replace(m[0], " ");
    }
  }
  const today = startOfDay(new Date());
  const rel = { "大后天": 3, "后天": 2, "明天": 1, "今天": 0 };
  for (const [w, off] of Object.entries(rel)) {
    if (s.includes(w)) { date = addDays(today, off); s = s.replace(w, " "); break; }
  }
  if (!date) {
    m = s.match(/(下+|这|本)?\s*(?:星期|礼拜|周)\s*([一二三四五六日天])/);
    if (m) {
      const target = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }[m[2]];
      const cur = today.getDay();
      let diff = (target - cur + 7) % 7;
      if (m[1] && m[1].startsWith("下")) diff += 7 * m[1].length;
      date = addDays(today, diff);
      s = s.replace(m[0], " ");
    }
  }
  if (!date) {
    m = s.match(/(\d{4})\s*[年\-\.\/]\s*(\d{1,2})\s*[月\-\.\/]\s*(\d{1,2})\s*[日号]?/)
     || s.match(/(\d{1,2})\s*[月\-\.\/]\s*(\d{1,2})\s*[日号]?/);
    if (m) {
      let y, mo, da;
      if (m.length >= 4 && m[1].length === 4) { y = +m[1]; mo = +m[2]; da = +m[3]; }
      else { y = today.getFullYear(); mo = +m[1]; da = +m[2]; }
      date = new Date(y, mo - 1, da);
      if (date < today) date = new Date(y + 1, mo - 1, da);
      s = s.replace(m[0], " ");
    }
  }
  if (!date) {
    m = s.match(/(\d+)\s*天\s*[后後]/);
    if (m) { date = addDays(today, +m[1]); s = s.replace(m[0], " "); }
  }
  const title = s.replace(/\s+/g, " ").replace(/^[\s,，、。.]+|[\s,，、。.]+$/g, "").trim();
  return { date, time, title };
}
function buildDue(date, time) {
  if (!date && !time) return null;
  const d = date ? new Date(date) : new Date();
  if (time) { const [h, mi] = time.split(":").map(Number); d.setHours(h, mi, 0, 0); }
  else if (d.getHours() === 0) d.setHours(18, 0, 0, 0);
  return d;
}

/* ---------------- 待办 ---------------- */
let todos = store.get("kt_todos", []);
let filter = "all";
const notifiedTodo = new Set();
const saveTodos = () => store.set("kt_todos", todos);

function addTodo(text) {
  const t = (text || "").trim();
  if (!t) return;
  const { date, time, title } = parseDateTime(t);
  if (!title) { toast("没听清内容，请再说一遍"); return; }
  const due = buildDue(date, time);
  todos.unshift({ id: Date.now(), text: title, due: due ? due.toISOString() : null, done: false });
  saveTodos(); renderTodos();
  toast(due ? `已添加：${title}（${fmtDate(due)} ${pad(due.getHours())}:${pad(due.getMinutes())}）` : `已添加：${title}`, 2600);
  $("#todoText").value = "";
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtDue(d) { let s = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK_CN[d.getDay()]}`; if (d.getHours() || d.getMinutes()) s += ` ${pad(d.getHours())}:${pad(d.getMinutes())}`; return s; }

function renderTodos() {
  const list = $("#todoList");
  const now = Date.now();
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const sod = startOfDay(new Date()).getTime();
  let items = todos.slice();
  if (filter === "pending") items = items.filter((t) => !t.done);
  if (filter === "done") items = items.filter((t) => t.done);
  items.sort((a, b) => (a.done !== b.done) ? (a.done ? 1 : -1) : ((a.due ? +new Date(a.due) : Infinity) - (b.due ? +new Date(b.due) : Infinity)));
  list.innerHTML = "";
  if (!items.length) { list.innerHTML = `<li class="empty">暂无待办，点 🎤 说一句试试～</li>`; return; }
  for (const t of items) {
    const due = t.due ? new Date(t.due) : null;
    const overdue = due && !t.done && due.getTime() < now;
    const dueToday = due && !t.done && due.getTime() <= endToday.getTime() && due.getTime() >= sod;
    const li = document.createElement("li");
    li.className = "todo-item" + (t.done ? " done" : "") + (overdue ? " overdue" : "") + (dueToday ? " due-today" : "");
    li.innerHTML = `<button class="todo-check" data-id="${t.id}">✓</button>
      <div class="todo-body"><div class="todo-text">${escapeHtml(t.text)}</div><div class="todo-due">${due ? fmtDue(due) : "无日期"}</div></div>
      <button class="todo-del" data-id="${t.id}">✕</button>`;
    list.appendChild(li);
  }
}

/* ---------------- 语音 ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false;
if (SR) {
  rec = new SR(); rec.lang = "zh-CN"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onresult = (e) => { const text = e.results[0][0].transcript; stopListening(); addTodo(text); };
  rec.onerror = (e) => { stopListening(); if (e.error === "not-allowed") toast("请允许使用麦克风"); else if (e.error !== "aborted") toast("语音识别出错：" + e.error); };
  rec.onend = () => stopListening();
}
function startListening() {
  if (!rec) { toast("当前浏览器不支持语音，请用 Chrome/Safari"); return; }
  if (listening) return;
  listening = true;
  $("#voiceBtn").classList.add("listening");
  $("#voiceStatus").textContent = "正在聆听，请说话…";
  $("#voiceStatus").classList.remove("hidden");
  try { rec.start(); } catch (e) {}
}
function stopListening() {
  listening = false;
  $("#voiceBtn").classList.remove("listening");
  $("#voiceStatus").classList.add("hidden");
  try { rec.stop(); } catch (e) {}
}

/* ---------------- Kitty 打招呼 ---------------- */
const GREETINGS = [
  "你好呀～", "今天也要加油哦！", "记得多喝水💧", "别忘了运动🏃", "嗨，我在这儿～",
  "要开心哦！", "作业写完了吗？", "点点我，陪你学习～", "冲鸭！", "摸摸头～", "加油，你可以的！"
];
function kittyGreet() {
  const w = $("#kitty");
  w.classList.remove("bounce"); void w.offsetWidth; w.classList.add("bounce");
  const b = $("#kittyBubble");
  b.textContent = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  b.classList.remove("hidden");
  clearTimeout(kittyGreet._t);
  kittyGreet._t = setTimeout(() => b.classList.add("hidden"), 2000);
}

/* ---------------- 饮水计划 ---------------- */
const WATER_GOAL = 8;
let water = store.get("kt_water", { date: "", cups: 0 });
function waterToday() {
  if (water.date !== todayStr()) { water = { date: todayStr(), cups: 0 }; store.set("kt_water", water); }
  return water;
}
function renderWater() {
  const w = waterToday();
  const track = $("#waterTrack");
  track.innerHTML = "";
  for (let i = 0; i < WATER_GOAL; i++) {
    const c = document.createElement("div");
    c.className = "cup" + (i < w.cups ? " filled" : "");
    track.appendChild(c);
  }
  $("#waterText").textContent = `${w.cups} / ${WATER_GOAL} 杯`;
  $("#waterMl").textContent = `${w.cups * 250} ml`;
}
function changeWater(d) {
  const w = waterToday();
  w.cups = Math.max(0, Math.min(WATER_GOAL, w.cups + d));
  store.set("kt_water", w);
  renderWater();
  if (d > 0 && w.cups === WATER_GOAL) toast("喝够水啦，真棒！💧");
}

/* ---------------- 运动计划 ---------------- */
const MET = { "走路": 3.0, "快走": 4.3, "慢跑": 7.0, "跑步": 9.8, "骑车": 6.8, "游泳": 8.0, "跳绳": 12.3, "瑜伽": 2.5, "健身操": 7.3, "篮球": 6.5, "羽毛球": 5.5, "乒乓球": 4.0, "爬山": 6.0, "舞蹈": 5.0 };
let exercise = store.get("kt_exercise", { date: "", weight: 55, logs: [] });
function exToday() {
  if (exercise.date !== todayStr()) {
    exercise = { date: todayStr(), weight: exercise.weight || 55, logs: [] };
    store.set("kt_exercise", exercise);
  }
  return exercise;
}
function exKcal(type, minutes, weight) { return Math.round((MET[type] || 5) * weight * (minutes / 60)); }
function renderExercise() {
  const ex = exToday();
  $("#exWeight").value = ex.weight;
  const total = ex.logs.reduce((s, l) => s + l.kcal, 0);
  $("#exTotal").textContent = total;
  const ul = $("#exList");
  ul.innerHTML = "";
  for (const l of ex.logs.slice().reverse()) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(l.type)} ${l.minutes}分钟</span><b>${l.kcal} 千卡</b>`;
    ul.appendChild(li);
  }
  updateExPreview();
}
function updateExPreview() {
  const type = $("#exType").value;
  const minutes = +$("#exMin").value || 0;
  const weight = +$("#exWeight").value || 55;
  $("#exKcal").textContent = `≈ ${exKcal(type, minutes, weight)} 千卡`;
}
function addExercise() {
  const type = $("#exType").value;
  const minutes = +$("#exMin").value || 0;
  if (minutes <= 0) { toast("请填写运动分钟数"); return; }
  const ex = exToday();
  ex.weight = +$("#exWeight").value || 55;
  ex.logs.push({ type, minutes, kcal: exKcal(type, minutes, ex.weight) });
  store.set("kt_exercise", ex);
  $("#exMin").value = "";
  renderExercise();
  toast(`已记录：${type} ${minutes}分钟`);
}

/* ---------------- 课程表 ---------------- */
const DEFAULT_PERIODS = [
  { start: "08:00", end: "08:40" }, { start: "08:55", end: "09:35" },
  { start: "09:50", end: "10:30" }, { start: "10:45", end: "11:25" },
  { start: "14:00", end: "14:40" }, { start: "14:55", end: "15:35" },
  { start: "15:50", end: "16:30" }, { start: "16:45", end: "17:25" },
  { start: "19:00", end: "19:40" }, { start: "19:55", end: "20:35" }
];
let periods = store.get("kt_periods", DEFAULT_PERIODS);
let courses = store.get("kt_courses", []);
let editCell = null;
const savePeriods = () => store.set("kt_periods", periods);
const saveCourses = () => store.set("kt_courses", courses);

function renderPeriodEditor() {
  const box = $("#periodEditor");
  box.innerHTML = "";
  periods.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "period-row";
    row.innerHTML = `<span class="idx">第${i + 1}节</span>
      <input type="time" value="${p.start}" data-i="${i}" data-k="start">
      <span>-</span>
      <input type="time" value="${p.end}" data-i="${i}" data-k="end">
      <button class="del" data-i="${i}" title="删除">✕</button>`;
    box.appendChild(row);
  });
  box.querySelectorAll("input[type=time]").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const i = +e.target.dataset.i, k = e.target.dataset.k;
      periods[i][k] = e.target.value;
      savePeriods(); renderSchedule();
    });
  });
  box.querySelectorAll("button.del").forEach((b) => {
    b.addEventListener("click", () => {
      if (periods.length <= 1) { toast("至少保留一节"); return; }
      periods.splice(+b.dataset.i, 1);
      savePeriods(); renderPeriodEditor(); renderSchedule();
    });
  });
}

function renderSchedule() {
  const wrap = $("#scheduleWrap");
  const todayCol = (new Date().getDay() + 6) % 7;
  let html = `<table class="schedule"><thead><tr><th class="period-col">节次</th>`;
  DAYS.forEach((d, i) => { html += `<th class="${i === todayCol ? "today-col" : ""}">${d}</th>`; });
  html += `</tr></thead><tbody>`;
  periods.forEach((p, pi) => {
    html += `<tr><th class="period-col">第${pi + 1}节<br>${p.start}-${p.end}</th>`;
    for (let d = 0; d < 7; d++) {
      const c = courses.find((x) => x.day === d && x.period === pi);
      html += `<td class="cell${d === todayCol ? " today-col" : ""}" data-day="${d}" data-period="${pi}">`;
      if (c) html += `<div class="course-name">${escapeHtml(c.name)}</div>` + (c.loc ? `<div class="course-loc">${escapeHtml(c.loc)}</div>` : "");
      html += `</td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html;
  wrap.querySelectorAll("td.cell").forEach((td) => td.addEventListener("click", () => openCourseModal(+td.dataset.day, +td.dataset.period)));
}

function openCourseModal(day, period) {
  editCell = { day, period };
  const c = courses.find((x) => x.day === day && x.period === period);
  $("#courseModalTitle").textContent = `${DAYS[day]} 第${period + 1}节`;
  $("#courseName").value = c ? c.name : "";
  $("#courseLoc").value = c ? (c.loc || "") : "";
  $("#courseModal").classList.remove("hidden");
}
const closeCourseModal = () => $("#courseModal").classList.add("hidden");
function saveCourse() {
  if (!editCell) return;
  const name = $("#courseName").value.trim(), loc = $("#courseLoc").value.trim();
  courses = courses.filter((x) => !(x.day === editCell.day && x.period === editCell.period));
  if (name) courses.push({ day: editCell.day, period: editCell.period, name, loc });
  saveCourses(); renderSchedule(); closeCourseModal();
}
function clearCourse() {
  if (!editCell) return;
  courses = courses.filter((x) => !(x.day === editCell.day && x.period === editCell.period));
  saveCourses(); renderSchedule(); closeCourseModal();
}

/* ---------------- 节假日 / 调休 ---------------- */
// 放假区间（以国务院公布为准，可自行修改）
const HOLIDAYS = [
  { name: "元旦", start: "2026-01-01", end: "2026-01-03" },
  { name: "春节", start: "2026-02-15", end: "2026-02-21" },
  { name: "清明节", start: "2026-04-04", end: "2026-04-06" },
  { name: "劳动节", start: "2026-05-01", end: "2026-05-05" },
  { name: "端午节", start: "2026-06-19", end: "2026-06-21" },
  { name: "中秋节", start: "2026-09-25", end: "2026-09-27" },
  { name: "国庆节", start: "2026-10-01", end: "2026-10-07" },
  { name: "元旦", start: "2027-01-01", end: "2027-01-03" }
];
// 调休上班/上课日（周末补班，可自行修改）
const MAKEUP = ["2026-02-14", "2026-02-28", "2026-04-26", "2026-05-09", "2026-09-27", "2026-10-10"];

const dayNum = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
function isHoliday(d) {
  const t = startOfDay(d).getTime();
  return HOLIDAYS.some((h) => t >= dayNum(h.start).getTime() && t <= dayNum(h.end).getTime());
}
function isMakeup(d) { return MAKEUP.includes(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`); }

function renderCountdowns() {
  const now = new Date();
  const today = startOfDay(now);
  const day = today.getDay();
  const hol = isHoliday(today), mk = isMakeup(today);
  let kind = "工作日";
  if (hol) kind = "法定节假日";
  else if (mk) kind = "调休上班";
  else if (day === 6 || day === 0) kind = "周末";
  $("#todayInfo").textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${WEEK_CN[day]} · ${kind}`;

  // 周末
  const we = $("#weekendInfo");
  if (day === 6 || day === 0) we.innerHTML = `今天就是<b>周末</b> 🎉`;
  else { const diff = 6 - day; we.innerHTML = `距离<b>${diff}</b> 天后到周末（${fmtDate(addDays(today, diff))} 周六）`; }

  // 放假倒计时
  const upcoming = HOLIDAYS.map((h) => ({ h, d: dayNum(h.start) }))
    .filter((x) => dayNum(x.h.end) >= today)
    .sort((a, b) => a.d - b.d);
  const ul = $("#holidayList");
  ul.innerHTML = "";
  for (const { h, d } of upcoming.slice(0, 6)) {
    const diff = Math.round((d - today) / 86400000);
    const li = document.createElement("li");
    li.innerHTML = `<span class="name">${h.name}</span><span class="date">${d.getFullYear()}年${fmtDate(d)}起</span><span class="days">${diff <= 0 ? "假期中" : diff + " 天"}</span>`;
    ul.appendChild(li);
  }

  // 调休提醒
  const mUl = $("#makeupList");
  mUl.innerHTML = "";
  const upcomingMakeup = MAKEUP.map(dayNum).filter((d) => d >= today).sort((a, b) => a - b).slice(0, 4);
  if (!upcomingMakeup.length) {
    mUl.innerHTML = `<li><span class="name" style="color:var(--muted)">近期无调休</span></li>`;
  } else {
    for (const d of upcomingMakeup) {
      const diff = Math.round((d - today) / 86400000);
      const li = document.createElement("li");
      li.innerHTML = `<span class="name">${fmtDate(d)} ${WEEK_CN[d.getDay()]}</span><span class="makeup">调休上班</span><span class="days">${diff === 0 ? "今天" : diff + " 天"}</span>`;
      mUl.appendChild(li);
    }
  }

  renderSemester();
}

function renderSemester() {
  const cfg = store.get("kt_semester", { start: "2026-09-01", end: "2027-01-15" });
  $("#semStart").value = cfg.start;
  $("#semEnd").value = cfg.end;
  const start = new Date(cfg.start + "T00:00:00");
  const end = new Date(cfg.end + "T00:00:00");
  const now = new Date();
  const info = $("#semesterInfo");
  if (isNaN(start) || isNaN(end) || end <= start) { info.innerHTML = `<div style="color:var(--muted)">请设置正确的开学/放假日期</div>`; return; }
  const total = Math.round((end - start) / 86400000);
  let html = "";
  if (now < start) {
    const d = Math.round((start - now) / 86400000);
    html += `距离开学还有 <b style="color:var(--primary-dark);font-size:22px">${d}</b> 天`;
  } else if (now > end) {
    html += `已放假 🎉　（本学期共 ${total} 天）`;
  } else {
    const passed = Math.round((now - start) / 86400000);
    const left = Math.round((end - now) / 86400000);
    const pct = Math.max(0, Math.min(100, Math.round(passed / total * 100)));
    html += `本学期已过 <b>${passed}</b> 天 / 共 ${total} 天，还剩 <b>${left}</b> 天`;
    html += `<div class="progress"><div style="width:${pct}%"></div></div>`;
    html += `<div style="font-size:13px;color:var(--muted)">学期进度 <b style="color:var(--primary-dark)">${pct}%</b></div>`;
  }
  info.innerHTML = html;
}

/* ---------------- 上课提醒 ---------------- */
const remindedClass = new Set();
function classStartMin(period) { return periods[period] ? minuteOfDay(periods[period].start) : null; }
function remindMin(period) {
  if (!periods[period]) return null;
  if (period === 0) return Math.max(0, minuteOfDay(periods[0].start) - 20); // 第一节提前 20 分钟
  return minuteOfDay(periods[period - 1].end); // 上一节下课即课间
}
function checkClassReminders() {
  const now = new Date();
  if (isHoliday(now)) return;              // 法定节假日不提醒
  const todayCol = (now.getDay() + 6) % 7;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const key = todayStr();
  for (const c of courses) {
    if (c.day !== todayCol) continue;
    const start = classStartMin(c.period), rm = remindMin(c.period);
    if (start == null || rm == null) continue;
    if (nowMin >= rm && nowMin < start) {
      const k = `${key}-${c.day}-${c.period}`;
      if (remindedClass.has(k)) continue;
      remindedClass.add(k);
      const p = periods[c.period];
      notify("快要上课啦～", `第${c.period + 1}节 ${c.name}${c.loc ? "（" + c.loc + "）" : ""} ${p.start} 开始`);
    }
  }
}

/* ---------------- 初始化 ---------------- */
function init() {
  // 标题可编辑
  const titleEl = $("#appTitle");
  titleEl.textContent = store.get("kt_title", "Kitty 工作台");
  document.title = titleEl.textContent;
  titleEl.addEventListener("click", () => {
    titleEl.contentEditable = "true"; titleEl.focus();
    const r = document.createRange(); r.selectNodeContents(titleEl);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  titleEl.addEventListener("blur", () => {
    titleEl.contentEditable = "false";
    const t = titleEl.textContent.replace(/\s+/g, " ").trim() || "Kitty 工作台";
    titleEl.textContent = t; document.title = t; store.set("kt_title", t);
  });
  titleEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); } });

  $("#kitty").addEventListener("click", kittyGreet);

  // Tabs
  $("#tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab"); if (!btn) return;
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
  });

  // 待办
  $("#addBtn").addEventListener("click", () => addTodo($("#todoText").value));
  $("#todoText").addEventListener("keydown", (e) => { if (e.key === "Enter") addTodo($("#todoText").value); });
  $("#voiceBtn").addEventListener("click", startListening);
  $("#todoList").addEventListener("click", (e) => {
    const id = +e.target.dataset.id;
    if (e.target.classList.contains("todo-check")) { const t = todos.find((x) => x.id === id); if (t) { t.done = !t.done; saveTodos(); renderTodos(); } }
    else if (e.target.classList.contains("todo-del")) { todos = todos.filter((x) => x.id !== id); notifiedTodo.delete(id); saveTodos(); renderTodos(); }
  });
  document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active"); filter = c.dataset.filter; renderTodos();
  }));

  // 饮水
  $("#waterPlus").addEventListener("click", () => changeWater(1));
  $("#waterMinus").addEventListener("click", () => changeWater(-1));

  // 运动
  const sel = $("#exType");
  Object.keys(MET).forEach((k) => { const o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o); });
  sel.addEventListener("change", updateExPreview);
  $("#exMin").addEventListener("input", updateExPreview);
  $("#exWeight").addEventListener("input", updateExPreview);
  $("#exAdd").addEventListener("click", addExercise);

  // 课程表
  $("#addPeriod").addEventListener("click", () => {
    const last = periods[periods.length - 1] || { end: "20:35" };
    periods.push({ start: last.end, end: last.end });
    savePeriods(); renderPeriodEditor(); renderSchedule();
  });
  $("#courseSave").addEventListener("click", saveCourse);
  $("#courseClear").addEventListener("click", clearCourse);
  $("#courseCancel").addEventListener("click", closeCourseModal);
  $("#courseModal").addEventListener("click", (e) => { if (e.target === $("#courseModal")) closeCourseModal(); });

  // 学期
  $("#semStart").addEventListener("change", (e) => { const c = store.get("kt_semester", {}); c.start = e.target.value; store.set("kt_semester", c); renderSemester(); });
  $("#semEnd").addEventListener("change", (e) => { const c = store.get("kt_semester", {}); c.end = e.target.value; store.set("kt_semester", c); renderSemester(); });

  // 通知权限
  document.addEventListener("click", () => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, { once: true });

  // 渲染
  renderTodos(); renderWater(); renderExercise();
  renderPeriodEditor(); renderSchedule(); renderCountdowns();
  checkClassReminders();
  setInterval(() => { renderCountdowns(); renderWater(); renderExercise(); checkClassReminders(); }, 30000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
