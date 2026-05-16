// ── 配置 ──────────────────────────────────────────────
const CONFIG = {
  pomodoro:   { label: '专注',     time: 25 * 60 },
  shortBreak: { label: '短休息',   time: 5 * 60  },
  longBreak:  { label: '长休息',   time: 15 * 60 },
};

// ── 状态 ──────────────────────────────────────────────
const state = {
  mode: 'pomodoro',
  timeLeft: 25 * 60,
  running: false,
  timerId: null,
  today: 0,
  total: 0,
  sessions: 0,
};

// ── 持久化 ────────────────────────────────────────────
function loadStats() {
  try {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('pomo_date');
    if (savedDate !== today) {
      localStorage.setItem('pomo_date', today);
      localStorage.setItem('pomo_today', '0');
      state.today = 0;
    } else {
      state.today = parseInt(localStorage.getItem('pomo_today') || '0');
    }
    state.total = parseInt(localStorage.getItem('pomo_total') || '0');
  } catch (_) { /* 安全降级 */ }
}

function saveStats() {
  try {
    localStorage.setItem('pomo_today', String(state.today));
    localStorage.setItem('pomo_total', String(state.total));
  } catch (_) {}
}

// ── DOM ───────────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function renderStats() {
  $('#todayCount').textContent = state.today;
  $('#totalCount').textContent = state.total;
}

function renderTimer() {
  const m = Math.floor(state.timeLeft / 60);
  const s = state.timeLeft % 60;
  $('#timerDisplay').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const circumference = 2 * Math.PI * 120; // 753.98
  const offset = circumference * (1 - state.timeLeft / CONFIG[state.mode].time);
  $('.ring-progress').style.strokeDashoffset = offset;
}

function setStatus(text) {
  $('#timerStatus').textContent = text;
}

// ── 提醒音 ────────────────────────────────────────────
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const g = ctx.createGain(); g.gain.value = 0.25; g.connect(ctx.destination);

    [0, 0.15, 0.35].forEach((delay, i) => {
      const o = ctx.createOscillator();
      o.connect(g);
      o.type = 'sine';
      o.frequency.value = 880 + i * 220;
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.12);
    });
  } catch (_) {}
}

// ── 系统通知 ──────────────────────────────────────────
function notify(title, body) {
  try {
    window.electronAPI.sendNotification(title, body);
  } catch (_) {
    // 降级：无通知
  }
}

// ── 模式切换 ──────────────────────────────────────────
function updateModeUI() {
  const mode = state.mode;
  $$('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode));

  // 计时器包裹元素标记模式
  const wrap = $('#timerWrap');
  wrap.dataset.mode = mode;

  // body 标记是否为休息模式（用于按钮/tab颜色切换）
  document.body.classList.toggle('rest-mode', mode !== 'pomodoro');

  // 主按钮样式
  const btn = $('#mainBtn');
  btn.classList.remove('is-running');
  btn.textContent = '开始';
}

function switchMode(mode) {
  if (state.running) return;

  clearInterval(state.timerId);
  state.running = false;
  state.mode = mode;
  state.timeLeft = CONFIG[mode].time;

  updateModeUI();

  // 重置进度环动画
  $('.ring-progress').style.transition = 'none';
  renderTimer();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('.ring-progress').style.transition = 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  }));

  setStatus(`准备${CONFIG[mode].label}`);
}

// ── 结束会话 ──────────────────────────────────────────
function endSession() {
  state.running = false;
  clearInterval(state.timerId);
  $('#mainBtn').textContent = '开始';
  $('#mainBtn').classList.remove('is-running');
  $('#timerWrap').classList.remove('running');

  playAlarm();

  if (state.mode === 'pomodoro') {
    state.today++;
    state.total++;
    state.sessions++;
    saveStats();
    renderStats();
    notify('🍅 番茄钟', '太棒了！专注完成，该休息一下了 😊');

    state.sessions % 4 === 0 ? switchMode('longBreak') : switchMode('shortBreak');
  } else {
    notify('🍅 番茄钟', '休息结束，开始新一轮专注吧 💪');
    switchMode('pomodoro');
  }

  // 自动开始下一轮
  setTimeout(() => {
    $('#mainBtn').textContent = '暂停';
    $('#mainBtn').classList.add('is-running');
    $('#timerWrap').classList.add('running');
    state.running = true;
    setStatus(CONFIG[state.mode].label === '专注' ? '专注中...' : '休息中...');
    state.timerId = setInterval(tick, 1000);
  }, 600);
}

// ── 时钟滴答 ──────────────────────────────────────────
function tick() {
  if (state.timeLeft <= 0) { endSession(); return; }
  state.timeLeft--;
  renderTimer();
  setStatus(CONFIG[state.mode].label === '专注' ? '专注中...' : '休息中...');
}

// ── 开始/暂停 ─────────────────────────────────────────
function toggleTimer() {
  if (state.running) {
    clearInterval(state.timerId);
    state.running = false;
    $('#mainBtn').textContent = '继续';
    $('#mainBtn').classList.remove('is-running');
    $('#timerWrap').classList.remove('running');
    setStatus('已暂停');
  } else {
    state.running = true;
    $('#mainBtn').textContent = '暂停';
    $('#mainBtn').classList.add('is-running');
    $('#timerWrap').classList.add('running');
    setStatus(CONFIG[state.mode].label === '专注' ? '专注中...' : '休息中...');
    state.timerId = setInterval(tick, 1000);
  }
}

// ── 重置 ──────────────────────────────────────────────
function resetTimer() {
  clearInterval(state.timerId);
  state.running = false;
  state.timeLeft = CONFIG[state.mode].time;
  $('#mainBtn').textContent = '开始';
  $('#mainBtn').classList.remove('is-running');
  $('#timerWrap').classList.remove('running');
  renderTimer();
  setStatus(`准备${CONFIG[state.mode].label}`);
}

// ── 最小化到托盘 ─────────────────────────────────────
function minimizeToTray() {
  try { window.electronAPI.minimizeToTray(); } catch (_) {}
}

// ── 事件绑定 ──────────────────────────────────────────
$$('.mode-tab').forEach(tab =>
  tab.addEventListener('click', () => switchMode(tab.dataset.mode)));

$('#mainBtn').addEventListener('click', toggleTimer);
$('#resetBtn').addEventListener('click', resetTimer);
$('#closeBtn').addEventListener('click', minimizeToTray);

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); toggleTimer(); }
  if (e.key === 'r' || e.key === 'R') resetTimer();
  if (e.key === 'Escape') minimizeToTray();
  if (e.key === '1') switchMode('pomodoro');
  if (e.key === '2') switchMode('shortBreak');
  if (e.key === '3') switchMode('longBreak');
});

// 切到其他窗口时自动暂停
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) {
    clearInterval(state.timerId);
    state.running = false;
    $('#mainBtn').textContent = '继续';
    $('#mainBtn').classList.remove('is-running');
    $('#timerWrap').classList.remove('running');
    setStatus('已暂停（窗口失焦）');
  }
});

// ── 启动 ──────────────────────────────────────────────
loadStats();
renderTimer();
renderStats();
setStatus('准备开始');
updateModeUI();
