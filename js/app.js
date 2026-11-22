// F1 To-Do-List: arranque, interfaz y lógica de tareas.
import { t, setLang, getLang, applyStatic, fmtDateTime } from './i18n.js';
import { load, save, standings, newId } from './store.js';
import { TEAMS, getTeam, emblemPath, inkFor, customTeamObject } from './teams.js';
import { CIRCUITS, getCircuit, nextCircuit } from './circuits.js';
import { drawThumb } from './scene/backdrops.js';
import { SHAPES, SYMBOLS, emblemDataURL, shapeIcon, symbolIcon } from './emblem.js';
import { drawCarSide, drawCarRear } from './scene/art.js';
import { audio } from './audio.js';
import { Reminders } from './reminders.js';
import { Director } from './scene/director.js';
import { Pomodoro, fmtClock } from './pomodoro.js';

TEAMS.forEach(tm => { tm.ink = inkFor(tm.ui); });

const state = load();
const $ = id => document.getElementById(id);
const reduceMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };
const motionOn = () => (state.motion === null ? !reduceMQ.matches : state.motion);

let filter = 'all';
let radio = [];
let subtitle = null;
let subtitleTimer = null;
let confirmSpec = null;
let editingId = null;
let sceneState = 'garage';

const ICON = {
  check: '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="m9.5 16.6-4.1-4.1L4 13.9l5.5 5.5L20 8.9l-1.4-1.4z"/></svg>',
  edit: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 17.3V20h2.7l8-8-2.7-2.7-8 8ZM17.7 9l1.6-1.6a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L15 6.3 17.7 9Z"/></svg>',
  del: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h1.5v-8H10Zm2.5 0v8H14v-8h-1.5Z"/></svg>',
  clock: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.4 3.5 2.1-.8 1.3L11 13V7h2v5.4Z"/></svg>',
  warn: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M1 21 12 2l11 19H1Zm12-3v-2h-2v2h2Zm0-4V9h-2v5h2Z"/></svg>',
  done: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.5 14.5L6 12l1.4-1.4 3.1 3.1 6.1-6.1L18 9l-7.5 7.5Z"/></svg>',
  flag: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 21V3h2v1h12l-2 4 2 4H7v9H5Z"/></svg>',
  tomato: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 7c5 0 9 3.2 9 7.5S17 22 12 22s-9-3.2-9-7.5S7 7 12 7Zm0-3.5L13.4 6l2.9-.6-1.4 2.6L12 9.5 9.1 8 7.7 5.4l2.9.6Z"/></svg>',
  bell: '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.8V3h-3v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>'
};

function persist() { save(state); }

// ---------- fechas de formulario ----------
function toLocalInput(ts) {
  if (ts == null) return '';
  const d = new Date(ts), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(v) {
  if (!v) return null;
  const ts = new Date(v).getTime();
  return Number.isFinite(ts) ? ts : null;
}

// ---------- escudería ----------
let customCache = { key: '', team: null };
function customTeam() {
  const ct = state.customTeam;
  if (!ct) return null;
  const key = JSON.stringify(ct);
  if (customCache.key !== key) customCache = { key, team: customTeamObject(ct, emblemDataURL(ct.emblem)) };
  return customCache.team;
}
function currentTeam() {
  return state.team === 'custom' && state.customTeam ? customTeam() : getTeam(state.team);
}

function applyTeam() {
  const team = currentTeam();
  const r = document.documentElement.style;
  r.setProperty('--accent', team.ui);
  r.setProperty('--accent-2', team.ui2);
  r.setProperty('--accent-ink', team.ink);
  r.setProperty('--livery', team.livery.body);
  r.setProperty('--livery-trim', team.livery.trim);
  $('teamEmblem').src = emblemPath(team);
  $('teamName').textContent = team.name;
  document.querySelectorAll('.team-option').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.team === team.id)));
  document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0d0f14');
  if (director && !director.animated) director.renderFrame(0);
}

function teamButton(tm) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'team-option';
  b.dataset.team = tm.id;
  b.style.setProperty('--team-ui', tm.ui);
  const img = document.createElement('img');
  img.src = emblemPath(tm); img.alt = ''; img.width = 40; img.height = 40;
  const sw = document.createElement('span');
  sw.className = 'team-swatch'; sw.setAttribute('aria-hidden', 'true');
  sw.style.background = `linear-gradient(90deg, ${tm.livery.body} 0 50%, ${tm.livery.second} 50% 75%, ${tm.livery.trim} 75%)`;
  const name = document.createElement('span');
  name.className = 'team-option-name'; name.textContent = tm.name;
  b.append(img, name, sw);
  b.addEventListener('click', () => chooseTeam(tm.id));
  return b;
}

