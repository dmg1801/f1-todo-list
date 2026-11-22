// Persistencia en localStorage con el esquema pitwall-gp-v1.
// { tasks:[{id,title,due,alarm,done,fired,dismissed,late,created,completedAt}],
//   team, sound, motion, language, pitLaps:[], pomodoro:{...} }
import { DEFAULT_TEAM, TEAMS } from './teams.js';
import { LANGS, DEFAULT_LANG } from './i18n.js';
import { normalizePomodoro } from './pomodoro.js';
import { CIRCUITS, DEFAULT_CIRCUIT } from './circuits.js';
import { SHAPES, SYMBOLS } from './emblem.js';

export const STORAGE_KEY = 'pitwall-gp-v1';

function toTs(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

export function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;
  return {
    id: raw.id != null ? String(raw.id) : newId(),
    title,
    due: toTs(raw.due),
    alarm: toTs(raw.alarm),
    done: !!raw.done,
    fired: !!raw.fired,
    dismissed: !!raw.dismissed,
    late: !!raw.late,
    created: toTs(raw.created) ?? Date.now(),
    completedAt: toTs(raw.completedAt),
    pomodoros: Number.isInteger(raw.pomodoros) && raw.pomodoros > 0 ? raw.pomodoros : 0
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
export function normalizeCustomTeam(c) {
  if (!c || typeof c !== 'object') return null;
  const name = typeof c.name === 'string' ? c.name.trim().slice(0, 24) : '';
  if (!name) return null;
  const col = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
  const e = c.emblem && typeof c.emblem === 'object' ? c.emblem : {};
  return {
    name,
    body: col(c.body, '#1e6bff'),
    second: col(c.second, '#0e1a33'),
    trim: col(c.trim, '#ffd23f'),
    emblem: {
      shape: SHAPES.includes(e.shape) ? e.shape : 'shield',
      symbol: SYMBOLS.includes(e.symbol) ? e.symbol : 'bolt',
      bg: col(e.bg, '#0e1a33'),
      fg: col(e.fg, '#ffd23f'),
      border: col(e.border, '#1e6bff'),
      initials: typeof e.initials === 'string' ? e.initials.trim().toUpperCase().slice(0, 3) : ''
    }
  };
}

export function load() {
  let data = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw) || {};
  } catch (e) { data = {}; }
  const ids = new Set();
  const tasks = (Array.isArray(data.tasks) ? data.tasks : [])
    .map(normalizeTask)
    .filter(t => t && !ids.has(t.id) && ids.add(t.id));
  return {
    tasks,
    team: TEAMS.some(t => t.id === data.team) || (data.team === 'custom' && normalizeCustomTeam(data.customTeam)) ? data.team : DEFAULT_TEAM,
    customTeam: normalizeCustomTeam(data.customTeam),
    circuit: CIRCUITS.some(c => c.id === data.circuit) ? data.circuit : DEFAULT_CIRCUIT,
    sound: data.sound === true,
    motion: typeof data.motion === 'boolean' ? data.motion : null, // null = seguir prefers-reduced-motion
    language: LANGS[data.language] ? data.language : DEFAULT_LANG,
    pitLaps: Array.isArray(data.pitLaps) ? data.pitLaps.filter(n => Number.isInteger(n)) : [],
    pomodoro: normalizePomodoro(data.pomodoro)
  };
}

export function save(state) {
  const data = {
    tasks: state.tasks,
    team: state.team,
    customTeam: state.customTeam,
    circuit: state.circuit,
    sound: state.sound,
    motion: state.motion,
    language: state.language,
    pitLaps: state.pitLaps,
    pomodoro: state.pomodoro
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch (e) { return false; }
}

export function standings(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const progress = total ? done / total : 0;
  const position = 20 - Math.floor(progress * 19);
  return { total, done, pending: total - done, progress, position, overtakes: 20 - position };
}
