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
// (cx, by) = centro inferior; w = ancho en píxeles; angle = guiñada en pantalla.
export function drawCarRear(ctx, cx, by, w, angle, L, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(cx, by);
  // sombra sin rotar
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, -w * 0.01, w * 0.56, w * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(w, w);
  const steer = Math.max(-0.05, Math.min(0.05, angle * 0.18)); // giro de dirección, sin inclinar el coche
  const dark = '#111214';
  // ruedas delanteras (más lejos)
  ctx.fillStyle = '#151515';
  rr(ctx, -0.45 + steer, -0.37, 0.13, 0.19, 0.03); ctx.fill();
  rr(ctx, 0.32 + steer, -0.37, 0.13, 0.19, 0.03); ctx.fill();
  // pontones
  ctx.fillStyle = shade(L.body, -0.18);
  poly(ctx, [[-0.37, -0.1], [-0.34, -0.3], [-0.14, -0.37], [0.14, -0.37], [0.34, -0.3], [0.37, -0.1]]); ctx.fill();
  ctx.fillStyle = L.second;
  poly(ctx, [[-0.35, -0.2], [-0.33, -0.27], [-0.18, -0.31], [-0.18, -0.24]]); ctx.fill();
  poly(ctx, [[0.35, -0.2], [0.33, -0.27], [0.18, -0.31], [0.18, -0.24]]); ctx.fill();
  // cubierta del motor
  ctx.fillStyle = L.body;
  poly(ctx, [[-0.17, -0.1], [-0.085, -0.52], [0.085, -0.52], [0.17, -0.1]]); ctx.fill();
  ctx.fillStyle = L.trim;
  poly(ctx, [[-0.03, -0.12], [-0.018, -0.5], [0.018, -0.5], [0.03, -0.12]]); ctx.fill();
  // casco + halo
  ctx.fillStyle = L.trim;
  ctx.beginPath(); ctx.arc(0, -0.5, 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(L.second, -0.2);
  rr(ctx, -0.05, -0.53, 0.1, 0.03, 0.01); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.moveTo(-0.11, -0.44); ctx.quadraticCurveTo(0, -0.62, 0.11, -0.44); ctx.stroke();
  // ruedas traseras
  ctx.fillStyle = '#121212';
  rr(ctx, -0.53, -0.35, 0.2, 0.35, 0.045); ctx.fill();
  rr(ctx, 0.33, -0.35, 0.2, 0.35, 0.045); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.012;
  const ph = ((o.phase || 0) % 1) * 0.07;
  for (let k = 0; k < 5; k++) {
    const y = -0.33 + k * 0.07 + ph;
    ctx.beginPath(); ctx.moveTo(-0.51, y); ctx.lineTo(-0.35, y); ctx.moveTo(0.35, y); ctx.lineTo(0.51, y); ctx.stroke();
  }
  ctx.fillStyle = o.tyreBand || '#e10600';
  ctx.fillRect(-0.53, -0.2, 0.015, 0.05); ctx.fillRect(0.515, -0.2, 0.015, 0.05);
  // difusor
  ctx.fillStyle = '#0b0b0b';
  rr(ctx, -0.25, -0.11, 0.5, 0.09, 0.02); ctx.fill();
  ctx.fillStyle = '#232323';
  for (let k = -2; k <= 2; k++) ctx.fillRect(k * 0.09 - 0.006, -0.11, 0.012, 0.09);
  // luz de lluvia / freno
  ctx.fillStyle = o.brake ? '#ff2a2a' : '#7a1010';
  if (o.brake) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 0.2; }
  ctx.fillRect(-0.04, -0.21, 0.08, 0.04);
  ctx.shadowBlur = 0;
  // alerón trasero
  ctx.fillStyle = dark;
  ctx.fillRect(-0.02, -0.6, 0.04, 0.12);
  ctx.fillStyle = L.second;
  ctx.fillRect(-0.44, -0.7, 0.05, 0.4); ctx.fillRect(0.39, -0.7, 0.05, 0.4);
  ctx.fillStyle = L.body;
  ctx.fillRect(-0.44, -0.69, 0.88, 0.085);
  ctx.fillStyle = L.trim;
  ctx.fillRect(-0.44, -0.725, 0.88, 0.04);
  if (o.blueFlag) {
    ctx.fillStyle = '#2b7bff';
    ctx.fillRect(-0.07, -0.8, 0.14, 0.06);
  }
  ctx.restore();
}

