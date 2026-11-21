// Garaje vivo en vista lateral: piloto, mecánicos, montaje y parada en boxes.
// Las secuencias son generadores: cada `yield` espera un fotograma.
import { drawCarSide, drawPerson, drawTyre, drawFrontWing, carGeometry, shade } from './art.js';

const STOCK_NEW = 0.05;
const STOCK_USED = 0.95;
const PREP = 0.87;

const DEFS = [
  // id, rol, fila (0 = fondo, 1 = delante), casa, femenino, piel
  ['D', 'driver', 1, 0.62, false, '#c98d68'],
  ['GF', 'tyre', 1, 0.77, true, '#e0ac82'],
  ['GR', 'crew', 1, 0.24, false, '#8d5a3b'],
  ['OF', 'crew', 0, 0.85, false, '#f1c7a5'],
  ['OR', 'crew', 0, 0.17, false, '#5c3a26'],
  ['NF', 'crew', 1, 0.1, false, '#b77b55'],
  ['NR', 'crew', 0, 0.12, true, '#f0d0b0'],
  ['WM', 'crew', 1, 0.92, false, '#7a4a30'],
  ['WN', 'track', 0, 0.07, false, '#d9a07a']
];

export class Garage {
  constructor() {
    this.time = 0; this.dt = 0; this.speed = 1;
    this.W = 800; this.H = 450;
    this.script = null; this.onDone = null;
    this.instant = false;
    this.hooks = { onSay() {}, sfx() {} };
    this.actors = {};
    for (const [id, role, row, home, female, skin] of DEFS) {
      this.actors[id] = { id, role, row, home, female, skin, x: home, face: 1, pose: 'stand', moving: false, walkPhase: 0, carry: null, helmet: false, tablet: role === 'driver', visible: true, speakUntil: 0 };
    }
    this.car = {};
    this.setup('empty');
  }

  // ---------- configuración de escenas ----------
  setup(kind) {
    this.kind = kind;
    this.script = null; this.onDone = null;
    this.stock = { newTyres: 6, usedTyres: 1, newWings: 1, usedWings: 0, prep: 0 };
    const c = this.car;
    Object.assign(c, { x: 0.5, lift: 0, wheelF: 'new', wheelR: 'new', wing: 'new', driverIn: false, brake: false, spin: 0 });
    for (const a of Object.values(this.actors)) {
      Object.assign(a, { x: a.home, pose: 'stand', moving: false, carry: null, helmet: false, visible: true, speakUntil: 0, face: a.home < 0.5 ? 1 : -1 });
    }
    const A = this.actors;
    if (kind === 'empty') {
      Object.assign(c, { lift: 1, wheelF: 'none', wheelR: 'none', wing: 'none' });
      this.script = this.idleEmpty();
    } else if (kind === 'parked') {
      this.script = this.all(this.idleParked(), this.ambient());
    } else if (kind === 'pitIn') {
      Object.assign(c, { x: -0.5, wheelF: 'old', wheelR: 'old', wing: 'old', driverIn: true });
      A.D.visible = false;
      for (const a of Object.values(A)) if (a.role !== 'driver') a.helmet = true;
    }
  }

  runAssembly(done) { this.kind = 'assembly'; this.onDone = done; this.script = this.assembly(); if (this.instant) this.finishInstant(); }
  runPit(done) { this.setup('pitIn'); this.kind = 'pit'; this.onDone = done; this.script = this.pit(); if (this.instant) this.finishInstant(); }

  finishInstant() {
    if (this.kind !== 'assembly' && this.kind !== 'pit') return;
    const prev = this.instant; this.instant = true;
    let n = 0;
    while (this.script && n++ < 20000) { this.dt = 0.25; this.time += 0.25; if (this.script.next().done) this.finishScript(); }
    this.instant = prev;
  }

  finishScript() {
    this.script = null;
    const cb = this.onDone; this.onDone = null;
    cb && cb();
  }

  update(dt) {
    this.dt = dt * this.speed;
    this.realDt = dt;
    this.time += dt;
    if (this.script && this.script.next().done) this.finishScript();
    for (const a of Object.values(this.actors)) if (a.moving) a.walkPhase += dt * 9 * this.speed;
  }