function buildTeamGrid() {
  const ul = $('teamGrid');
  ul.textContent = '';
  // escudería propia: siempre la primera
  const li = document.createElement('li');
  li.className = 'team-custom';
  const mine = customTeam();
  if (mine) {
    const b = teamButton(mine);
    const tag = document.createElement('span');
    tag.className = 'team-tag'; tag.textContent = t('ctYours');
    b.insertBefore(tag, b.querySelector('.team-option-name'));
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'btn btn-icon btn-ghost team-edit';
    edit.setAttribute('aria-label', t('ctEdit'));
    edit.innerHTML = ICON.edit;
    edit.addEventListener('click', () => openCustomEditor());
    li.append(b, edit);
  } else {
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'team-create';
    c.innerHTML = '<span class="team-create-plus" aria-hidden="true">+</span>';
    const tx = document.createElement('span');
    tx.className = 'team-create-text';
    const strong = document.createElement('strong'); strong.textContent = t('ctCreate');
    const small = document.createElement('span'); small.textContent = t('ctCreateHint');
    tx.append(strong, small);
    c.appendChild(tx);
    c.addEventListener('click', () => openCustomEditor());
    li.appendChild(c);
  }
  ul.appendChild(li);
  for (const tm of TEAMS) {
    const item = document.createElement('li');
    item.appendChild(teamButton(tm));
    ul.appendChild(item);
  }
  applyTeam();
}

function chooseTeam(id) {
  const changed = id !== state.team;
  state.team = id;
  persist();
  applyTeam();
  if (changed) pushRadio('r_team', { team: currentTeam().name });
  $('teamDialog').close();
  $('teamBadge').focus();
}

// ---------- editor de escudería propia ----------
let draft = null;
function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function randomPalette() {
  const h = Math.random() * 360;
  const body = hsl(h, 0.75, 0.45), second = hsl((h + 180 + Math.random() * 60 - 30) % 360, 0.6, 0.18), trim = hsl((h + 40 + Math.random() * 280) % 360, 0.9, 0.6);
  return { body, second, trim };
}
function defaultDraft() {
  const p = { body: '#1e6bff', second: '#0e1a33', trim: '#ffd23f' };
  return { name: '', ...p, emblem: { shape: 'shield', symbol: 'bolt', bg: p.second, fg: p.trim, border: p.body, initials: '' } };
}

function buildChoices() {
  const mk = (box, list, name, icon, labelKey) => {
    box.textContent = '';
    for (const v of list) {
      const lab = document.createElement('label');
      lab.className = 'choice';
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = v; inp.className = 'choice-input';
      const boxEl = document.createElement('span');
      boxEl.className = 'choice-box'; boxEl.innerHTML = icon(v);
      const txt = document.createElement('span');
      txt.className = 'visually-hidden'; txt.textContent = t(labelKey + v);
      lab.title = t(labelKey + v);
      lab.append(inp, boxEl, txt);
      box.appendChild(lab);
    }
  };
  mk($('ctShapes'), SHAPES, 'ctShape', shapeIcon, 'shape_');
  mk($('ctSymbols'), SYMBOLS, 'ctSymbol', symbolIcon, 'sym_');
}

function fillEditor() {
  const d = draft;
  $('ctName').value = d.name;
  $('ctBody').value = d.body; $('ctSecond').value = d.second; $('ctTrim').value = d.trim;
  $('ctBadgeBg').value = d.emblem.bg; $('ctBadgeFg').value = d.emblem.fg; $('ctBadgeBorder').value = d.emblem.border;
  $('ctInitials').value = d.emblem.initials;
  document.querySelectorAll('input[name="ctShape"]').forEach(i => { i.checked = i.value === d.emblem.shape; });
  document.querySelectorAll('input[name="ctSymbol"]').forEach(i => { i.checked = i.value === d.emblem.symbol; });
  renderPreview();
}

function readEditor() {
  const d = draft;
  d.name = $('ctName').value;
  d.body = $('ctBody').value; d.second = $('ctSecond').value; d.trim = $('ctTrim').value;
  d.emblem.bg = $('ctBadgeBg').value; d.emblem.fg = $('ctBadgeFg').value; d.emblem.border = $('ctBadgeBorder').value;
  d.emblem.initials = $('ctInitials').value.toUpperCase().slice(0, 3);
  const sh = document.querySelector('input[name="ctShape"]:checked'); if (sh) d.emblem.shape = sh.value;
  const sy = document.querySelector('input[name="ctSymbol"]:checked'); if (sy) d.emblem.symbol = sy.value;
}

function renderPreview() {
  const d = draft;
  const name = d.name.trim() || t('ctDefaultName');
  $('ctEmblemPreview').src = emblemDataURL(d.emblem);
  $('ctNamePreview').textContent = name;
  $('ctPreviewBox').setAttribute('aria-label', t('ctPreviewAria', { name }));
  const c = $('ctCarPreview'), ctx = c.getContext('2d');
  const L = { body: d.body, second: d.second, trim: d.trim };
  ctx.clearRect(0, 0, c.width, c.height);
  drawCarSide(ctx, 112, 150, 200, L, { wheelF: 'new', wheelR: 'new', wing: 'new', driverIn: true, lift: 0 });
  drawCarRear(ctx, 268, 150, 86, 0, L, {});
}

function openCustomEditor() {
  draft = state.customTeam ? JSON.parse(JSON.stringify(state.customTeam)) : defaultDraft();
  buildChoices();
  fillEditor();
  $('ctNameErr').textContent = '';
  $('ctName').removeAttribute('aria-invalid');
  if ($('teamDialog').open) $('teamDialog').close();
  $('customDialog').showModal();
  $('ctName').focus();
}

function closeCustomEditor(backToTeams = true) {
  if ($('customDialog').open) $('customDialog').close();
  if (backToTeams) { $('teamDialog').showModal(); const cur = document.querySelector('.team-custom button'); if (cur) cur.focus(); }
  else $('teamBadge').focus();
}

