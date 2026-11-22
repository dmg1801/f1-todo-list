// Director de escena: máquina de estados (garage, assembly, racing, overtake, pit, victory),
// cola de eventos de carrera y bucle requestAnimationFrame.
import { Track } from './track.js';
import { Garage } from './garage.js';
import { TEAMS } from '../teams.js';

const STATE_OF = { assembly: 'assembly', overtake: 'overtake', pit: 'pit', victory: 'victory' };

export class Director {
  constructor(canvas, deps) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.deps = deps; // { getTeam, t, getLang, audio, onState, onSubtitle }
    this.track = new Track();
    this.garage = new Garage();
    this.queue = [];
    this.current = null;
    this.view = 'garage';
    this.race = 'empty';
    this.browsing = false;
    this.animated = true;
    this.model = { total: 0, done: 0, position: 20 };
    this.fade = null;
    this.lastState = null;
    this.visible = true;
    this.running = false;
    this.w = 300; this.h = 200;

    this.garage.hooks = {
      onSay: (role, key, voice) => {
        this.deps.onSubtitle(role, key);
        if (voice) this.deps.audio.speak(this.deps.t(key), this.deps.getLang());
      },
      sfx: name => { if (name === 'engine') this.deps.audio.sfx('overtake'); else this.deps.audio.sfx(name); }
    };
    this.track.events = {
      onPass: () => this.deps.audio.sfx('overtake'),
      onLight: () => this.deps.audio.sfx('lights'),
      onGo: () => { this.deps.audio.sfx('go'); this.deps.onEvent('start'); }
    };

