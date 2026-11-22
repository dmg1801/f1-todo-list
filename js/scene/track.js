// Pista pseudo-3D con cámara de persecución.
// Una única geometría (centerX acumulado por curvatura) sirve para proyectar
// el asfalto y para colocar y orientar los coches.
import { drawCarRear, drawCheckered } from './art.js';
import { getCircuit } from '../circuits.js';
import { drawBackdrop } from './backdrops.js';

const SEG = 200;        // longitud de segmento (mundo)
const ROAD = 2000;      // semiancho de la calzada
const CAM_H = 1000;     // altura de cámara
const CARW = 760;       // ancho del coche (mundo)
const NEAR = 60;
export const LANE = 0.45;
const GAP_K = [1.2, 2.5, 4.0]; // huecos en múltiplos de la distancia cámara-coche

function buildCourse(plan) {
  const curves = [], tunnel = [];
  for (const [n, k, flag] of plan) {
    for (let i = 0; i < n; i++) {
      const e = Math.max(0, Math.min(1, i / 12, (n - 1 - i) / 12));
      curves.push(k * e);
      tunnel.push(flag === 'T' ? 1 : 0);
    }
  }
  return { curves, tunnel };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Track {
  constructor() {
    this.pos = 0;
    this.setCircuit(getCircuit('monaco'));
    this.speed = 5600;
    this.cruise = 5600;
    this.heading = 0;
    this.time = 0;
    this.player = { lane: LANE, target: LANE, vel: 0 };
    this.camX = 0;
    this.rivals = [];
    this.want = 0;
    this.ot = null;
    this.lights = null;
    this.victory = false;
    this.spawnCool = 0;
    this.rivalSeq = 0;
    this.PZ = 3400;
    this.farZ = 17000;
    this.xs = []; this.zs = [];
    this.frac = 0; this.base = 0;
    this.events = {};      // callbacks: onPass, onPull, onGo
    this.debug = { samples: [] };
  }

  gap(k) { return this.PZ * (k < GAP_K.length ? GAP_K[k] : GAP_K[GAP_K.length - 1] + (k - 2) * 1.2); }

  curve(i) { return this.curves[((i % this.N) + this.N) % this.N]; }
  isTunnel(i) { return this.tunnel[((i % this.N) + this.N) % this.N] === 1; }

  setCircuit(c) {
    this.circuit = c;
    this.theme = c.theme;
    const b = buildCourse(c.plan);
    this.curves = b.curves; this.tunnel = b.tunnel; this.N = b.curves.length;
    this.pos = this.pos % (this.N * SEG);
    this.heading = 0;
  }

  busy() { return !!this.ot || !!(this.lights && !this.lights.go); }

  setRivalCount(n) { this.want = Math.max(0, Math.min(3, n)); }

  // Coloca rivales directamente (sin animación), p. ej. al cargar o en modo estático.
  resetRivals(n) {
    this.want = Math.max(0, Math.min(3, n));
    this.rivals = [];
    this.ot = null;
    for (let k = 0; k < this.want; k++) this.rivals.push(this.makeRival(this.gap(k), k === 0 ? this.player.target : (k % 2 ? -this.player.target : this.player.target), 1));
  }

  makeRival(z, lane, alpha = 0) {
    return { id: ++this.rivalSeq, z, lane, laneGoal: lane, alpha, target: false, leaving: false, wob: Math.random() * 6 };
  }

  startLights() { this.lights = { t: 0, go: false, goT: 0, lit: 0 }; this.speed = 0; }

  overtake(count, mul = 1) {
    if (this.ot) { this.ot.left += count; this.ot.mul = Math.max(this.ot.mul, mul); return; }
    this.ot = { left: Math.max(1, Math.min(3, count)), phase: 'approach', mul };
  }

  setVictory(on) { this.victory = on; if (on) { this.ot = null; this.player.target = 0; } }

  update(dt) {
    this.time += dt;
    const p = this.player;
    let target = this.cruise;
    if (this.lights && !this.lights.go) target = 0;
    if (this.ot && this.ot.phase === 'pass') target = this.cruise * 1.15;
    if (this.victory) target = this.cruise * 0.7;
    this.braking = target < this.speed - 300;
    this.speed += (target - this.speed) * Math.min(1, dt * (target === 0 ? 4 : 1.3));
    this.pos += this.speed * dt;
    const seg = Math.floor(this.pos / SEG);
    this.heading += this.curve(seg) * this.speed * dt * 0.00003;

    const d = p.target - p.lane;
    p.vel = clamp(d * 4.5, -1.5, 1.5);
    p.lane += p.vel * dt;

    if (this.lights) {
      const L = this.lights;
      L.t += dt;
      const lit = Math.min(5, Math.floor(L.t / 0.6));
      if (!L.go && lit !== L.lit) { L.lit = lit; this.events.onLight && this.events.onLight(lit); }
      if (!L.go && L.t > 3.6) { L.go = true; this.events.onGo && this.events.onGo(); }
      if (L.go) { L.goT += dt; if (L.goT > 1.4) this.lights = null; }
    }
    this.updateRivals(dt);
  }

  updateRivals(dt) {
    const p = this.player;
    const rs = this.rivals;
    this.spawnCool -= dt;
    const ot = this.ot;
    let tgt = rs.find(r => r.target);
    if (ot && !tgt) {
      tgt = rs.filter(r => !r.leaving).sort((a, b) => a.z - b.z)[0];
      if (!tgt && !this.victory) {
        // sin rivales a la vista: aparece uno a lo lejos, en nuestro carril
        tgt = this.makeRival(Math.min(this.farZ * 0.55, this.gap(2)), p.target, 0);
        rs.push(tgt);
      }
      if (tgt) { tgt.target = true; ot.phase = 'approach'; }
      else this.ot = null;
    }
    if (ot && tgt) {
      if (ot.phase === 'approach') {
        tgt.z += (this.gap(0) - tgt.z) * Math.min(1, dt * 1.8 * ot.mul);
        tgt.alpha = Math.min(1, tgt.alpha + dt * 2);
        if (Math.abs(tgt.z - this.gap(0)) < 350) {
          ot.phase = 'pull';
          tgt.laneLock = true;
          p.target = tgt.lane > 0 ? -LANE : LANE;
          this.events.onPull && this.events.onPull();
        }
      } else if (ot.phase === 'pull') {
        tgt.z -= 350 * dt * ot.mul;
        if (Math.abs(p.lane - p.target) < 0.06) { ot.phase = 'pass'; this.events.onPass && this.events.onPass(); }
      } else if (ot.phase === 'pass') {
        tgt.z -= 3800 * ot.mul * dt;
        // el rival se queda atrás y sale de plano antes de retirarlo
        if (tgt.z < -this.PZ * 0.82) {
          rs.splice(rs.indexOf(tgt), 1);
          ot.left -= 1;
          this.events.onPassed && this.events.onPassed();
          if (ot.left <= 0) this.ot = null;
          else ot.phase = 'approach';
        }
      }
    }
    // resto de rivales: huecos por orden de distancia
    const others = rs.filter(r => !r.target && !r.leaving).sort((a, b) => a.z - b.z);
    const offset = tgt ? 1 : 0;
    others.forEach((r, k) => {
      const slot = k + offset;
      const goal = this.gap(slot);
      r.z += (goal + Math.sin(this.time * 0.7 + r.wob) * 120 - r.z) * Math.min(1, dt * 0.55);
      r.alpha = Math.min(1, r.alpha + dt * 0.8);
      if (!r.laneLock && r.z > this.gap(0) * 1.4) {
        r.laneGoal = slot === 0 ? p.target : (slot % 2 ? -p.target : p.target);
        r.lane += (r.laneGoal - r.lane) * Math.min(1, dt * 0.9);
      }
    });
    // ajustar número de rivales delante
    const active = rs.filter(r => !r.leaving).length;
    const passing = ot && ot.phase === 'pass';
    if (active < this.want && !passing && this.spawnCool <= 0 && !this.victory) {
      const far = this.farZ - this.PZ - 400;
      rs.push(this.makeRival(far, -p.target, 0));
      this.spawnCool = 0.8;
    } else if (active > this.want && !ot) {
      const farthest = rs.filter(r => !r.leaving).sort((a, b) => b.z - a.z)[0];
      if (farthest) farthest.leaving = true;
    }
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      if (r.leaving) {
        r.z += 5000 * dt;
        r.alpha = Math.max(0, r.alpha - dt * 0.8);
        if (r.z > this.farZ || r.alpha <= 0) rs.splice(i, 1);
      }
    }
  }

  // Centro de la calzada (mundo) en una profundidad z relativa a la cámara.
  wx(z) {
    const u = (z + this.frac * SEG) / SEG;
    const i = clamp(Math.floor(u), 0, this.xs.length - 2);
    const t = clamp(u - i, 0, 1);
    return this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t;
  }

  // Pendiente dx/dz de la curva en z: tangente usada para el giro de cada coche.
  slope(z) { return (this.wx(z + 300) - this.wx(z)) / 300; }

  yawAt(z, laneVel = 0) { return clamp(Math.atan(this.slope(z)) * 0.55 + laneVel * 0.14, -0.28, 0.28); }

  render(ctx, w, h, env) {
    const f = w * 0.95;
    const horizon = h * 0.4;
    this.PZ = f * CAM_H / (h * 0.47);
    const count = w < 520 ? 85 : 130;
    this.farZ = count * SEG;
    this.base = Math.floor(this.pos / SEG);
    this.frac = (this.pos % SEG) / SEG;
    // geometría compartida
    const xs = this.xs, zs = this.zs;
    xs.length = zs.length = 0;
    let x = 0, dx = -this.curve(this.base) * this.frac;
    for (let i = 0; i <= count; i++) {
      zs.push(i * SEG - this.frac * SEG);
      xs.push(x);
      x += dx;
      dx += this.curve(this.base + i);
    }
    const p = this.player;
    const camTarget = this.wx(this.PZ) + p.lane * ROAD * 0.55;
    this.camX += (camTarget - this.camX) * Math.min(1, (env.dt || 1) * 6);
    if (!env.dt) this.camX = camTarget;
    const proj = (z, wx) => { const s = f / z; return { X: w / 2 + (wx - this.camX) * s, Y: horizon + CAM_H * s, s }; };

    const th = this.theme;
    // cielo y paisaje del circuito
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.6, th.sky[1]); sky.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon + 2);
    drawBackdrop(this.circuit.id, ctx, w, h, horizon, this.heading, this.time);
    ctx.fillStyle = th.ground[0]; ctx.fillRect(0, horizon, w, h - horizon);
    if (th.stands) {
      const gh = Math.max(4, h * 0.028);
      ctx.fillStyle = '#1b1e2a'; ctx.fillRect(0, horizon - gh, w, gh + 2);
      const crowd = ['#e8e8e8', '#ff5a5f', '#ffd84a', '#4f95ff', env.accent];
      for (let k = 0; k < 90; k++) {
        const px = ((k * 23.7 - this.heading * 60 * w / 600) % w + w) % w;
        ctx.fillStyle = crowd[k % crowd.length];
        ctx.fillRect(px, horizon - gh + 1 + (k % 3) * gh * 0.28, 2, 2);
      }
    }

    // asfalto, pianos, muros, túneles y hierba (de lejos a cerca)
    const WALL_H = 420, CEIL_H = 2300, WALL_X = 1.2, TUN_X = 1.26;
    const sprites = [];
    for (let i = count - 1; i >= 0; i--) {
      let z1 = zs[i], z2 = zs[i + 1], x1 = xs[i], x2 = xs[i + 1];
      if (z2 <= NEAR) continue;
      if (z1 < NEAR) { const t = (NEAR - z1) / (z2 - z1); x1 = x1 + (x2 - x1) * t; z1 = NEAR; }
      const a = proj(z1, x1), b = proj(z2, x2);
      const idx = this.base + i;
      const alt = Math.floor(idx / 2) % 2;
      const tun = this.isTunnel(idx);
      const hwA = ROAD * a.s, hwB = ROAD * b.s;
      const poly4 = (pts, col) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.closePath(); ctx.fill();
      };
      const quad = (hw1, hw2, col) => poly4([a.X - hw1, a.Y, a.X + hw1, a.Y, b.X + hw2, b.Y, b.X - hw2, b.Y], col);
      if (!tun) {
        const top = Math.max(b.Y, horizon);
        ctx.fillStyle = th.ground[alt];
        ctx.fillRect(0, top, w, a.Y - top + 1);
      }
      quad(hwA * 1.16, hwB * 1.16, th.kerb[alt]);
      quad(hwA, hwB, tun ? (alt ? '#2a2c31' : '#27292e') : th.road[alt]);
      if (((idx % this.N) + this.N) % this.N === 8) {
        // línea de meta a cuadros
        const rows = 2, cols = 12;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 ? '#111' : '#eee';
          const t0 = r / rows, t1 = (r + 1) / rows;
          const yA = a.Y + (b.Y - a.Y) * t0, yB = a.Y + (b.Y - a.Y) * t1;
          const xA = a.X + (b.X - a.X) * t0, xB = a.X + (b.X - a.X) * t1;
          const wA = hwA + (hwB - hwA) * t0, wB = hwA + (hwB - hwA) * t1;
          const u0 = -1 + 2 * c / cols, u1 = -1 + 2 * (c + 1) / cols;
          ctx.beginPath(); ctx.moveTo(xA + wA * u0, yA); ctx.lineTo(xA + wA * u1, yA); ctx.lineTo(xB + wB * u1, yB); ctx.lineTo(xB + wB * u0, yB); ctx.closePath(); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const ew = hwA * 0.025, ewb = hwB * 0.025;
        ctx.beginPath();
        ctx.moveTo(a.X - hwA * 0.96, a.Y); ctx.lineTo(a.X - hwA * 0.96 + ew, a.Y); ctx.lineTo(b.X - hwB * 0.96 + ewb, b.Y); ctx.lineTo(b.X - hwB * 0.96, b.Y); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(a.X + hwA * 0.96, a.Y); ctx.lineTo(a.X + hwA * 0.96 - ew, a.Y); ctx.lineTo(b.X + hwB * 0.96 - ewb, b.Y); ctx.lineTo(b.X + hwB * 0.96, b.Y); ctx.closePath(); ctx.fill();
        if (alt) quad(hwA * 0.012, hwB * 0.012, 'rgba(255,255,255,0.6)');
      }
      if (tun) {
        // túnel: paredes, techo y luces
        const cA = a.Y - CEIL_H * a.s, cB = b.Y - CEIL_H * b.s;
        const lA = a.X - hwA * TUN_X, rA = a.X + hwA * TUN_X, lB = b.X - hwB * TUN_X, rB = b.X + hwB * TUN_X;
        poly4([lA, a.Y, lB, b.Y, lB, cB, lA, cA], alt ? '#3a3c44' : '#35373f');
        poly4([rA, a.Y, rB, b.Y, rB, cB, rA, cA], alt ? '#3a3c44' : '#35373f');
        poly4([lA, cA, rA, cA, rB, cB, lB, cB], alt ? '#2a2b31' : '#26272c');
        if (idx % 3 === 0) {
          const lw = hwA * 0.25;
          poly4([a.X - lw, cA, a.X + lw, cA, b.X + lw * 0.9, cB, b.X - lw * 0.9, cB], 'rgba(255,240,200,0.9)');
        }
        // fachada en la boca del túnel
        if (!this.isTunnel(idx - 1)) {
          const fTop = a.Y - CEIL_H * 1.9 * a.s;
          ctx.fillStyle = '#4a4d55';
          ctx.fillRect(0, fTop, Math.max(0, lA), a.Y - fTop);
          ctx.fillRect(rA, fTop, Math.max(0, w - rA), a.Y - fTop);
          ctx.fillRect(lA, fTop, rA - lA, cA - fTop);
          ctx.fillStyle = th.walls ? th.walls.stripe : env.accent;
          ctx.fillRect(lA, cA - 120 * a.s, rA - lA, 120 * a.s);
        }
      } else if (th.walls) {
        // muros de un circuito urbano
        const top = WALL_H;
        const lA = a.X - hwA * WALL_X, lB = b.X - hwB * WALL_X, rA = a.X + hwA * WALL_X, rB = b.X + hwB * WALL_X;
        const col = th.walls.color[alt];
        poly4([lA, a.Y, lB, b.Y, lB, b.Y - top * b.s, lA, a.Y - top * a.s], col);
        poly4([rA, a.Y, rB, b.Y, rB, b.Y - top * b.s, rA, a.Y - top * a.s], col);
        const st = th.walls.stripe, sw = 70;
        poly4([lA, a.Y - top * a.s, lB, b.Y - top * b.s, lB, b.Y - (top - sw) * b.s, lA, a.Y - (top - sw) * a.s], st);
        poly4([rA, a.Y - top * a.s, rB, b.Y - top * b.s, rB, b.Y - (top - sw) * b.s, rA, a.Y - (top - sw) * a.s], st);
      }
      if (!tun && idx % 6 === 0 && zs[i] > NEAR) sprites.push({ kind: 'lamp', z: zs[i], side: (idx / 6) % 2 ? 1 : -1 });
      if (!tun && idx % 45 === 0 && zs[i] > NEAR) sprites.push({ kind: 'board', z: zs[i], side: (idx / 45) % 2 ? -1 : 1 });
    }

    // coches
    const cars = [];
    for (const r of this.rivals) {
      const z = this.PZ + r.z;
      if (z < NEAR * 3 || z > this.farZ - SEG) continue;
      const fadeFar = clamp((this.farZ - z) / (this.farZ * 0.2), 0, 1);
      cars.push({ kind: 'car', z, lane: r.lane, vel: 0, livery: env.rivalLivery(r.id), alpha: r.alpha * fadeFar, blue: env.backmarker && r.target });
    }
    cars.push({ kind: 'car', z: this.PZ, lane: p.lane, vel: p.vel, livery: env.livery, alpha: 1, player: true });
    const all = sprites.concat(cars).sort((a, b) => b.z - a.z);
    const samples = [];
    for (const s of all) {
      if (s.kind === 'lamp' || s.kind === 'board') {
        const q = proj(s.z, this.wx(s.z) + s.side * ROAD * (th.walls ? 1.24 : 1.45));
        if (s.kind === 'lamp') {
          const hh = 2600 * q.s, pw = Math.max(1, 50 * q.s);
          ctx.fillStyle = '#555b66'; ctx.fillRect(q.X - pw / 2, q.Y - hh, pw, hh);
          ctx.fillStyle = th.lamp;
          ctx.fillRect(q.X - pw * 3, q.Y - hh, pw * 6, Math.max(1, pw * 1.2));
          if (th.night) {
            ctx.globalAlpha = 0.16; ctx.fillStyle = th.lamp;
            ctx.beginPath(); ctx.arc(q.X, q.Y - hh, pw * 9, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else {
          const bw = 1500 * q.s, bh = 500 * q.s;
          if (bw > 6) {
            ctx.fillStyle = env.accent; ctx.fillRect(q.X - bw / 2, q.Y - bh - 300 * q.s, bw, bh);
            if (bw > 40) {
              ctx.fillStyle = env.accentInk; ctx.font = `800 ${Math.round(bh * 0.32)}px system-ui, sans-serif`;
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('F1 TO-DO-LIST', q.X, q.Y - bh / 2 - 300 * q.s);
            }
          }
        }
        continue;
      }
      const lx = this.wx(s.z) + s.lane * ROAD;
      const q = proj(s.z, lx);
      const yaw = this.yawAt(s.z, s.vel);
      drawCarRear(ctx, q.X, q.Y, CARW * q.s, yaw, s.livery, { alpha: s.alpha, brake: s.player ? this.braking : false, phase: this.pos / 260, blueFlag: s.blue });
      samples.push({ player: !!s.player, z: s.z, X: q.X, yaw, slope: this.slope(s.z) });
    }
    this.debug.samples = samples;
    this.debug.curve = this.curve(this.base + Math.floor(this.PZ / SEG));
    this.debug.playerLane = p.lane;
    this.debug.rivals = this.rivals.map(r => ({ z: Math.round(r.z), lane: +r.lane.toFixed(2), target: r.target }));

    // HUD dibujado
    ctx.textBaseline = 'top';
    const fs = Math.max(12, Math.round(h * 0.06));
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(8, 8, fs * 3.2, fs * 1.4);
    ctx.fillStyle = env.accent; ctx.fillRect(8, 8, 4, fs * 1.4);
    ctx.fillStyle = '#fff'; ctx.fillText('P' + env.pos, 18, 8 + fs * 0.2);
    ctx.font = `700 ${Math.round(fs * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    const lap = env.lapText;
    const lw = ctx.measureText(lap).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(w - 8 - lw, 8, lw, fs * 1.1);
    ctx.fillStyle = '#fff'; ctx.fillText(lap, w - 16, 8 + fs * 0.25);
    if (env.circuitName) {
      ctx.font = `700 ${Math.round(fs * 0.5)}px system-ui, sans-serif`;
      const cn = env.circuitName.toUpperCase();
      const cw = ctx.measureText(cn).width + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(w - 8 - cw, 8 + fs * 1.2, cw, fs * 0.9);
      ctx.fillStyle = env.accent; ctx.fillRect(w - 8 - cw, 8 + fs * 1.2, 3, fs * 0.9);
      ctx.fillStyle = '#fff'; ctx.fillText(cn, w - 16, 8 + fs * 1.36);
    }

    // semáforo de salida
    if (this.lights) {
      const L = this.lights, r = Math.max(7, w * 0.022), gap = r * 2.6, cx = w / 2 - gap * 2, cy = h * 0.14;
      ctx.fillStyle = '#0b0b0b'; ctx.fillRect(cx - r * 1.6, cy - r * 1.6, gap * 4 + r * 3.2, r * 3.2);
      for (let k = 0; k < 5; k++) {
        const on = !L.go && k < L.lit;
        ctx.fillStyle = on ? '#ff1a1a' : '#2b0d0d';
        ctx.beginPath(); ctx.arc(cx + k * gap, cy, r, 0, Math.PI * 2); ctx.fill();
      }
      if (L.go) {
        ctx.fillStyle = '#39e27a'; ctx.textAlign = 'center';
        ctx.font = `900 ${Math.round(h * 0.11)}px system-ui, sans-serif`;
        ctx.fillText(env.goText, w / 2, cy + r * 2.4);
      }
    }
    // victoria
    if (this.victory) {
      const tt = this.time;
      drawCheckered(ctx, w * 0.06, h * 0.1, Math.min(w * 0.22, 150), tt);
      drawCheckered(ctx, w * 0.94 - Math.min(w * 0.22, 150), h * 0.1, Math.min(w * 0.22, 150), tt + 1);
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(h * 0.2)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('P1', w / 2 + 3, h * 0.12 + 3);
      ctx.fillStyle = '#ffd84a'; ctx.fillText('P1', w / 2, h * 0.12);
      ctx.font = `800 ${Math.round(h * 0.06)}px system-ui, sans-serif`;
      ctx.fillStyle = '#fff'; ctx.fillText(env.winnerText, w / 2, h * 0.12 + h * 0.21);
      for (let k = 0; k < 50; k++) {
        const px = (k * 73.7 + Math.sin(tt + k) * 20) % w;
        const py = ((k * 41.3 + tt * (60 + k % 5 * 20)) % (h * 0.9));
        ctx.fillStyle = ['#ffd84a', env.accent, '#ffffff', '#ff4d6d'][k % 4];
        ctx.fillRect(px, py, 4, 7);
      }
    }
  }
}