// ---------- Rueda vista de perfil ----------
function drawWheel(ctx, x, y, r, state, spin) {
  if (state === 'none') {
    ctx.fillStyle = '#7a3a12';
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3d42';
    ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9ccd1';
    ctx.beginPath(); ctx.arc(x, y, r * 0.08, 0, Math.PI * 2); ctx.fill();
    return;
  }
  drawTyre(ctx, x, y, r, state === 'old', spin);
}

export function drawTyre(ctx, x, y, r, old, spin = 0) {
  ctx.fillStyle = old ? '#2c2723' : '#141414';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = old ? '#6e5148' : '#e10600';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = old ? '#4a4744' : '#2d3036';
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = old ? '#6b6763' : '#9aa0a8';
  ctx.lineWidth = r * 0.08;
  for (let k = 0; k < 5; k++) {
    const a = spin + k * Math.PI * 2 / 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.stroke();
  }
  ctx.fillStyle = '#d0d3d8';
  ctx.beginPath(); ctx.arc(x, y, r * 0.13, 0, Math.PI * 2); ctx.fill();
  if (old) {
    ctx.fillStyle = 'rgba(120,100,90,0.7)';
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.05, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- Alerón delantero (perfil) ----------
export function drawFrontWing(ctx, x, y, s, L, old) {
  // x,y = extremo trasero inferior; s = longitud del coche
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = old ? shade(L.body, -0.45) : L.body;
  rr(ctx, 0, -0.024, 0.18, 0.022, 0.006); ctx.fill();
  ctx.fillStyle = old ? '#444' : L.second;
  if (old) poly(ctx, [[0.12, -0.075], [0.17, -0.075], [0.175, -0.04], [0.15, -0.03], [0.12, -0.026]]);
  else poly(ctx, [[0.12, -0.078], [0.175, -0.078], [0.18, -0.024], [0.12, -0.024]]);
  ctx.fill();
  ctx.fillStyle = old ? '#555' : L.trim;
  ctx.fillRect(0, -0.03, 0.16, 0.006);
  if (old) {
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.004;
    ctx.beginPath(); ctx.moveTo(0.06, -0.024); ctx.lineTo(0.07, -0.012); ctx.lineTo(0.064, -0.006); ctx.lineTo(0.075, -0.002); ctx.stroke();
  }
  ctx.restore();
}

// ---------- Monoplaza de perfil (garaje). Morro a la derecha. ----------
// st = { wheelF, wheelR: 'new'|'old'|'none', wing: 'new'|'old'|'none', driverIn, lift(0..1), brake, spin }
export function carGeometry(x, gy, Lpx, lift = 0) {
  const y = gy - lift * Lpx * 0.05;
  return {
    y,
    front: { x: x + 0.31 * Lpx, y: y - 0.105 * Lpx, r: 0.105 * Lpx },
    rear: { x: x - 0.33 * Lpx, y: y - 0.11 * Lpx, r: 0.11 * Lpx },
    nose: { x: x + 0.47 * Lpx, y: y - 0.04 * Lpx },
    cockpit: { x: x - 0.02 * Lpx, y: y - 0.26 * Lpx }
  };
}

export function drawCarSide(ctx, x, gy, Lpx, L, st) {
  const g = carGeometry(x, gy, Lpx, st.lift || 0);
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(x, gy, Lpx * 0.55, Lpx * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  // caballetes
  if ((st.lift || 0) > 0.05) {
    ctx.fillStyle = '#d9b21c';
    const h = gy - g.y;
    [g.front.x - Lpx * 0.07, g.rear.x + Lpx * 0.08].forEach(sx => {
      poly(ctx, [[sx - Lpx * 0.03, gy], [sx - Lpx * 0.012, g.y - Lpx * 0.04], [sx + Lpx * 0.012, g.y - Lpx * 0.04], [sx + Lpx * 0.03, gy]]); ctx.fill();
    });
    ctx.fillStyle = '#1b1b1b';
    [g.front.x - Lpx * 0.07, g.rear.x + Lpx * 0.08].forEach(sx => ctx.fillRect(sx - Lpx * 0.02, gy - h * 0.55, Lpx * 0.04, Math.max(2, h * 0.12)));
  }
  ctx.save();
  ctx.translate(x, g.y); ctx.scale(Lpx, Lpx);
  // fondo plano
  ctx.fillStyle = '#121212';
  ctx.fillRect(-0.45, -0.058, 0.88, 0.028);
  // alerón trasero: soporte, placa lateral y dos planos
  ctx.fillStyle = '#151515'; ctx.fillRect(-0.47, -0.3, 0.018, 0.16);
  ctx.fillStyle = shade(L.body, -0.35);
  poly(ctx, [[-0.535, -0.34], [-0.455, -0.34], [-0.44, -0.16], [-0.52, -0.15]]); ctx.fill();
  ctx.fillStyle = L.second; ctx.fillRect(-0.53, -0.27, 0.08, 0.02);
  ctx.fillStyle = L.body; poly(ctx, [[-0.55, -0.335], [-0.43, -0.345], [-0.43, -0.322], [-0.55, -0.315]]); ctx.fill();
  ctx.fillStyle = L.trim; poly(ctx, [[-0.545, -0.36], [-0.44, -0.37], [-0.44, -0.355], [-0.545, -0.346]]); ctx.fill();
  // carrocería
  ctx.fillStyle = L.body;
  poly(ctx, [[0.53, -0.075], [0.46, -0.092], [0.3, -0.122], [0.12, -0.156], [0.06, -0.176], [-0.02, -0.182], [-0.08, -0.27], [-0.15, -0.285], [-0.23, -0.22], [-0.4, -0.172], [-0.46, -0.162], [-0.46, -0.058], [0.42, -0.055], [0.53, -0.06]]);
  ctx.fill();
  // pontón
  ctx.fillStyle = shade(L.body, -0.2);
  poly(ctx, [[0.1, -0.148], [-0.05, -0.16], [-0.3, -0.15], [-0.37, -0.075], [0.14, -0.066]]); ctx.fill();
  ctx.fillStyle = L.second;
  poly(ctx, [[0.08, -0.13], [-0.25, -0.13], [-0.3, -0.1], [0.11, -0.1]]); ctx.fill();
  // línea de ribete
  ctx.strokeStyle = L.trim; ctx.lineWidth = 0.012;
  ctx.beginPath(); ctx.moveTo(0.52, -0.072); ctx.lineTo(0.3, -0.108); ctx.lineTo(0.06, -0.146); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.09, -0.258); ctx.lineTo(-0.22, -0.205); ctx.lineTo(-0.44, -0.16); ctx.stroke();
  // toma de aire
  ctx.fillStyle = '#0c0c0c';
  rr(ctx, -0.115, -0.275, 0.04, 0.03, 0.008); ctx.fill();
  // cockpit
  ctx.fillStyle = '#0d0d0d';
  ctx.beginPath(); ctx.ellipse(-0.02, -0.18, 0.06, 0.016, 0, 0, Math.PI * 2); ctx.fill();
  if (st.driverIn) {
    ctx.fillStyle = L.trim;
    ctx.beginPath(); ctx.arc(-0.025, -0.205, 0.034, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2633';
    rr(ctx, -0.012, -0.218, 0.03, 0.014, 0.004); ctx.fill();
  }
  // halo
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 0.013;
  ctx.beginPath(); ctx.moveTo(0.065, -0.172); ctx.quadraticCurveTo(0.03, -0.25, -0.09, -0.236); ctx.stroke();
  // luz
  ctx.fillStyle = st.brake ? '#ff3030' : '#6a1010';
  ctx.fillRect(-0.475, -0.12, 0.018, 0.02);
  ctx.restore();
  // alerón delantero
  if (st.wing === 'new' || st.wing === 'old') drawFrontWing(ctx, x + 0.38 * Lpx, g.y - 0.034 * Lpx, Lpx, L, st.wing === 'old');
  // ruedas
  drawWheel(ctx, g.rear.x, g.rear.y, g.rear.r, st.wheelR, st.spin || 0);
  drawWheel(ctx, g.front.x, g.front.y, g.front.r, st.wheelF, st.spin || 0);
  if (st.brake) {
    ctx.fillStyle = 'rgba(255,120,40,0.55)';
    ctx.beginPath(); ctx.arc(g.front.x, g.front.y, g.front.r * 0.25, 0, Math.PI * 2); ctx.fill();
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