// ---------- circuitos ----------
function circuitName(id) { return t('ci_' + id); }

function renderCircuitBtn() {
  $('circuitBtnText').textContent = t('circuitBtn', { name: circuitName(state.circuit) });
}

function buildCircuitGrid() {
  const ul = $('circuitGrid');
  ul.textContent = '';
  for (const c of CIRCUITS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'circuit-option'; b.dataset.circuit = c.id;
    b.setAttribute('aria-pressed', String(c.id === state.circuit));
    const cv = document.createElement('canvas');
    cv.width = 240; cv.height = 120; cv.className = 'circuit-thumb'; cv.setAttribute('aria-hidden', 'true');
    drawThumb(cv.getContext('2d'), 240, 120, c);
    const name = document.createElement('strong'); name.className = 'circuit-name'; name.textContent = circuitName(c.id);
    const desc = document.createElement('span'); desc.className = 'circuit-desc'; desc.textContent = t('cd_' + c.id);
    b.append(cv, name, desc);
    b.addEventListener('click', () => chooseCircuit(c.id));
    li.appendChild(b);
    ul.appendChild(li);
  }
}

function chooseCircuit(id) {
  const changed = id !== state.circuit;
  state.circuit = id;
  persist();
  director.setCircuit(getCircuit(id));
  renderCircuitBtn();
  if (changed) pushRadio('r_circuit', { name: circuitName(id) });
  $('circuitDialog').close();
  $('circuitBtn').focus();
}

// ---------- radio ----------
function pushRadio(key, params = {}) {
  const top = radio[0];
  if (top && top.key === key && JSON.stringify(top.params) === JSON.stringify(params) && Date.now() - top.at < 1500) return;
  radio.unshift({ key, params, at: Date.now() });
  radio = radio.slice(0, 8);
  renderRadio();
  audio.playRadioSound();
}
const timeFmt = () => new Intl.DateTimeFormat(document.documentElement.lang, { hour: '2-digit', minute: '2-digit' });
function renderRadio() {
  const ol = $('radioLog');
  ol.textContent = '';
  const tf = timeFmt();
  radio.forEach((m, i) => {
    const li = document.createElement('li');
    if (i === 0) li.className = 'latest';
    const tm = document.createElement('time');
    tm.dateTime = new Date(m.at).toISOString();
    tm.textContent = tf.format(m.at);
    const sp = document.createElement('span');
    sp.textContent = t(m.key, m.params);
    li.append(tm, sp);
    ol.appendChild(li);
  });
}

// ---------- subtítulos ----------
function setSubtitle(role, key) {
  subtitle = role ? { role, key } : null;
  clearTimeout(subtitleTimer);
  if (subtitle) subtitleTimer = setTimeout(() => { subtitle = null; renderSubtitle(); }, 4200);
  renderSubtitle();
}
function renderSubtitle() {
  const box = $('subtitle');
  if (!subtitle) { box.hidden = true; return; }
  box.hidden = false;
  box.dataset.role = subtitle.role;
  $('subtitleSpeaker').textContent = t('role_' + subtitle.role);
  $('subtitleLine').textContent = t(subtitle.key);
}

// ---------- estadísticas y estado ----------
function renderStats() {
  const s = standings(state.tasks);
  $('statPos').textContent = 'P' + s.position;
  $('statLaps').textContent = `${s.done}/${s.total}`;
  $('statOvertakes').textContent = String(s.overtakes);
  $('statPending').textContent = String(s.pending);
  renderSceneLabel();
}

function renderSceneLabel() {
  const s = standings(state.tasks);
  const name = t('state_' + sceneState);
  $('scene').setAttribute('aria-label', t('sceneLabel', { state: name, pos: s.position, done: s.done, total: s.total }));
  $('stateText').textContent = `${t('stateLabel')}: ${name}` + (motionOn() ? '' : ` · ${t('pausedSuffix')}`);
  $('stateChip').dataset.state = sceneState;
  const vb = $('victoryBanner');
  const won = sceneState === 'victory' && s.total > 0 && s.done === s.total;
  vb.hidden = !won;
  if (won) $('victoryBody').textContent = t('victoryBody', { n: s.total });
}

function renderControls() {
  const s = standings(state.tasks);
  const browsing = director ? director.browsing : false;
  const busy = sceneState === 'pit' || sceneState === 'assembly';
  const running = director && director.race === 'running';
  const gb = $('garageBtn');
  gb.setAttribute('aria-pressed', String(browsing));
  $('garageBtnText').textContent = browsing ? t('btnTrack') : t('btnGarage');
  gb.disabled = !running || busy;
  $('pitBtn').disabled = !running || busy || s.pending === 0 || (director && director.queue.some(e => e.type === 'pit'));
  const m = motionOn();
  $('pauseBtn').setAttribute('aria-pressed', String(!m));
  $('pauseBtnText').textContent = m ? t('btnPause') : t('btnResume');
  $('soundBtn').setAttribute('aria-pressed', String(state.sound));
  $('soundBtnText').textContent = `${t('btnSound')}: ${state.sound ? t('on') : t('off')}`;
  $('soundToggle').checked = state.sound;
  $('motionToggle').checked = m;
  $('newRaceBtn').disabled = state.tasks.length === 0;
}

// ---------- lista de tareas ----------
function isOverdue(task, now = Date.now()) { return !task.done && task.due != null && task.due < now; }