    this.resize();
    if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    else window.addEventListener('resize', () => this.resize());
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }, { threshold: 0.01 }).observe(canvas);
    }
    window.__pitwall = this; // ayuda para pruebas automáticas
  }

  // ---------- tamaño ----------
  resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(240, Math.round(box.width));
    const h = Math.round(Math.max(190, Math.min(w * (w < 560 ? 0.68 : 0.56), 470)));
    const dpr = Math.min(window.devicePixelRatio || 1, w < 560 ? 1.75 : 2);
    if (w === this.w && h === this.h && this.dpr === dpr) return;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = h + 'px';
    this.renderFrame(0);
  }

  // ---------- estado ----------
  get state() {
    if (this.current) return STATE_OF[this.current.type] || 'racing';
    if (this.race === 'empty') return 'garage';
    if (this.race === 'won') return 'victory';
    return this.browsing ? 'garage' : 'racing';
  }

  emitState() {
    const s = this.state;
    const key = s + '|' + this.browsing + '|' + this.race;
    if (key !== this.lastState) { this.lastState = key; this.deps.onState(s); }
  }

  want() { return Math.max(0, Math.min(3, this.model.position - 1)); }

  setCircuit(c) {
    if (this.track.circuit && this.track.circuit.id === c.id) return;
    this.track.setCircuit(c);
    this.renderFrame(0);
  }

  setModel(m) {
    this.model = { ...m };
    this.track.setRivalCount(this.want());
    if (!this.animated) this.renderFrame(0);
  }

  load(m) {
    this.setModel(m);
    this.queue = []; this.current = null; this.browsing = false;
    if (!m.total) { this.race = 'empty'; this.view = 'garage'; this.garage.setup('empty'); this.track.setVictory(false); }
    else if (m.done === m.total) { this.race = 'won'; this.view = 'track'; this.track.resetRivals(0); this.track.setVictory(true); }
    else { this.race = 'running'; this.view = 'track'; this.track.setVictory(false); this.track.resetRivals(this.want()); }
    this.emitState();
    this.renderFrame(0);
  }

  reset() {
    this.queue = []; this.current = null; this.browsing = false; this.fade = null;
    this.race = 'empty'; this.view = 'garage';
    this.garage.setup('empty');
    this.track.setVictory(false); this.track.resetRivals(0); this.track.lights = null;
    this.deps.onSubtitle(null);
    this.deps.audio.stopVoice();
    this.emitState();
    this.renderFrame(0);
  }

  enqueue(ev) {
    const last = this.queue[this.queue.length - 1];
    if (ev.type === 'overtake' && last && last.type === 'overtake') { last.laps += ev.laps; last.backmarker = last.backmarker && ev.backmarker; }
    else if (ev.type === 'pit' && (this.queue.some(e => e.type === 'pit') || (this.current && this.current.type === 'pit'))) return;
    else this.queue.push(ev);
    if (!this.animated) { this.flush(); this.renderFrame(0); }
    this.emitState();
  }

  // Quitar victoria si se añaden o reabren tareas tras ganar.
  unwin() {
    this.queue = this.queue.filter(e => e.type !== 'victory');
    if (this.current && this.current.type === 'victory') this.current = null;
    if (this.race === 'won') { this.race = 'running'; this.track.setVictory(false); this.track.resetRivals(this.want()); }
    this.emitState(); this.renderFrame(0);
  }

  // Sin tareas: vuelve al garaje vacío.
  empty() { this.reset(); }

  setBrowsing(on) {
    if (this.race !== 'running') { this.browsing = false; this.emitState(); return; }
    if (this.current && (this.current.type === 'pit' || this.current.type === 'assembly')) return;
    if (on === this.browsing) return;
    if (this.current && this.current.type === 'overtake') this.finishOvertakeInstant();
    this.browsing = on;
    this.transition(() => {
      if (on) { this.view = 'garage'; this.garage.setup('parked'); }
      else { this.view = 'track'; this.deps.onSubtitle(null); }
    });
    this.emitState();
  }

  setAnimated(on) {
    this.animated = on;
    this.garage.instant = !on;
    if (!on) {
      this.flush();
      this.fade = null;
      this.deps.audio.engineOff();
      this.renderFrame(0);
    } else {
      this.start();
    }
    this.emitState();
  }

  // Ejecuta en el acto todo lo pendiente (movimiento desactivado o pausa).
  flush() {
    if (this.fade) { const f = this.fade; this.fade = null; f.mid && !f.done && f.mid(); }
    if (this.current) this.finishCurrentInstant();
    while (this.queue.length) { this.current = this.queue.shift(); this.startEvent(true); this.finishCurrentInstant(); }
    this.emitState();
  }

  finishOvertakeInstant() {
    this.track.ot = null;
    this.track.resetRivals(this.want());
    this.current = null;
  }

  finishCurrentInstant() {
    const ev = this.current;
    if (!ev) return;
    if (ev.type === 'assembly') {
      this.garage.finishInstant();
      this.garage.setup('parked');
      this.race = 'running'; this.view = 'track'; this.track.lights = null; this.track.speed = this.track.cruise;
      this.track.resetRivals(this.want());
      this.deps.onEvent('start');
    } else if (ev.type === 'overtake') {
      this.track.ot = null; this.track.resetRivals(this.want());
    } else if (ev.type === 'pit') {
      this.garage.finishInstant();
      this.garage.setup('parked');
      this.view = 'track'; this.browsing = false; this.track.resetRivals(this.want());
      this.deps.onEvent('pitDone');
    } else if (ev.type === 'victory') {
      this.race = 'won'; this.view = 'track'; this.browsing = false; this.track.setVictory(true);
    }
    this.deps.onSubtitle(null);
    this.current = null;
  }

  transition(mid, after) {
    if (!this.animated) { mid(); after && after(); this.renderFrame(0); return; }
    this.fade = { t: 0, dur: 0.32, mid, after, done: false };
  }

  startEvent(instant = false) {
    const ev = this.current;
    ev.phase = 'start';
    if (instant) return;
    if (ev.type === 'assembly') {
      const go = () => {
        this.view = 'garage';
        this.garage.runAssembly(() => {
          this.transition(() => {
            this.view = 'track'; this.race = 'running'; this.deps.onSubtitle(null);
            this.track.resetRivals(this.want()); this.track.startLights();
            ev.phase = 'lights';
          });
        });
      };
      if (this.view !== 'garage' || this.garage.kind !== 'empty') this.transition(() => { this.garage.setup('empty'); go(); });
      else go();
    } else if (ev.type === 'overtake') {
      if (this.browsing || this.view !== 'track') { this.finishOvertakeInstant(); return; }
      const mul = 1 + Math.min(2, this.queue.length * 0.6) + (ev.laps > 1 ? 0.6 : 0);
      this.track.overtake(Math.min(3, ev.laps), mul);
      this.track.backmarker = !!ev.backmarker;
    } else if (ev.type === 'pit') {
      this.transition(() => {
        this.view = 'garage';
        this.garage.runPit(() => {
          this.transition(() => {
            this.view = 'track'; this.browsing = false; this.deps.onSubtitle(null);
            this.track.resetRivals(this.want());
            ev.phase = 'end';
            this.deps.onEvent('pitDone');
          });
        });
      });
    } else if (ev.type === 'victory') {
      const win = () => { this.view = 'track'; this.browsing = false; this.race = 'won'; this.track.setVictory(true); this.deps.audio.sfx('victory'); ev.phase = 'end'; };
      if (this.view !== 'track') this.transition(() => { this.deps.onSubtitle(null); win(); });
      else win();
    }
  }

  eventDone() {
    const ev = this.current;
    if (!ev) return true;
    if (ev.type === 'assembly') return ev.phase === 'lights' && (!this.track.lights || this.track.lights.go);
    if (ev.type === 'overtake') return !this.track.ot;
    if (ev.type === 'pit') return ev.phase === 'end' && !this.fade;
    if (ev.type === 'victory') return ev.phase === 'end' && !this.fade;
    return true;
  }

  // ---------- bucle ----------
  start() {
    if (this.running || !this.animated) return;
    this.running = true;
    this.last = performance.now();
    const loop = now => {
      if (!this.animated) { this.running = false; return; }
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  tick(dt) {
    if (this.fade) {
      const f = this.fade;
      f.t += dt;
      if (!f.done && f.t >= f.dur) { f.done = true; f.mid && f.mid(); }
      if (f.t >= f.dur * 2) { this.fade = null; f.after && f.after(); }
    }
    if (!this.current && this.queue.length && !this.fade) {
      this.current = this.queue.shift();
      this.startEvent(false);
    }
    if (this.current && this.eventDone()) this.current = null;
    this.garage.speed = 1 + Math.min(1.5, this.queue.length * 0.5);
    if (this.view === 'track') this.track.update(dt);
    else this.garage.update(dt);
    // motor
    const a = this.deps.audio;
    if (this.view === 'track' && this.race !== 'empty') a.engineUpdate(this.race === 'won' ? 0.6 : 1, this.track.speed / this.track.cruise);
    else a.engineOff();
    this.emitState();
    if (this.visible && !document.hidden) this.renderFrame(dt);
  }

  renderFrame(dt) {
    const { ctx, w, h } = this;
    if (!ctx) return;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    const team = this.deps.getTeam();
    const t = this.deps.t;
    const others = TEAMS.filter(x => x.id !== team.id);
    const env = {
      dt, t,
      livery: team.livery,
      accent: team.ui,
      accentInk: team.ink,
      rivalLivery: id => others[id % others.length].livery,
      pos: this.model.position,
      lapText: t('c_lap', { done: this.model.done, total: this.model.total }),
      goText: t('c_go'),
      winnerText: t('c_winner'),
      circuitName: this.deps.getCircuitName ? this.deps.getCircuitName() : '',
      backmarker: this.track.backmarker
    };
    if (this.view === 'track') this.track.render(ctx, w, h, env);
    else this.garage.render(ctx, w, h, env);
    if (this.fade) {
      const f = this.fade, k = f.t < f.dur ? f.t / f.dur : 2 - f.t / f.dur;
      ctx.fillStyle = `rgba(5,6,9,${Math.max(0, Math.min(1, k))})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