  // ---------- geometría ----------
  carLen() { return Math.min(this.W * 0.6, this.H * 1.25); }
  geo() {
    const L = this.carLen() / this.W, x = this.car.x;
    return { fx: x + 0.31 * L, rx: x - 0.33 * L, nx: x + 0.47 * L, cx: x - 0.02 * L };
  }

  // ---------- primitivas de guion ----------
  *wait(s) { let t = 0; while (t < s) { t += this.dt; yield; } }
  *all(...gens) {
    let list = gens;
    while (list.length) { list = list.filter(g => !g.next().done); if (list.length) yield; }
  }
  *seq(...gens) { for (const g of gens) yield* g; }
  *walk(a, x, mul = 1) {
    a.moving = true; a.pose = 'walk';
    while (true) {
      const d = x - a.x;
      if (Math.abs(d) < 0.003) { a.x = x; break; }
      a.face = d > 0 ? 1 : -1;
      a.x += Math.sign(d) * Math.min(Math.abs(d), 0.42 * mul * this.dt);
      yield;
    }
    a.moving = false; a.pose = 'stand';
  }
  *face(a, x) { a.face = x >= a.x ? 1 : -1; }
  *work(a, s, gun = true) {
    a.pose = 'work'; a.tool = gun ? 'gun' : 'wrench';
    if (!this.instant) this.hooks.sfx(gun ? 'gun' : 'tool');
    yield* this.wait(s);
    a.pose = 'stand';
  }
  *kneel(a, s) { a.pose = 'kneel'; yield* this.wait(s); a.pose = 'stand'; }
  *pose(a, p, s) { a.pose = p; yield* this.wait(s); a.pose = 'stand'; }
  *say(a, key, hold = 2.6, voice = false) {
    if (this.instant) return;
    a.speakUntil = this.time + hold;
    this.hooks.onSay(a.role, key, voice);
    let t = 0; while (t < hold) { t += this.realDt || this.dt; yield; }
  }
  *pick(a, item) {
    a.carry = item;
    if (item === 'tyreNew') this.stock.newTyres = Math.max(0, this.stock.newTyres - 1);
    if (item === 'wingNew') this.stock.newWings = Math.max(0, this.stock.newWings - 1);
    yield* this.wait(0.25);
  }
  *dropUsed(a) {
    if (a.carry === 'tyreOld') this.stock.usedTyres++;
    if (a.carry === 'wingOld') this.stock.usedWings++;
    a.carry = null;
    yield* this.wait(0.2);
  }
  *mount(a, which) {
    a.carry = null;
    if (which === 'W') this.car.wing = 'new';
    else this.car['wheel' + which] = 'new';
    if (!this.instant) this.hooks.sfx('tool');
    yield* this.wait(0.2);
  }
  *liftTo(v, s) {
    const from = this.car.lift; let t = 0;
    while (t < s) { t += this.dt; this.car.lift = from + (v - from) * Math.min(1, t / s); yield; }
    this.car.lift = v;
  }
  *carTo(x, dur, ease) {
    const c = this.car, from = c.x; let t = 0;
    while (t < dur) {
      t += this.dt;
      const u = Math.min(1, t / dur);
      const e = ease === 'out' ? 1 - Math.pow(1 - u, 3) : u * u;
      const prev = c.x;
      c.x = from + (x - from) * e;
      c.spin += (c.x - prev) * 60;
      c.brake = ease === 'out' && u > 0.45 && u < 1;
      yield;
    }
    c.x = x; c.brake = false;
  }
  *home(a) { yield* this.walk(a, a.home); a.face = a.home < 0.5 ? 1 : -1; }

  // ---------- guiones ----------
  *idleEmpty() {
    const A = this.actors;
    while (true) {
      yield* this.wait(0.8);
      yield* this.say(A.WN, 'e1', 2.8);
      yield* this.all(this.seq(this.walk(A.GF, STOCK_NEW + 0.05), this.kneel(A.GF, 1.4)), this.seq(this.walk(A.D, 0.72), this.pose(A.D, 'check', 1.6)));
      yield* this.say(A.GF, 'e2', 2.6);
      yield* this.all(this.home(A.GF), this.seq(this.walk(A.D, 0.32), this.pose(A.D, 'check', 1.4), this.home(A.D)));
      yield* this.wait(1.5);
    }
  }

