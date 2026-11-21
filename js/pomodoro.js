// Temporizador Pomodoro: 25 min de concentración, 5 min de descanso corto
// y 15 min de descanso largo cada 4 pomodoros. Se basa en marcas de tiempo
// (endsAt), así que sigue siendo exacto aunque el navegador ralentice los temporizadores.
export const DURATIONS = { work: 25 * 60 * 1000, short: 5 * 60 * 1000, long: 15 * 60 * 1000 };
export const LONG_EVERY = 4;

const todayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function normalizePomodoro(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const phase = ['idle', 'work', 'short', 'long'].includes(r.phase) ? r.phase : 'idle';
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    phase,
    endsAt: phase !== 'idle' && !r.paused ? num(r.endsAt) : null,
    remaining: phase !== 'idle' && r.paused ? num(r.remaining) : null,
    paused: phase !== 'idle' && !!r.paused && num(r.remaining) != null,
    cycle: Number.isInteger(r.cycle) ? Math.max(0, Math.min(LONG_EVERY, r.cycle)) : 0,
    day: typeof r.day === 'string' ? r.day : todayKey(),
    today: Number.isInteger(r.today) ? r.today : 0,
    taskId: typeof r.taskId === 'string' ? r.taskId : null,
    auto: !!r.auto,
    sound: r.sound !== false
  };
}

export class Pomodoro {
  // hooks: { onEvent(evt), onChange() }  evt = { type: 'start'|'end'|'abandon', phase, silent, at }
  constructor(data, hooks) {
    this.d = data;
    this.hooks = hooks;
    this.timer = null;
    if (this.d.phase !== 'idle' && !this.d.paused && this.d.endsAt == null) this.d.phase = 'idle';
  }

  get running() { return this.d.phase !== 'idle' && !this.d.paused; }

  remaining(now = Date.now()) {
    const d = this.d;
    if (d.phase === 'idle') return DURATIONS.work;
    if (d.paused) return d.remaining;
    return Math.max(0, d.endsAt - now);
  }

  total() { return this.d.phase === 'idle' ? DURATIONS.work : DURATIONS[this.d.phase]; }

  rollDay(now) {
    const k = todayKey(now);
    if (this.d.day !== k) { this.d.day = k; this.d.today = 0; }
  }

  begin(phase, at, silent = false) {
    const d = this.d;
    if (phase === 'work' && d.cycle >= LONG_EVERY) d.cycle = 0;
    d.phase = phase;
    d.endsAt = at + DURATIONS[phase];
    d.paused = false; d.remaining = null;
    this.hooks.onEvent({ type: 'start', phase, silent, at });
    this.arm();
  }

  start(now = Date.now()) {
    if (this.d.phase !== 'idle') return;
    this.begin('work', now);
    this.hooks.onChange();
  }

  pause(now = Date.now()) {
    if (!this.running) return;
    this.d.remaining = Math.max(0, this.d.endsAt - now);
    this.d.endsAt = null; this.d.paused = true;
    clearTimeout(this.timer);
    this.hooks.onChange();
  }

  resume(now = Date.now()) {
    if (!this.d.paused) return;
    this.d.endsAt = now + this.d.remaining;
    this.d.remaining = null; this.d.paused = false;
    this.arm();
    this.hooks.onChange();
  }

  // Abandonar la concentración: según la técnica, no cuenta.
  abandon() {
    if (this.d.phase !== 'work') return;
    this.d.phase = 'idle'; this.d.endsAt = null; this.d.remaining = null; this.d.paused = false;
    clearTimeout(this.timer);
    this.hooks.onEvent({ type: 'abandon', phase: 'work', silent: false, at: Date.now() });
    this.hooks.onChange();
  }

  // Terminar el descanso antes de tiempo.
  skipBreak(now = Date.now()) {
    if (this.d.phase !== 'short' && this.d.phase !== 'long') return;
    this.complete(now, false);
    this.hooks.onChange();
  }

  reset() {
    Object.assign(this.d, { phase: 'idle', endsAt: null, remaining: null, paused: false, cycle: 0 });
    clearTimeout(this.timer);
    this.hooks.onChange();
  }

  complete(at, silent) {
    const d = this.d;
    const phase = d.phase;
    this.rollDay(at);
    if (phase === 'work') {
      d.cycle += 1;
      d.today += 1;
      this.hooks.onEvent({ type: 'end', phase, silent, at });
      this.begin(d.cycle >= LONG_EVERY ? 'long' : 'short', at, silent);
    } else {
      if (phase === 'long') d.cycle = 0;
      this.hooks.onEvent({ type: 'end', phase, silent, at });
      if (d.auto) this.begin('work', at, silent);
      else { d.phase = 'idle'; d.endsAt = null; }
    }
  }

  // Avanza las fases vencidas. silent = fases que terminaron con la app cerrada.
  tick(now = Date.now(), silent = false) {
    this.rollDay(now);
    let guard = 0, changed = false;
    while (this.running && now >= this.d.endsAt && guard++ < 50) {
      const late = silent || now - this.d.endsAt > 5000;
      this.complete(this.d.endsAt, late);
      changed = true;
    }
    if (changed) this.hooks.onChange();
    return changed;
  }

  // Temporizador único hasta el final de la fase (más fiable en segundo plano que una cadena).
  arm() {
    clearTimeout(this.timer);
    if (!this.running) return;
    const ms = Math.max(0, this.d.endsAt - Date.now()) + 30;
    this.timer = setTimeout(() => this.tick(), Math.min(ms, 2 ** 31 - 1));
  }
}

export function fmtClock(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
