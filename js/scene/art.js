// Primitivas de dibujo: monoplaza (trasera y perfil), personas y bandera.

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// ---------- Monoplaza visto desde atrás (pista) ----------
// Proporciones de un F1 actual: ~2 m de ancho, ruedas traseras de 720 mm,
// alerón trasero a ~0,95 m. (cx, by) = centro inferior; w = ancho en píxeles.
// El coche no se inclina: `angle` (tangente de la curva) solo se usa para el reflejo.
export function drawCarRear(ctx, cx, by, w, angle, L, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(cx, by);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, -w * 0.006, w * 0.58, w * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(w, w);
  const dark = '#0e0f11';
  // borde del fondo plano
  ctx.fillStyle = dark;
  rr(ctx, -0.37, -0.055, 0.74, 0.035, 0.012); ctx.fill();
  // pontones
  ctx.fillStyle = shade(L.body, -0.14);
  ctx.beginPath();
  ctx.moveTo(-0.35, -0.05);
  ctx.bezierCurveTo(-0.35, -0.13, -0.27, -0.205, -0.12, -0.225);
  ctx.lineTo(0.12, -0.225);
  ctx.bezierCurveTo(0.27, -0.205, 0.35, -0.13, 0.35, -0.05);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = L.second; ctx.lineWidth = 0.022; ctx.lineCap = 'round';
  [-1, 1].forEach(sd => {
    ctx.beginPath(); ctx.moveTo(sd * 0.32, -0.085); ctx.bezierCurveTo(sd * 0.29, -0.15, sd * 0.21, -0.19, sd * 0.13, -0.198); ctx.stroke();
  });
  // cubierta del motor y toma de aire
  ctx.fillStyle = L.body;
  ctx.beginPath();
  ctx.moveTo(-0.155, -0.07);
  ctx.bezierCurveTo(-0.155, -0.2, -0.095, -0.37, -0.07, -0.465);
  ctx.quadraticCurveTo(0, -0.515, 0.07, -0.465);
  ctx.bezierCurveTo(0.095, -0.37, 0.155, -0.2, 0.155, -0.07);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.trim;
  ctx.beginPath();
  ctx.moveTo(-0.022, -0.1); ctx.lineTo(-0.012, -0.47); ctx.lineTo(0.012, -0.47); ctx.lineTo(0.022, -0.1);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.ellipse(0, -0.462, 0.03, 0.018, 0, 0, Math.PI * 2); ctx.fill();
  // retrovisores
  ctx.strokeStyle = dark; ctx.lineWidth = 0.012;
  [-1, 1].forEach(sd => {
    ctx.beginPath(); ctx.moveTo(sd * 0.1, -0.3); ctx.lineTo(sd * 0.24, -0.33); ctx.stroke();
    ctx.fillStyle = L.body; rr(ctx, sd > 0 ? 0.22 : -0.29, -0.355, 0.07, 0.035, 0.012); ctx.fill();
  });
  // estructura trasera y luz de lluvia
  ctx.fillStyle = dark;
  rr(ctx, -0.055, -0.205, 0.11, 0.1, 0.02); ctx.fill();
  ctx.fillStyle = o.brake ? '#ff3030' : '#7a1010';
  if (o.brake) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 0.25; }
  rr(ctx, -0.032, -0.19, 0.064, 0.03, 0.008); ctx.fill();
  ctx.shadowBlur = 0;
  // difusor
  ctx.fillStyle = '#09090a';
  ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(-0.26, -0.1); ctx.lineTo(0.26, -0.1); ctx.lineTo(0.3, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a2c31'; ctx.lineWidth = 0.008;
  [-0.18, -0.09, 0.09, 0.18].forEach(fx => { ctx.beginPath(); ctx.moveTo(fx * 1.08, -0.005); ctx.lineTo(fx, -0.095); ctx.stroke(); });
  // ruedas traseras
  const ph = ((o.phase || 0) % 1);
  [-1, 1].forEach(sd => {
    const x0 = sd * 0.405;
    ctx.fillStyle = '#121213';
    rr(ctx, x0 - 0.097, -0.365, 0.194, 0.365, 0.06); ctx.fill();
    ctx.fillStyle = '#1c1d1f';
    rr(ctx, x0 - 0.07, -0.35, 0.14, 0.335, 0.05); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.01;
    for (let k = 0; k < 5; k++) {
      const y = -0.34 + ((k + ph) % 5) * 0.067;
      ctx.beginPath(); ctx.moveTo(x0 - 0.07, y); ctx.lineTo(x0 + 0.07, y); ctx.stroke();
    }
    ctx.fillStyle = o.tyreBand || '#e10600';
    ctx.fillRect(x0 + sd * 0.088 - 0.006, -0.26, 0.012, 0.15);
  });
  // ala inferior (beam wing)
  ctx.fillStyle = dark;
  rr(ctx, -0.24, -0.25, 0.48, 0.022, 0.01); ctx.fill();
  // soporte "cuello de cisne"
  ctx.strokeStyle = dark; ctx.lineWidth = 0.014;
  [-0.04, 0.04].forEach(px => { ctx.beginPath(); ctx.moveTo(px, -0.44); ctx.lineTo(px * 0.7, -0.505); ctx.stroke(); });
  // placas laterales del alerón trasero
  ctx.fillStyle = L.second;
  [-1, 1].forEach(sd => {
    ctx.beginPath();
    ctx.moveTo(sd * 0.25, -0.24); ctx.lineTo(sd * 0.272, -0.24);
    ctx.lineTo(sd * 0.272, -0.5); ctx.quadraticCurveTo(sd * 0.272, -0.53, sd * 0.25, -0.528);
    ctx.closePath(); ctx.fill();
  });
  // plano principal y flap (DRS) con ligera curvatura
  ctx.fillStyle = L.body;
  ctx.beginPath();
  ctx.moveTo(-0.252, -0.452); ctx.quadraticCurveTo(0, -0.432, 0.252, -0.452);
  ctx.lineTo(0.252, -0.48); ctx.quadraticCurveTo(0, -0.46, -0.252, -0.48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.trim;
  ctx.beginPath();
  ctx.moveTo(-0.252, -0.49); ctx.quadraticCurveTo(0, -0.474, 0.252, -0.49);
  ctx.lineTo(0.252, -0.515); ctx.quadraticCurveTo(0, -0.5, -0.252, -0.515); ctx.closePath(); ctx.fill();
  if (o.blueFlag) {
    ctx.fillStyle = '#2b7bff';
    rr(ctx, -0.06, -0.6, 0.12, 0.05, 0.01); ctx.fill();
  }
  ctx.restore();
}

// ---------- Rueda vista de perfil (llanta de 18" con tapacubos) ----------
function drawWheel(ctx, x, y, r, state, spin) {
  if (state === 'none') {
    ctx.fillStyle = '#7a3a12';
    ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3d42';
    ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9ccd1';
    ctx.beginPath(); ctx.arc(x, y, r * 0.1, 0, Math.PI * 2); ctx.fill();
    return;
  }
  drawTyre(ctx, x, y, r, state === 'old', spin);
}

export function drawTyre(ctx, x, y, r, old, spin = 0) {
  ctx.fillStyle = old ? '#2c2723' : '#121213';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = old ? '#6e5148' : '#e10600';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.arc(x, y, r * 0.84, spin, spin + Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = old ? '#3c3936' : '#26292e';
  ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = old ? '#55524f' : '#4a4f57';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c9ccd1';
  ctx.beginPath(); ctx.arc(x, y, r * 0.12, 0, Math.PI * 2); ctx.fill();
  if (old) {
    ctx.fillStyle = 'rgba(120,100,90,0.7)';
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, r * 0.05, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- Alerón delantero (perfil): tres planos y placa final ----------
// (x, y) = extremo trasero inferior; s = longitud de referencia del coche en px.
export function drawFrontWing(ctx, x, y, s, L, old) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const main = old ? shade(L.body, -0.45) : L.body;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 2 ? (old ? '#555' : L.trim) : main;
    ctx.beginPath();
    const y0 = -0.002 - i * 0.0105, lift = i * 0.006;
    ctx.moveTo(0.012 + i * 0.012, y0);
    ctx.quadraticCurveTo(0.08, y0 - 0.004 - lift, 0.15, y0 - 0.01 - lift);
    ctx.lineTo(0.15, y0 - 0.017 - lift);
    ctx.quadraticCurveTo(0.08, y0 - 0.011 - lift, 0.012 + i * 0.012, y0 - 0.007);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = old ? '#444' : L.second;
  ctx.beginPath();
  if (old) { ctx.moveTo(0.12, 0); ctx.lineTo(0.16, 0); ctx.lineTo(0.16, -0.03); ctx.lineTo(0.145, -0.038); ctx.lineTo(0.13, -0.028); ctx.lineTo(0.12, -0.034); }
  else { ctx.moveTo(0.118, 0); ctx.lineTo(0.162, 0); ctx.lineTo(0.162, -0.042); ctx.quadraticCurveTo(0.16, -0.052, 0.145, -0.052); ctx.lineTo(0.118, -0.046); }
  ctx.closePath(); ctx.fill();
  if (old) {
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.003;
    ctx.beginPath(); ctx.moveTo(0.06, -0.006); ctx.lineTo(0.07, -0.016); ctx.lineTo(0.064, -0.022); ctx.lineTo(0.075, -0.03); ctx.stroke();
  }
  ctx.restore();
}

// ---------- Monoplaza de perfil (garaje). Morro a la derecha. ----------
// Proporciones reales: 5,6 m de largo, batalla de 3,6 m, ruedas de 720 mm, <1 m de alto.
export function carGeometry(x, gy, Lpx, lift = 0) {
  const y = gy - lift * Lpx * 0.035;
  const r = 0.064 * Lpx;
  return {
    y,
    front: { x: x + 0.3 * Lpx, y: y - r, r },
    rear: { x: x - 0.34 * Lpx, y: y - r, r },
    nose: { x: x + 0.5 * Lpx, y: y - 0.03 * Lpx },
    cockpit: { x: x - 0.02 * Lpx, y: y - 0.16 * Lpx }
  };
}

export function drawCarSide(ctx, x, gy, Lpx, L, st) {
  const g = carGeometry(x, gy, Lpx, st.lift || 0);
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(x, gy, Lpx * 0.54, Lpx * 0.022, 0, 0, Math.PI * 2); ctx.fill();
  // caballetes
  if ((st.lift || 0) > 0.05) {
    const h = gy - g.y;
    [g.front.x - Lpx * 0.06, g.rear.x + Lpx * 0.07].forEach(sx => {
      ctx.fillStyle = '#d9b21c';
      poly(ctx, [[sx - Lpx * 0.028, gy], [sx - Lpx * 0.01, g.y - Lpx * 0.025], [sx + Lpx * 0.01, g.y - Lpx * 0.025], [sx + Lpx * 0.028, gy]]); ctx.fill();
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(sx - Lpx * 0.018, gy - h * 0.55, Lpx * 0.036, Math.max(2, h * 0.15));
    });
  }
  ctx.save();
  ctx.translate(x, g.y); ctx.scale(Lpx, Lpx);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const dark = '#101113';
  // alerón trasero: placa lateral, planos y soporte
  ctx.strokeStyle = dark; ctx.lineWidth = 0.007;
  ctx.beginPath(); ctx.moveTo(-0.39, -0.1); ctx.quadraticCurveTo(-0.43, -0.12, -0.465, -0.162); ctx.stroke();
  ctx.fillStyle = L.second;
  ctx.beginPath();
  ctx.moveTo(-0.535, -0.06); ctx.lineTo(-0.452, -0.066); ctx.lineTo(-0.444, -0.168);
  ctx.quadraticCurveTo(-0.45, -0.18, -0.47, -0.18); ctx.lineTo(-0.535, -0.18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.trim;
  ctx.beginPath(); ctx.moveTo(-0.535, -0.12); ctx.lineTo(-0.45, -0.14); ctx.lineTo(-0.449, -0.15); ctx.lineTo(-0.535, -0.13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = L.body;
  ctx.beginPath(); ctx.ellipse(-0.49, -0.168, 0.045, 0.007, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.ellipse(-0.488, -0.075, 0.035, 0.005, -0.05, 0, Math.PI * 2); ctx.fill();
  // fondo plano y difusor
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(0.25, -0.012); ctx.lineTo(-0.43, -0.012); ctx.lineTo(-0.47, -0.048); ctx.lineTo(-0.43, -0.03); ctx.lineTo(0.23, -0.03);
  ctx.closePath(); ctx.fill();
  // carrocería principal
  ctx.fillStyle = L.body;
  ctx.beginPath();
  ctx.moveTo(0.505, -0.04);
  ctx.bezierCurveTo(0.45, -0.048, 0.36, -0.068, 0.24, -0.088);
  ctx.lineTo(0.1, -0.104);
  ctx.bezierCurveTo(0.075, -0.108, 0.06, -0.112, 0.05, -0.113);
  ctx.lineTo(-0.055, -0.113);
  ctx.bezierCurveTo(-0.065, -0.14, -0.075, -0.166, -0.095, -0.172);
  ctx.lineTo(-0.13, -0.172);
  ctx.bezierCurveTo(-0.2, -0.152, -0.3, -0.122, -0.42, -0.097);
  ctx.lineTo(-0.445, -0.078);
  ctx.lineTo(-0.432, -0.03);
  ctx.lineTo(0.24, -0.03);
  ctx.bezierCurveTo(0.33, -0.034, 0.42, -0.031, 0.505, -0.034);
  ctx.closePath(); ctx.fill();
  // aleta de tiburón
  ctx.fillStyle = shade(L.body, -0.12);
  ctx.beginPath(); ctx.moveTo(-0.14, -0.169); ctx.lineTo(-0.36, -0.13); ctx.lineTo(-0.385, -0.102); ctx.lineTo(-0.3, -0.118); ctx.closePath(); ctx.fill();
  // pontón con cintura (undercut)
  ctx.fillStyle = shade(L.body, -0.2);
  ctx.beginPath();
  ctx.moveTo(0.14, -0.058); ctx.lineTo(0.14, -0.098);
  ctx.bezierCurveTo(0.05, -0.103, -0.05, -0.1, -0.15, -0.086);
  ctx.bezierCurveTo(-0.25, -0.071, -0.33, -0.057, -0.4, -0.052);
  ctx.lineTo(-0.4, -0.032); ctx.lineTo(0.02, -0.032);
  ctx.bezierCurveTo(0.08, -0.034, 0.12, -0.044, 0.14, -0.058);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = L.second; ctx.lineWidth = 0.012;
  ctx.beginPath(); ctx.moveTo(0.12, -0.08); ctx.bezierCurveTo(0.02, -0.085, -0.12, -0.078, -0.3, -0.05); ctx.stroke();
  ctx.fillStyle = '#0a0a0b';
  rr(ctx, 0.128, -0.097, 0.016, 0.036, 0.006); ctx.fill();
  // líneas de ribete
  ctx.strokeStyle = L.trim; ctx.lineWidth = 0.006;
  ctx.beginPath(); ctx.moveTo(0.49, -0.043); ctx.bezierCurveTo(0.42, -0.054, 0.33, -0.07, 0.22, -0.086); ctx.lineTo(0.1, -0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.14, -0.16); ctx.bezierCurveTo(-0.22, -0.14, -0.31, -0.115, -0.415, -0.094); ctx.stroke();
  // cockpit, piloto y halo
  ctx.fillStyle = '#0b0b0c';
  rr(ctx, -0.056, -0.117, 0.106, 0.009, 0.004); ctx.fill();
  if (st.driverIn) {
    ctx.fillStyle = L.trim;
    ctx.beginPath(); ctx.arc(-0.02, -0.128, 0.022, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2633';
    rr(ctx, -0.006, -0.136, 0.026, 0.01, 0.004); ctx.fill();
  }
  ctx.strokeStyle = '#1b1c1f'; ctx.lineWidth = 0.008;
  ctx.beginPath(); ctx.moveTo(0.064, -0.11); ctx.bezierCurveTo(0.04, -0.152, -0.02, -0.155, -0.058, -0.142); ctx.stroke();
  // toma de aire
  ctx.fillStyle = '#0a0a0b';
  rr(ctx, -0.104, -0.168, 0.012, 0.022, 0.005); ctx.fill();
  // retrovisor
  ctx.strokeStyle = dark; ctx.lineWidth = 0.004;
  ctx.beginPath(); ctx.moveTo(0.09, -0.106); ctx.lineTo(0.085, -0.124); ctx.stroke();
  ctx.fillStyle = L.body; rr(ctx, 0.07, -0.132, 0.03, 0.012, 0.004); ctx.fill();
  // suspensión
  ctx.strokeStyle = '#1f2125'; ctx.lineWidth = 0.005;
  const fr = (g.front.x - x) / Lpx, rw = (g.rear.x - x) / Lpx, wy = (g.front.y - g.y) / Lpx;
  [[0.2, -0.068], [0.2, -0.092]].forEach(([px, py]) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(fr, wy); ctx.stroke(); });
  [[-0.25, -0.05], [-0.25, -0.08]].forEach(([px, py]) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(rw, wy); ctx.stroke(); });
  // luz trasera
  ctx.fillStyle = st.brake ? '#ff3030' : '#6a1010';
  rr(ctx, -0.452, -0.075, 0.012, 0.014, 0.003); ctx.fill();
  ctx.restore();
  // alerón delantero
  if (st.wing === 'new' || st.wing === 'old') drawFrontWing(ctx, x + 0.355 * Lpx, g.y - 0.012 * Lpx, Lpx, L, st.wing === 'old');
  // ruedas
  drawWheel(ctx, g.rear.x, g.rear.y, g.rear.r, st.wheelR, st.spin || 0);
  drawWheel(ctx, g.front.x, g.front.y, g.front.r, st.wheelF, st.spin || 0);
  if (st.brake) {
    ctx.fillStyle = 'rgba(255,120,40,0.55)';
    ctx.beginPath(); ctx.arc(g.front.x, g.front.y, g.front.r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  return g;
}

// ---------- Personas ----------
// a = { face, pose, walkPhase, moving, carry, role, female, helmet, skin, kneel }
// x, y = pies; h = altura en px; C = { shirt, pants, trim }
export function drawPerson(ctx, a, x, y, h, C, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(a.face * h, h);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const kneel = a.pose === 'work' || a.pose === 'kneel';
  const ph = a.walkPhase || 0;
  const sw = a.moving ? Math.sin(ph) : 0;
  const hipY = kneel ? -0.32 : -0.46 + (a.moving ? Math.abs(Math.sin(ph)) * -0.015 : 0);
  const legW = 0.085;
  ctx.strokeStyle = C.pants; ctx.lineWidth = legW;
  if (kneel) {
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0.17, -0.2); ctx.lineTo(0.16, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(-0.06, -0.02); ctx.lineTo(-0.24, 0); ctx.stroke();
  } else {
    const l1 = sw * 0.45, l2 = -sw * 0.45;
    [l1, l2].forEach((ang, i) => {
      const kx = Math.sin(ang) * 0.24, ky = hipY + Math.cos(ang) * 0.24;
      const bend = a.moving ? Math.max(0, Math.sin(ph + (i ? Math.PI : 0))) * 0.12 : 0;
      const fx = kx + Math.sin(ang - bend) * 0.22, fy = Math.min(0, ky + Math.cos(ang - bend) * 0.22);
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = '#111';
      rr(ctx, fx - 0.03, fy - 0.03, 0.1, 0.04, 0.015); ctx.fill();
    });
  }
  // torso
  const shY = hipY - 0.32;
  ctx.fillStyle = C.shirt;
  rr(ctx, -0.1, shY - 0.02, 0.2, hipY - shY + 0.04, 0.05); ctx.fill();
  ctx.fillStyle = C.trim;
  ctx.fillRect(-0.1, shY + 0.12, 0.2, 0.025);
  if (a.role === 'driver') ctx.fillRect(-0.012, shY, 0.024, hipY - shY);
  // cabeza
  const hy = shY - 0.1;
  ctx.fillStyle = a.skin || '#c98d68';
  ctx.beginPath(); ctx.arc(0.01, hy, 0.072, 0, Math.PI * 2); ctx.fill();
  if (a.female && !a.helmet) {
    ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.moveTo(-0.05, hy - 0.03); ctx.quadraticCurveTo(-0.14, hy + 0.02, -0.11, hy + 0.1); ctx.stroke();
  }
  if (a.helmet) {
    ctx.fillStyle = C.trim === '#ffffff' ? '#222' : '#1d1f24';
    ctx.beginPath(); ctx.arc(0.01, hy - 0.005, 0.088, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,180,255,0.55)';
    rr(ctx, 0.02, hy - 0.03, 0.07, 0.035, 0.01); ctx.fill();
  } else {
    // gorra
    ctx.fillStyle = a.role === 'driver' ? C.trim : C.shirt;
    ctx.beginPath(); ctx.arc(0.01, hy - 0.02, 0.075, Math.PI, 0); ctx.fill();
    ctx.fillRect(0.01, hy - 0.03, 0.12, 0.018);
    if (a.role !== 'driver') {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.arc(0.01, hy, 0.085, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-0.06, hy + 0.005, 0.025, 0, Math.PI * 2); ctx.fill();
    }
  }
  // brazos
  ctx.strokeStyle = C.shirt; ctx.lineWidth = 0.07;
  const sx = 0, sy = shY + 0.03;
  const hand = (hx, hy2, ex, ey) => {
    ctx.strokeStyle = C.shirt; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy2); ctx.stroke();
    ctx.fillStyle = a.skin || '#c98d68';
    ctx.beginPath(); ctx.arc(hx, hy2, 0.03, 0, Math.PI * 2); ctx.fill();
  };
  if (a.carry === 'tyreNew' || a.carry === 'tyreOld') {
    drawTyre(ctx, 0.26, sy + 0.17, 0.17, a.carry === 'tyreOld', 0);
    hand(0.16, sy + 0.1, 0.1, sy + 0.14);
    hand(0.2, sy + 0.25, 0.08, sy + 0.2);
  } else if (a.carry === 'wingNew' || a.carry === 'wingOld') {
    ctx.save(); ctx.translate(0.04, sy + 0.2); ctx.scale(0.55, 0.55);
    const L = a.wingLivery;
    if (L) drawFrontWing(ctx, 0, 0, 1.4, L, a.carry === 'wingOld');
    ctx.restore();
    hand(0.14, sy + 0.17, 0.08, sy + 0.14);
    hand(0.32, sy + 0.17, 0.16, sy + 0.2);
  } else if (a.pose === 'work') {
    const jit = Math.sin(time * 60) * 0.008;
    hand(0.3 + jit, sy + 0.04, 0.15, sy + 0.08);
    ctx.fillStyle = a.tool === 'wrench' ? '#bfc3c9' : '#2a2c30';
    rr(ctx, 0.29 + jit, sy - 0.0, 0.14, 0.06, 0.015); ctx.fill();
    ctx.fillStyle = '#e8b400'; ctx.fillRect(0.31 + jit, sy + 0.05, 0.04, 0.07);
    hand(0.22, sy + 0.12, 0.1, sy + 0.14);
  } else if (a.tablet) {
    const up = a.pose === 'check' ? -0.08 : 0;
    ctx.fillStyle = '#1b1f27';
    rr(ctx, 0.12, sy + 0.04 + up, 0.12, 0.15, 0.015); ctx.fill();
    ctx.fillStyle = '#5fd0ff';
    ctx.fillRect(0.135, sy + 0.06 + up, 0.09, 0.1);
    hand(0.15, sy + 0.14 + up, 0.12, sy + 0.17);
    if (a.pose === 'check') hand(0.26, sy - 0.02, 0.16, sy + 0.02);
    else hand(-0.06 - sw * 0.12, sy + 0.3, -0.04 - sw * 0.06, sy + 0.16);
  } else if (a.pose === 'point') {
    hand(0.34, sy - 0.02, 0.17, sy + 0.01);
    hand(-0.04, sy + 0.3, -0.03, sy + 0.16);
  } else {
    hand(0.06 + sw * 0.13, sy + 0.3, 0.04 + sw * 0.07, sy + 0.16);
    hand(-0.06 - sw * 0.13, sy + 0.3, -0.04 - sw * 0.07, sy + 0.16);
  }
  ctx.restore();
}

// ---------- Bandera a cuadros ondeando ----------
export function drawCheckered(ctx, x, y, size, time) {
  const cols = 8, rows = 5, cw = size / cols, chh = size * 0.62 / rows;
  ctx.fillStyle = '#d9d9d9';
  ctx.fillRect(x - size * 0.03, y - size * 0.05, size * 0.03, size * 1.25);
  for (let c = 0; c < cols; c++) {
    const w0 = Math.sin(time * 6 - c * 0.7) * size * 0.05;
    const w1 = Math.sin(time * 6 - (c + 1) * 0.7) * size * 0.05;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = (r + c) % 2 ? '#111' : '#f4f4f4';
      ctx.beginPath();
      ctx.moveTo(x + c * cw, y + r * chh + w0);
      ctx.lineTo(x + (c + 1) * cw, y + r * chh + w1);
      ctx.lineTo(x + (c + 1) * cw, y + (r + 1) * chh + w1);
      ctx.lineTo(x + c * cw, y + (r + 1) * chh + w0);
      ctx.closePath(); ctx.fill();
    }
  }
}