  *idleParked() {
    const A = this.actors;
    while (true) {
      const g = this.geo();
      yield* this.all(
        this.walk(A.D, g.nx - 0.02),
        this.seq(this.walk(A.GF, g.fx + 0.05), this.face(A.GF, g.fx)),
        this.walk(A.WN, g.nx + 0.05)
      );
      A.D.face = 1; A.D.pose = 'check'; A.GF.pose = 'kneel';
      yield* this.say(A.D, 'd1', 2.6);
      yield* this.say(A.GF, 'd2', 2.8);
      A.WN.face = -1;
      yield* this.say(A.WN, 'd3', 3);
      A.D.pose = 'stand'; A.GF.pose = 'stand';
      yield* this.all(
        this.seq(this.walk(A.WN, STOCK_NEW + 0.03), this.pick(A.WN, 'tyreNew'), this.walk(A.WN, PREP), this.place(A.WN)),
        this.seq(this.walk(A.D, g.cx + 0.03), this.face(A.D, g.cx), this.pose(A.D, 'point', 1.2))
      );
      A.D.pose = 'check';
      yield* this.say(A.D, 'd4', 2.6);
      A.D.pose = 'stand';
      yield* this.say(A.GF, 'd5', 2.6);
      yield* this.all(
        this.seq(this.walk(A.D, g.rx - 0.05), this.pose(A.D, 'check', 1.2)),
        this.home(A.GF),
        this.seq(this.walk(A.WN, PREP), this.unplace(A.WN), this.walk(A.WN, STOCK_NEW + 0.03), this.restock(A.WN), this.home(A.WN))
      );
      yield* this.home(A.D);
    }
  }
  *place(a) { a.carry = null; this.stock.prep++; yield* this.wait(0.3); }
  *unplace(a) { this.stock.prep = Math.max(0, this.stock.prep - 1); a.carry = 'tyreNew'; yield* this.wait(0.3); }
  *restock(a) { a.carry = null; this.stock.newTyres++; yield* this.wait(0.3); }

  *ambient() {
    const A = this.actors;
    while (true) {
      const g = this.geo();
      yield* this.all(this.seq(this.walk(A.GR, g.rx - 0.05), this.work(A.GR, 1.0, false)), this.seq(this.wait(1.5), this.walk(A.OR, 0.3), this.pose(A.OR, 'point', 1.2)));
      yield* this.wait(2);
      yield* this.all(this.home(A.GR), this.home(A.OR), this.seq(this.walk(A.OF, STOCK_USED - 0.04), this.kneel(A.OF, 1.2), this.home(A.OF)));
      yield* this.wait(3);
    }
  }

  *assembly() {
    const A = this.actors, g = this.geo();
    for (const a of Object.values(A)) if (a.role !== 'driver') a.helmet = false;
    yield* this.all(
      this.say(A.WN, 'a1', 2.2, true),
      this.walk(A.GF, g.fx + 0.06), this.walk(A.GR, g.rx - 0.06),
      this.seq(this.walk(A.NF, STOCK_NEW), this.pick(A.NF, 'tyreNew'), this.walk(A.NF, g.fx)),
      this.seq(this.walk(A.NR, STOCK_NEW + 0.02), this.pick(A.NR, 'tyreNew'), this.walk(A.NR, g.rx)),
      this.seq(this.walk(A.WN, STOCK_NEW + 0.01), this.pick(A.WN, 'wingNew'), this.walk(A.WN, g.nx + 0.04)),
      this.walk(A.D, 0.9)
    );
    A.GF.face = -1; A.GR.face = 1; A.WN.face = -1;
    yield* this.all(this.mount(A.NF, 'F'), this.mount(A.NR, 'R'));
    yield* this.all(this.work(A.GF, 0.8), this.work(A.GR, 0.8), this.walk(A.NF, g.fx - 0.09), this.walk(A.NR, g.rx + 0.09));
    yield* this.all(this.say(A.GF, 'a2', 1.7, true), this.mount(A.WN, 'W'), this.work(A.WN, 0.7, false));
    yield* this.all(this.say(A.GR, 'a3', 1.7, true), this.home(A.NF), this.home(A.NR));
    yield* this.all(
      this.say(A.WN, 'a4', 2, true),
      this.home(A.GF), this.home(A.GR), this.home(A.WN),
      this.seq(this.walk(A.D, g.cx), this.enter(A.D))
    );
    yield* this.all(this.say(A.D, 'a5', 2, true), this.seq(this.wait(0.6), this.liftTo(0, 0.5)));
    if (!this.instant) this.hooks.sfx('engine');
    yield* this.carTo(1.6, 1.6, 'in');
  }
  *enter(a) { a.visible = false; this.car.driverIn = true; yield* this.wait(0.3); }