function orderedTasks() {
  const byDue = (a, b) => {
    const da = a.due ?? Infinity, db = b.due ?? Infinity;
    if (da !== db) return da < db ? -1 : 1;
    return a.created - b.created;
  };
  const pending = state.tasks.filter(x => !x.done).sort(byDue);
  const done = state.tasks.filter(x => x.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  if (filter === 'pending') return pending;
  if (filter === 'done') return done;
  return pending.concat(done);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderList() {
  const list = $('taskList');
  // conservar foco
  const act = document.activeElement;
  const li = act && act.closest ? act.closest('.task') : null;
  const keep = li && list.contains(li) ? { id: li.dataset.id, action: act.dataset.action } : null;

  list.textContent = '';
  const now = Date.now();
  for (const task of orderedTasks()) {
    const status = task.done ? 'done' : isOverdue(task, now) ? 'overdue' : 'pending';
    const item = el('li', `task is-${status}`);
    item.dataset.id = task.id;

    const check = el('button', 'check');
    check.type = 'button';
    check.dataset.action = 'toggle';
    check.setAttribute('aria-pressed', String(task.done));
    check.setAttribute('aria-label', t(task.done ? 'reopenAria' : 'completeAria', { title: task.title }));
    check.innerHTML = ICON.check;

    const body = el('div', 'task-body');
    body.appendChild(el('p', 'task-title', task.title));
    const meta = el('p', 'task-meta');
    const badge = el('span', `badge badge-${status}`);
    badge.innerHTML = status === 'done' ? ICON.done : status === 'overdue' ? ICON.warn : ICON.clock;
    badge.appendChild(el('span', '', t('st_' + status)));
    meta.appendChild(badge);
    const due = el('span', 'meta-item');
    due.innerHTML = ICON.flag;
    due.appendChild(el('span', '', task.due != null ? t('dueLabel', { date: fmtDateTime(task.due) }) : t('noDate')));
    meta.appendChild(due);
    if (task.alarm != null) {
      const al = el('span', 'meta-item' + (task.fired ? ' fired' : ''));
      al.innerHTML = ICON.bell;
      al.appendChild(el('span', '', t('alarmLabel', { date: fmtDateTime(task.alarm) }) + (task.fired ? ` · ${t('alarmFired')}` : '')));
      meta.appendChild(al);
    }
    if (task.pomodoros > 0) {
      const pm = el('span', 'meta-item pomos');
      pm.innerHTML = ICON.tomato;
      pm.appendChild(el('span', '', t('pomoCount', { n: task.pomodoros })));
      meta.appendChild(pm);
    }
    body.appendChild(meta);

    const actions = el('div', 'task-actions');
    const eb = el('button', 'btn btn-icon btn-ghost');
    eb.type = 'button'; eb.dataset.action = 'edit';
    eb.setAttribute('aria-label', t('editAria', { title: task.title }));
    eb.innerHTML = ICON.edit;
    const db = el('button', 'btn btn-icon btn-ghost btn-del');
    db.type = 'button'; db.dataset.action = 'delete';
    db.setAttribute('aria-label', t('deleteAria', { title: task.title }));
    db.innerHTML = ICON.del;
    actions.append(eb, db);

    item.append(check, body, actions);
    list.appendChild(item);
  }
  const counts = { all: state.tasks.length, pending: state.tasks.filter(x => !x.done).length, done: state.tasks.filter(x => x.done).length };
  $('countAll').textContent = counts.all;
  $('countPending').textContent = counts.pending;
  $('countDone').textContent = counts.done;
  document.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  const empty = $('emptyState');
  const shown = list.children.length;
  empty.hidden = shown > 0;
  if (!shown) empty.textContent = t(filter === 'all' ? 'empty_all' : filter === 'pending' ? 'empty_pending' : 'empty_done');

  if (keep) {
    const again = list.querySelector(`.task[data-id="${CSS.escape(keep.id)}"] [data-action="${keep.action}"]`);
    if (again) again.focus();
  }
}

// ---------- avisos ----------
function renderToasts() {
  const box = $('toasts');
  const active = reminders.active();
  const ids = new Set(active.map(x => x.id));
  box.querySelectorAll('.toast').forEach(n => { if (!ids.has(n.dataset.id)) n.remove(); });
  for (const task of active) {
    let n = box.querySelector(`.toast[data-id="${CSS.escape(task.id)}"]`);
    if (!n) {
      n = el('div', 'toast');
      n.dataset.id = task.id;
      n.setAttribute('role', 'alert');
      const ic = el('span', 'toast-icon'); ic.innerHTML = ICON.bell;
      const tx = el('div', 'toast-text');
      tx.append(el('strong', 'toast-head'), el('p', 'toast-title'), el('p', 'toast-when'));
      const b = el('button', 'btn btn-accent toast-dismiss');
      b.type = 'button';
      b.addEventListener('click', () => dismissReminder(task.id));
      n.append(ic, tx, b);
      box.appendChild(n);
    }
    n.querySelector('.toast-head').textContent = t('toastTitle');
    n.querySelector('.toast-title').textContent = task.title;
    n.querySelector('.toast-when').textContent = task.late ? t('toastLate', { time: fmtDateTime(task.alarm) }) : t('toastAt', { time: fmtDateTime(task.alarm) });
    const b = n.querySelector('.toast-dismiss');
    b.textContent = t('dismiss');
    b.setAttribute('aria-label', t('dismissAria', { title: task.title }));
  }
}

function dismissReminder(id) {
  const task = state.tasks.find(x => x.id === id);
  if (task) { task.dismissed = true; persist(); }
  renderToasts();
}

function renderNotif() {
  const p = Reminders.permission();
  $('notifStatus').textContent = t('notif_' + (p === 'granted' || p === 'denied' || p === 'unsupported' ? p : 'default'));
  $('notifBtn').hidden = p !== 'default';
}

// ---------- diálogos ----------
function confirmBox(spec) {
  return new Promise(resolve => {
    const d = $('confirmDialog');
    confirmSpec = spec;
    renderConfirm();
    d.returnValue = '';
    d.addEventListener('close', () => { confirmSpec = null; resolve(d.returnValue === 'ok'); }, { once: true });
    d.showModal();
    $('confirmCancel').focus();
  });
}
function renderConfirm() {
  if (!confirmSpec) return;
  $('confirmTitle').textContent = t(confirmSpec.title);
  $('confirmBody').textContent = t(confirmSpec.body, confirmSpec.params || {});
  $('confirmOk').textContent = t(confirmSpec.ok);
  $('confirmCancel').textContent = t('cancel');
}

function openEdit(id) {
  const task = state.tasks.find(x => x.id === id);
  if (!task) return;
  editingId = id;
  $('editTitle').value = task.title;
  $('editDue').value = toLocalInput(task.due);
  $('editAlarm').value = toLocalInput(task.alarm);
  $('editError').textContent = '';
  $('editTitle').removeAttribute('aria-invalid');
  $('editDialog').showModal();
  $('editTitle').focus();
}
function closeEdit() {
  const d = $('editDialog');
  if (d.open) d.close();
}
function focusTask(id, action) {
  const b = document.querySelector(`.task[data-id="${CSS.escape(id)}"] [data-action="${action}"]`);
  if (b) b.focus(); else $('taskTitle').focus();
}

// ---------- carrera ----------
function maybeAutoPit(next) {
  if (next.done >= next.total) return;
  const long = next.total >= 6;
  const half = Math.ceil(next.total / 2);
  const hit = long ? next.done % 2 === 0 : next.done === half;
  if (hit && !state.pitLaps.includes(next.done)) {
    state.pitLaps.push(next.done);
    persist();
    director.enqueue({ type: 'pit' });
    pushRadio('r_pit');
  }
}

function onProgress(prev, next, cause, task) {
  if (next.total === 0) { director.setModel(next); director.empty(); return; }
  director.setModel(next);
  if (cause === 'add') {
    if (director.race === 'empty' && !director.queue.some(e => e.type === 'assembly') && !(director.current && director.current.type === 'assembly')) {
      director.enqueue({ type: 'assembly' });
      pushRadio('r_assembly');
    } else if (prev.total > 0 && prev.done === prev.total) director.unwin();
    if (prev.total > 0 && next.position > prev.position) pushRadio('r_lost', { n: next.position - prev.position, pos: next.position });
  } else if (cause === 'complete') {
    const gain = prev.position - next.position;
    director.enqueue({ type: 'overtake', laps: 1, backmarker: gain === 0 });
    if (gain > 0) pushRadio('r_lap', { n: gain, done: next.done, total: next.total, pos: next.position });
    else pushRadio('r_lapSame', { done: next.done, total: next.total, pos: next.position });
    if (next.done === next.total) { director.enqueue({ type: 'victory' }); pushRadio('r_victory'); }
    else maybeAutoPit(next);
  } else if (cause === 'reopen') {
    if (prev.done === prev.total) director.unwin();
    pushRadio('r_reopen', { title: task.title });
    if (next.position > prev.position) pushRadio('r_lost', { n: next.position - prev.position, pos: next.position });
  } else if (cause === 'delete') {
    pushRadio('r_deleted');
    if (next.done === next.total && prev.done !== prev.total && director.race === 'running') { director.enqueue({ type: 'victory' }); pushRadio('r_victory'); }
  }
}

function renderAll() {
  renderStats();
  renderList();
  if (pomodoro) renderPomodoro();
  renderControls();
  renderToasts();
}

// ---------- acciones ----------
function addTask(title, due, alarm) {
  const prev = standings(state.tasks);
  const task = { id: newId(), title, due, alarm, done: false, fired: false, dismissed: false, late: false, created: Date.now(), completedAt: null };
  state.tasks.push(task);
  audio.playLapMusic();
  persist();
  const next = standings(state.tasks);
  pushRadio('r_added', { title });
  onProgress(prev, next, 'add', task);
  renderAll();
  reminders.check();
}

function toggleTask(id) {
  const task = state.tasks.find(x => x.id === id);
  if (!task) return;
  const prev = standings(state.tasks);
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
  if (task.done && task.fired) task.dismissed = true; // completar quita el aviso activo
  persist();
  const next = standings(state.tasks);
  onProgress(prev, next, task.done ? 'complete' : 'reopen', task);
  renderAll();
  reminders.schedule();
}

async function deleteTask(id) {
  const task = state.tasks.find(x => x.id === id);
  if (!task) return;
  const order = orderedTasks().map(x => x.id);
  const ok = await confirmBox({ title: 'delTitle', body: 'delBody', params: { title: task.title }, ok: 'delConfirm' });
  if (!ok) { focusTask(id, 'delete'); return; }
  const prev = standings(state.tasks);
  state.tasks = state.tasks.filter(x => x.id !== id);
  persist();
  const next = standings(state.tasks);
  onProgress(prev, next, 'delete', task);
  renderAll();
  reminders.schedule();
  const idx = order.indexOf(id);
  const neighbour = order[idx + 1] || order[idx - 1];
  if (neighbour && state.tasks.some(x => x.id === neighbour)) focusTask(neighbour, 'toggle');
  else $('taskTitle').focus();
}

async function newRace() {
  const ok = await confirmBox({ title: 'newTitle', body: 'newBody', ok: 'newConfirm' });
  if (!ok) return;
  state.tasks = [];
  state.pitLaps = [];
  state.circuit = nextCircuit(state.circuit);
  persist();
  director.reset();
  director.setCircuit(getCircuit(state.circuit));
  renderCircuitBtn();
  radio = [];
  pushRadio('r_newRace');
  pushRadio('r_nextRace', { name: circuitName(state.circuit) });
  renderAll();
  reminders.schedule();
  $('taskTitle').focus();
}

function setSound(on) {
  state.sound = on;
  persist();
  audio.setEnabled(on);
  renderControls();
}
function setMotion(on) {
  state.motion = on;
  persist();
  director.setAnimated(on);
  renderControls();
  renderSceneLabel();
}

function setLanguage(lang) {
  state.language = setLang(lang);
  persist();
  $('langSelect').value = state.language;
  $('langFlag').src = `./assets/flags/${state.language}.svg`;
  applyStatic();
  renderAll();
  renderRadio();
  renderSubtitle();
  renderConfirm();
  renderNotif();
  renderSceneLabel();
  renderCircuitBtn();
  buildTeamGrid();
  if ($('circuitDialog').open) buildCircuitGrid();
  if ($('customDialog').open) { readEditor(); buildChoices(); fillEditor(); }
  if (!director.animated) director.renderFrame(0);
}

// ---------- arranque ----------
setLang(state.language);
let director = null;
buildTeamGrid();
applyTeam();
applyStatic();
$('langSelect').value = state.language;
$('langFlag').src = `./assets/flags/${state.language}.svg`;
audio.chimesOn = state.pomodoro.sound;
audio.setEnabled(state.sound);
let pomodoro = null;

const reminders = new Reminders({
  getTasks: () => state.tasks,
  onFire: (task, late) => {
    audio.sfx('reminder');
    pushRadio('r_reminder', { title: task.title });
    if (document.visibilityState !== 'visible' || !document.hasFocus()) reminders.notify(t('notifTitle'), task.title);
  },
  onChange: () => { persist(); renderToasts(); renderList(); }
});

director = new Director($('scene'), {
  getTeam: () => currentTeam(),
  getCircuitName: () => circuitName(state.circuit),
  t,
  getLang,
  audio,
  onState: s => { sceneState = s; renderSceneLabel(); renderControls(); },
  onSubtitle: (role, key) => setSubtitle(role, key),
  onEvent: name => {
    const s = standings(state.tasks);
    if (name === 'start') pushRadio('r_start', { pos: s.position });
    if (name === 'pitDone') pushRadio('r_pitDone', { pos: s.position });
  }
});
director.setCircuit(getCircuit(state.circuit));
director.load(standings(state.tasks));
renderCircuitBtn();
director.setAnimated(motionOn());
reduceMQ.addEventListener && reduceMQ.addEventListener('change', () => { if (state.motion === null) { director.setAnimated(motionOn()); renderControls(); renderSceneLabel(); } });

pushRadio('r_welcome');
if (state.tasks.length) {
  const s = standings(state.tasks);
  if (s.pending) pushRadio('r_pending', { n: s.pending });
}
renderAll();
renderNotif();
reminders.check();
renderToasts();

// ---------- pomodoro ----------
const RING = 2 * Math.PI * 52;
let nextChimeAt = 0;
function playChime(name) {
  const wait = Math.max(0, nextChimeAt - Date.now());
  nextChimeAt = Date.now() + wait + 1600;
  setTimeout(() => audio.chime(name), wait);
}
function pomoAnnounce(key, params) {
  pushRadio(key, params);
  $('pomoLive').textContent = t(key, params);
  if (document.visibilityState !== 'visible' || !document.hasFocus()) reminders.notify(`${t('pomoTitle')} · F1 To-Do-List`, t(key, params));
}

pomodoro = new Pomodoro(state.pomodoro, {
  onEvent: evt => {
    const d = state.pomodoro;
    if (evt.type === 'start' && evt.phase === 'work') {
      const task = state.tasks.find(x => x.id === d.taskId);
      if (!evt.silent) playChime('workStart');
      pomoAnnounce(task ? 'r_pomoWorkTask' : 'r_pomoWork', task ? { title: task.title } : {});
    } else if (evt.type === 'end' && evt.phase === 'work') {
      const task = state.tasks.find(x => x.id === d.taskId);
      if (task) task.pomodoros = (task.pomodoros || 0) + 1;
      if (!evt.silent) playChime('workEnd');
      pomoAnnounce('r_pomoDone', { n: d.today });
      renderList();
    } else if (evt.type === 'start') {
      if (!evt.silent) playChime('breakStart');
      pomoAnnounce(evt.phase === 'long' ? 'r_pomoLong' : 'r_pomoShort');
    } else if (evt.type === 'end') {
      if (!evt.silent) playChime('breakEnd');
      pomoAnnounce('r_pomoBreakEnd');
    } else if (evt.type === 'abandon') {
      pomoAnnounce('r_pomoAbandon');
    }
  },
  onChange: () => { persist(); renderPomodoro(); }
});

function renderPomoTasks() {
  const sel = $('pomoTask');
  const cur = state.pomodoro.taskId;
  const list = state.tasks.filter(x => !x.done || x.id === cur);
  sel.textContent = '';
  const none = document.createElement('option');
  none.value = ''; none.textContent = t('pomoNoTask');
  sel.appendChild(none);
  for (const task of list) {
    const o = document.createElement('option');
    o.value = task.id; o.textContent = task.title;
    sel.appendChild(o);
  }
  sel.value = list.some(x => x.id === cur) ? cur : '';
}

function renderPomoTime() {
  const d = state.pomodoro;
  const rem = pomodoro.remaining();
  const time = fmtClock(rem);
  $('pomoTime').textContent = time;
  $('pomoTime').setAttribute('aria-label', t('pomoTimeAria', { time }));
  $('pomoRing').style.strokeDashoffset = String(RING * (1 - rem / pomodoro.total()));
  if (d.phase !== 'idle') document.title = `${d.paused ? '⏸' : '▶'} ${time} · ${t('pomo_' + d.phase)} · F1 To-Do-List`;
  else document.title = t('docTitle');
}

function renderPomodoro() {
  const d = state.pomodoro;
  pomodoro.rollDay(Date.now());
  $('pomo').dataset.phase = d.phase;
  $('pomoPhase').textContent = t('pomo_' + d.phase) + (d.paused ? ` · ${t('pomoPaused')}` : '');
  $('pomoToday').textContent = t('pomoToday', { n: d.today });
  const dots = $('pomoDots');
  dots.setAttribute('aria-label', t('pomoDots', { n: d.cycle }));
  [...dots.children].forEach((li, i) => {
    li.classList.toggle('on', i < d.cycle);
    li.classList.toggle('now', d.phase === 'work' && i === d.cycle);
  });
  const main = $('pomoMain');
  main.textContent = d.phase === 'idle' ? t('pomoStart') : d.paused ? t('pomoResume') : t('pomoPause');
  const skip = $('pomoSkip');
  skip.hidden = d.phase === 'idle';
  skip.textContent = d.phase === 'work' ? t('pomoAbandon') : t('pomoSkipBreak');
  $('pomoReset').disabled = d.phase === 'idle' && d.cycle === 0;
  $('pomoSound').checked = d.sound;
  $('pomoAuto').checked = d.auto;
  renderPomoTasks();
  renderPomoTime();
}

pomodoro.tick(Date.now(), true); // fases que terminaron con la app cerrada, sin sonido
pomodoro.arm();
renderPomodoro();
setInterval(() => { pomodoro.tick(); if (!document.hidden) renderPomoTime(); }, 500);
document.addEventListener('visibilitychange', () => { pomodoro.tick(); renderPomoTime(); });

$('pomoMain').addEventListener('click', () => {
  const d = state.pomodoro;
  audio.unlock();
  if (d.phase === 'idle') pomodoro.start();
  else if (d.paused) pomodoro.resume();
  else pomodoro.pause();
});
$('pomoSkip').addEventListener('click', async () => {
  if (state.pomodoro.phase === 'work') {
    const ok = await confirmBox({ title: 'abandonTitle', body: 'abandonBody', ok: 'abandonConfirm' });
    if (ok) pomodoro.abandon();
    $('pomoMain').focus();
  } else pomodoro.skipBreak();
});
$('pomoReset').addEventListener('click', async () => {
  const ok = state.pomodoro.phase === 'idle' ? true : await confirmBox({ title: 'resetTitle', body: 'resetBody', ok: 'resetConfirm' });
  if (ok) pomodoro.reset();
  $('pomoMain').focus();
});
$('pomoTask').addEventListener('change', e => { state.pomodoro.taskId = e.target.value || null; persist(); });
$('pomoSound').addEventListener('change', e => { state.pomodoro.sound = e.target.checked; audio.chimesOn = e.target.checked; if (e.target.checked) audio.unlock(); persist(); });
$('pomoAuto').addEventListener('change', e => { state.pomodoro.auto = e.target.checked; persist(); });

// ---------- eventos ----------
$('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('taskTitle');
  const title = input.value.trim();
  if (!title) {
    $('formError').textContent = t('fErrEmpty');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  $('formError').textContent = '';
  input.removeAttribute('aria-invalid');
  addTask(title, fromLocalInput($('taskDue').value), fromLocalInput($('taskAlarm').value));
  input.value = '';
  $('taskDue').value = '';
  $('taskAlarm').value = '';
  input.focus();
});
$('taskTitle').addEventListener('input', () => {
  if ($('taskTitle').value.trim()) { $('formError').textContent = ''; $('taskTitle').removeAttribute('aria-invalid'); }
});
document.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => { const i = $(b.dataset.clear); i.value = ''; i.focus(); }));