  *pit() {
    const A = this.actors, c = this.car;
    if (!this.instant) this.hooks.sfx('engine');
    yield* this.all(this.carTo(0.5, 2, 'out'), this.seq(this.wait(1.1), this.say(A.WN, 'p1', 1.8, true)));
    const g = this.geo();
    yield* this.all(
      this.liftTo(1, 0.35),
      this.walk(A.GF, g.fx + 0.06), this.walk(A.GR, g.rx - 0.06),
      this.walk(A.OF, g.fx + 0.02), this.walk(A.OR, g.rx - 0.01),
      this.seq(this.walk(A.NF, STOCK_NEW), this.pick(A.NF, 'tyreNew'), this.walk(A.NF, g.fx - 0.1)),
      this.seq(this.walk(A.NR, STOCK_NEW + 0.02), this.pick(A.NR, 'tyreNew'), this.walk(A.NR, g.rx + 0.1)),
      this.walk(A.WM, g.nx + 0.05),
      this.seq(this.walk(A.WN, STOCK_NEW + 0.01), this.pick(A.WN, 'wingNew'), this.walk(A.WN, g.nx - 0.12))
    );
    A.GF.face = -1; A.GR.face = 1; A.WM.face = -1;
    // retirar piezas usadas
    yield* this.all(this.work(A.GF, 0.7), this.work(A.GR, 0.7), this.work(A.WM, 0.7, false));
    c.wheelF = 'none'; A.OF.carry = 'tyreOld';
    c.wheelR = 'none'; A.OR.carry = 'tyreOld';
    c.wing = 'none'; A.WM.carry = 'wingOld';
    yield* this.all(
      this.say(A.GF, 'p2', 1.8, true),
      this.seq(this.walk(A.OF, STOCK_USED), this.dropUsed(A.OF)),
      this.seq(this.walk(A.OR, STOCK_USED - 0.03), this.dropUsed(A.OR)),
      this.seq(this.wait(0.5), this.walk(A.NF, g.fx), this.mount(A.NF, 'F'), this.walk(A.NF, g.fx - 0.1)),
      this.seq(this.wait(0.7), this.walk(A.NR, g.rx), this.mount(A.NR, 'R'), this.walk(A.NR, g.rx + 0.1)),
      this.seq(this.walk(A.WM, STOCK_USED - 0.06), this.dropUsed(A.WM)),
      this.seq(this.wait(0.9), this.walk(A.WN, g.nx + 0.02), this.mount(A.WN, 'W'))
    );
    A.WN.face = -1;
    yield* this.all(this.say(A.GF, 'p3', 1.8, true), this.work(A.GF, 0.7), this.work(A.GR, 0.7), this.work(A.WN, 0.7, false));
    yield* this.all(this.say(A.WN, 'p4', 1.8, true), this.liftTo(0, 0.35), ...['GF', 'GR', 'OF', 'OR', 'NF', 'NR', 'WM', 'WN'].map(k => this.home(A[k])));
    yield* this.say(A.D, 'p5', 2, true);
    if (!this.instant) this.hooks.sfx('engine');
    yield* this.carTo(1.6, 1.5, 'in');
  }

  // ---------- dibujo ----------
  render(ctx, w, h, env) {
    this.W = w; this.H = h;
    this.livery = env.livery;
    const L = env.livery, t = this.time;
    const floorY = h * 0.8;
    // pared
    const wall = ctx.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, '#14171d'); wall.addColorStop(1, '#262b34');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, w, floorY);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(w * k / 8, 0); ctx.lineTo(w * k / 8, floorY); ctx.stroke(); }
    // luces del techo
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = 'rgba(230,240,255,0.85)';
      ctx.fillRect(w * (0.12 + k * 0.22), 0, w * 0.12, Math.max(3, h * 0.012));
      const gl = ctx.createLinearGradient(0, 0, 0, h * 0.25);
      gl.addColorStop(0, 'rgba(200,220,255,0.10)'); gl.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(w * (0.08 + k * 0.22), 0, w * 0.2, h * 0.25);
    }
    // franja de la escudería
    ctx.fillStyle = env.accent; ctx.fillRect(0, h * 0.44, w, Math.max(3, h * 0.018));
    ctx.fillStyle = L.second; ctx.fillRect(0, h * 0.44 + Math.max(3, h * 0.018), w, Math.max(2, h * 0.008));
    // pantallas de telemetría
    const sw = w * 0.15, sh = h * 0.17;
    ctx.font = `700 ${Math.max(9, Math.round(h * 0.03))}px system-ui, sans-serif`;
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(env.t('c_tele'), w * 0.25, h * 0.085);
    for (let k = 0; k < 3; k++) {
      const sx = w * (0.25 + k * 0.17), sy = h * 0.1;
      ctx.fillStyle = '#05070a'; ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#3a404b'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, sh);
      ctx.strokeStyle = k === 1 ? env.accent : (k ? '#ffcf3a' : '#46e08a'); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const px = sx + 4 + (sw - 8) * i / 24;
        const py = sy + sh * 0.55 + Math.sin(i * 0.7 + t * (1.5 + k) + k) * sh * 0.22 + Math.sin(i * 1.9 + t * 3) * sh * 0.06;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 4; i++) ctx.fillRect(sx + 4, sy + 4 + i * (sh * 0.09), sw * (0.2 + 0.1 * ((i + k) % 3)), Math.max(1, sh * 0.04));
    }
    // panel de herramientas
    const tx = w * 0.8, ty = h * 0.08, tw = w * 0.16, th = h * 0.28;
    ctx.fillStyle = '#30353f'; ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) ctx.fillRect(tx + 4 + i * tw / 6, ty + 4 + j * th / 8, 2, 2);
    ctx.strokeStyle = '#c3c8cf'; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const wx = tx + tw * (0.12 + i * 0.18), len = th * (0.45 + (i % 3) * 0.12);
      ctx.lineWidth = Math.max(2, w * 0.005);
      ctx.beginPath(); ctx.moveTo(wx, ty + th * 0.15); ctx.lineTo(wx, ty + th * 0.15 + len); ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, ty + th * 0.13, w * 0.008, 0.3, Math.PI * 2 - 0.3); ctx.stroke();
    }
    ctx.fillStyle = '#d33'; ctx.fillRect(tx + tw * 0.05, ty + th * 0.82, tw * 0.9, th * 0.1);
    // suelo
    const fl = ctx.createLinearGradient(0, floorY, 0, h);
    fl.addColorStop(0, '#30343c'); fl.addColorStop(1, '#1b1e23');
    ctx.fillStyle = fl; ctx.fillRect(0, floorY, w, h - floorY);
    // marcas del box
    ctx.strokeStyle = '#e8c31a'; ctx.lineWidth = Math.max(2, h * 0.008);
    ctx.strokeRect(w * 0.14, floorY + h * 0.03, w * 0.72, h * 0.15);
    const gm = this.geoAt(0.5);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, h * 0.01);
    [gm.fx, gm.rx].forEach(mx => { ctx.beginPath(); ctx.moveTo(mx * w, floorY + h * 0.01); ctx.lineTo(mx * w, floorY + h * 0.07); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(gm.fx * w - w * 0.025, floorY + h * 0.01); ctx.lineTo(gm.fx * w + w * 0.025, floorY + h * 0.01); ctx.stroke();
    ctx.fillStyle = 'rgba(232,195,26,0.8)';
    ctx.font = `900 ${Math.round(h * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(env.t('c_box'), w * 0.5, floorY + h * 0.12);
    // almacenes
    this.drawStack(ctx, STOCK_NEW * w, floorY, this.stock.newTyres, false, env.t('c_new'));
    this.drawStack(ctx, STOCK_USED * w, floorY, this.stock.usedTyres, true, env.t('c_used'));
    if (this.stock.prep > 0) this.drawStack(ctx, PREP * w, floorY, this.stock.prep, false, '');
    // alerón de repuesto en el soporte de pared
    const Lpx = this.carLen();
    ctx.fillStyle = '#4a505b'; ctx.fillRect(w * 0.015, h * 0.5, w * 0.11, h * 0.012);
    if (this.stock.newWings > 0) drawFrontWing(ctx, w * 0.02, h * 0.5, Lpx * 0.55, L, false);
    if (this.stock.usedWings > 0) drawFrontWing(ctx, w * 0.86, floorY - 2, Lpx * 0.5, L, true);

    // personas y coche
    const A = Object.values(this.actors);
    const ph = h * 0.3;
    const drawActor = a => {
      if (!a.visible) return;
      const row0 = a.row === 0;
      const y = row0 ? floorY - h * 0.05 : floorY + h * 0.07;
      const hh = row0 ? ph * 0.86 : ph;
      const C = a.role === 'driver'
        ? { shirt: L.body, pants: L.body === '#0b0b0c' ? '#1a1a1c' : shade(L.body, -0.25), trim: L.trim }
        : { shirt: a.role === 'track' ? L.second : L.body, pants: '#1b1e25', trim: L.trim };
      if (C.shirt === C.pants) C.pants = '#1b1e25';
      a.wingLivery = L;
      drawPerson(ctx, a, a.x * w, y, hh, C, t);
      a._head = { x: a.x * w, y: y - hh * 1.02 };
    };
    A.filter(a => a.row === 0).sort((p, q) => p.x - q.x).forEach(drawActor);
    const g = drawCarSide(ctx, this.car.x * w, floorY, Lpx, L, this.car);
    this._cockpit = g.cockpit;
    A.filter(a => a.row === 1).sort((p, q) => p.x - q.x).forEach(drawActor);
    // indicador de quién habla
    for (const a of A) {
      if (a.speakUntil > this.time) {
        const pos = a.visible ? a._head : { x: this._cockpit.x, y: this._cockpit.y - h * 0.04 };
        if (!pos) continue;
        const bob = Math.sin(this.time * 6) * h * 0.008;
        const s = Math.max(6, h * 0.025);
        ctx.fillStyle = env.accent;
        ctx.beginPath(); ctx.moveTo(pos.x - s, pos.y - s * 1.6 + bob); ctx.lineTo(pos.x + s, pos.y - s * 1.6 + bob); ctx.lineTo(pos.x, pos.y - s * 0.3 + bob); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = env.accent; ctx.lineWidth = 2;
        for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.arc(pos.x + s * 1.2, pos.y - s * 1.4 + bob, s * 0.6 * k, -0.9, 0.9); ctx.stroke(); }
      }
    }
  }

  geoAt(x) { const L = this.carLen() / this.W; return { fx: x + 0.31 * L, rx: x - 0.33 * L }; }

  drawStack(ctx, x, floorY, n, old, label) {
    const tw = this.W * 0.075, th = this.H * 0.032;
    for (let i = 0; i < Math.min(n, 8); i++) {
      const y = floorY - (i + 1) * th;
      ctx.fillStyle = old ? '#2c2723' : '#141414';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - tw / 2, y, tw, th - 1, th / 2); else ctx.rect(x - tw / 2, y, tw, th - 1);
      ctx.fill();
      ctx.fillStyle = old ? '#6e5148' : '#e10600';
      ctx.fillRect(x - tw / 2 + 3, y + th * 0.4, tw - 6, Math.max(1, th * 0.15));
    }
    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `800 ${Math.max(9, Math.round(this.H * 0.032))}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(label, Math.min(Math.max(x, this.W * 0.07), this.W * 0.93), floorY - Math.min(n, 8) * th - 4);
    }
  }
}

export { drawTyre };