$('taskList').addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const id = b.closest('.task').dataset.id;
  if (b.dataset.action === 'toggle') toggleTask(id);
  else if (b.dataset.action === 'edit') openEdit(id);
  else if (b.dataset.action === 'delete') deleteTask(id);
});

document.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; renderList(); }));

$('editForm').addEventListener('submit', e => {
  e.preventDefault();
  const task = state.tasks.find(x => x.id === editingId);
  if (!task) { closeEdit(); return; }
  const title = $('editTitle').value.trim();
  if (!title) {
    $('editError').textContent = t('fErrEmpty');
    $('editTitle').setAttribute('aria-invalid', 'true');
    $('editTitle').focus();
    return;
  }
  const alarm = fromLocalInput($('editAlarm').value);
  task.title = title;
  task.due = fromLocalInput($('editDue').value);
  if (alarm !== task.alarm) { task.alarm = alarm; task.fired = false; task.dismissed = false; task.late = false; }
  persist();
  const id = editingId;
  closeEdit();
  renderAll();
  reminders.check();
  focusTask(id, 'edit');
});
$('editCancel').addEventListener('click', () => { const id = editingId; closeEdit(); focusTask(id, 'edit'); });
$('editDialog').addEventListener('close', () => { editingId = null; });
$('editDialog').addEventListener('cancel', () => { const id = editingId; setTimeout(() => id && focusTask(id, 'edit'), 0); });

$('garageBtn').addEventListener('click', () => {
  const on = !director.browsing;
  director.setBrowsing(on);
  pushRadio(on ? 'r_garage' : 'r_track');
  renderControls();
});
$('pitBtn').addEventListener('click', () => {
  const s = standings(state.tasks);
  if (!state.pitLaps.includes(s.done)) { state.pitLaps.push(s.done); persist(); }
  director.enqueue({ type: 'pit' });
  pushRadio('r_pit');
  renderControls();
});
$('pauseBtn').addEventListener('click', () => setMotion(!motionOn()));
$('motionToggle').addEventListener('change', e => setMotion(e.target.checked));
$('soundBtn').addEventListener('click', () => setSound(!state.sound));
$('soundToggle').addEventListener('change', e => setSound(e.target.checked));
$('newRaceBtn').addEventListener('click', newRace);
$('victoryNewRace').addEventListener('click', newRace);
$('teamBadge').addEventListener('click', () => {
  $('teamDialog').showModal();
  const cur = document.querySelector('.team-option[aria-pressed="true"]');
  if (cur) cur.focus();
});
$('teamDialogClose').addEventListener('click', () => { $('teamDialog').close(); $('teamBadge').focus(); });
$('teamDialog').addEventListener('click', e => { if (e.target === $('teamDialog')) { $('teamDialog').close(); $('teamBadge').focus(); } });
$('langSelect').addEventListener('change', e => setLanguage(e.target.value));
$('circuitBtn').addEventListener('click', () => {
  buildCircuitGrid();
  $('circuitDialog').showModal();
  const cur = document.querySelector('.circuit-option[aria-pressed="true"]');
  if (cur) cur.focus();
});
$('circuitDialogClose').addEventListener('click', () => { $('circuitDialog').close(); $('circuitBtn').focus(); });
$('circuitDialog').addEventListener('click', e => { if (e.target === $('circuitDialog')) { $('circuitDialog').close(); $('circuitBtn').focus(); } });
$('customForm').addEventListener('input', () => { readEditor(); renderPreview(); });
$('customForm').addEventListener('change', () => { readEditor(); renderPreview(); });
$('ctName').addEventListener('input', () => { if ($('ctName').value.trim()) { $('ctNameErr').textContent = ''; $('ctName').removeAttribute('aria-invalid'); } });
$('ctRandom').addEventListener('click', () => {
  readEditor();
  const p = randomPalette();
  Object.assign(draft, p);
  Object.assign(draft.emblem, { bg: p.second, fg: p.trim, border: p.body });
  fillEditor();
});
$('customForm').addEventListener('submit', e => {
  e.preventDefault();
  readEditor();
  const name = draft.name.trim();
  if (!name) {
    $('ctNameErr').textContent = t('ctNameErr');
    $('ctName').setAttribute('aria-invalid', 'true');
    $('ctName').focus();
    return;
  }
  draft.name = name.slice(0, 24);
  state.customTeam = JSON.parse(JSON.stringify(draft));
  state.team = 'custom';
  persist();
  buildTeamGrid();
  pushRadio('r_customSaved', { team: draft.name });
  closeCustomEditor(false);
});
$('ctCancel').addEventListener('click', () => closeCustomEditor(true));
$('customDialog').addEventListener('cancel', e => { e.preventDefault(); closeCustomEditor(true); });
$('customClose').addEventListener('click', () => closeCustomEditor(true));
$('notifBtn').addEventListener('click', async () => { await reminders.requestPermission(); renderNotif(); });
$('fab').addEventListener('click', () => {
  $('taskForm').scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'center' });
  $('taskTitle').focus({ preventScroll: true });
});

// Refrescar estados "vencida" cada minuto.
setInterval(() => { if (!document.hidden) renderList(); }, 60000);

// Service Worker: notificaciones en Android y uso sin conexión.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').then(reg => { reminders.swReg = reg; }).catch(() => {});
}

window.__pitwallApp = { state, standings: () => standings(state.tasks), reminders, pomodoro, audio };
