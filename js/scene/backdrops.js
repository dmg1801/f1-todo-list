// Paisajes de fondo de cada circuito, con paralaje según el rumbo (heading).
// Siluetas originales y genéricas; no reproducen fotografías ni logotipos.

const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

// Repite un motivo a lo ancho de la pantalla con desplazamiento.
function tiled(w, off, span, fn) {
  const start = ((off % span) + span) % span - span;
  for (let x = start; x < w + span; x += span) fn(x);
}

function hills(ctx, w, hz, amp, k, off, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, hz + 1);
  for (let px = 0; px <= w; px += 12) {
    const u = px / w * k + off;
    ctx.lineTo(px, hz - amp * (0.6 + 0.4 * Math.sin(u) + 0.25 * Math.sin(u * 2.3 + 1)));
  }
  ctx.lineTo(w, hz + 1); ctx.closePath(); ctx.fill();
}

function windows(ctx, x, y, bw, bh, cols, seed, dens = 0.55) {
  const cw = Math.max(2, bw / 6), ch = Math.max(2, bh / 14);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 12; j++) {
    const r = rnd(seed * 31 + i * 7 + j * 13);
    if (r > dens) continue;
    ctx.fillStyle = cols[Math.floor(r * 97) % cols.length];
    ctx.fillRect(x + cw * 0.6 + i * cw, y + ch * 0.8 + j * ch, Math.max(1, cw * 0.45), Math.max(1, ch * 0.45));
    if (ch * (j + 2) > bh) break;
  }
}

function stars(ctx, w, hz, n, t) {
  for (let i = 0; i < n; i++) {
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i));
    ctx.fillStyle = `rgba(255,255,255,${(a * 0.8).toFixed(2)})`;
    ctx.fillRect(rnd(i) * w, rnd(i + 99) * hz * 0.75, 1.5, 1.5);
  }
}

// ---------- Mónaco: ladera con edificios, puerto y yates ----------
function monaco(ctx, w, h, hz, hd, t) {
  hills(ctx, w, hz, h * 0.17, 3, -hd * 0.35, '#4f7d52');
  tiled(w, -hd * w * 0.18, w * 0.9, x0 => {
    for (let i = 0; i < 16; i++) {
      const bw = w * (0.03 + rnd(i) * 0.03), bh = h * (0.03 + rnd(i + 20) * 0.09);
      const x = x0 + i * w * 0.056, y = hz - h * 0.022 - bh - rnd(i + 40) * h * 0.05;
      ctx.fillStyle = ['#f2d6b3', '#e8b9a0', '#f5e6c8', '#d9a98c', '#f0c9a8', '#e4d3b8'][i % 6];
      ctx.fillRect(x, y, bw, bh + h * 0.06);
      ctx.fillStyle = '#b5523b'; ctx.fillRect(x - 1, y - 2, bw + 2, 3);
      windows(ctx, x, y, bw, bh, ['rgba(60,70,90,0.55)'], i, 0.6);
    }
  });
  ctx.fillStyle = '#1f62a5'; ctx.fillRect(0, hz - h * 0.024, w, h * 0.024 + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 30; i++) ctx.fillRect(rnd(i + 5) * w, hz - h * 0.02 + rnd(i) * h * 0.017, 6, 1);
  tiled(w, -hd * w * 0.3, w * 0.55, x0 => {
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * w * 0.14, s = w * (0.035 + rnd(i + 3) * 0.02), y = hz - h * 0.012;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.12); ctx.lineTo(x + s, y - s * 0.12); ctx.lineTo(x + s * 0.85, y); ctx.lineTo(x + s * 0.1, y); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + s * 0.25, y - s * 0.22, s * 0.45, s * 0.1);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 0.22); ctx.lineTo(x + s * 0.45, y - s * 0.7); ctx.stroke();
    }
  });
}

// ---------- Estambul: sol bajo, cúpulas, minaretes y el Bósforo ----------
function istanbul(ctx, w, h, hz, hd, t) {
  const sx = w * 0.72 - hd * w * 0.04, sy = hz - h * 0.09;
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.2);
  g.addColorStop(0, 'rgba(255,214,140,0.9)'); g.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - h * 0.2, sy - h * 0.2, h * 0.4, h * 0.4);
  ctx.fillStyle = '#ffd590'; ctx.beginPath(); ctx.arc(sx, sy, h * 0.045, 0, Math.PI * 2); ctx.fill();
  hills(ctx, w, hz, h * 0.06, 4, -hd * 0.3, '#3d2a58');
  tiled(w, -hd * w * 0.2, w * 0.75, x0 => {
    const col = '#241838';
    for (let i = 0; i < 6; i++) {
      const bw = w * 0.05, bh = h * (0.02 + rnd(i + 7) * 0.03);
      ctx.fillStyle = col; ctx.fillRect(x0 + i * w * 0.12 + w * 0.3, hz - h * 0.02 - bh, bw, bh);
    }
    const mx = x0 + w * 0.12, base = hz - h * 0.02, r = w * 0.045;
    ctx.fillStyle = col;
    ctx.fillRect(mx - r * 1.5, base - h * 0.035, r * 3, h * 0.035);
    ctx.beginPath(); ctx.arc(mx, base - h * 0.035, r, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - r * 1.1, base - h * 0.035, r * 0.45, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 1.1, base - h * 0.035, r * 0.45, Math.PI, 0); ctx.fill();
    ctx.fillRect(mx - w * 0.002, base - h * 0.035 - r - h * 0.02, w * 0.004, h * 0.02);
    [-1, 1].forEach(sd => {
      const tx = mx + sd * r * 1.9, tw = Math.max(2, w * 0.006), th = h * 0.17;
      ctx.fillRect(tx - tw / 2, base - th, tw, th);
      ctx.beginPath(); ctx.moveTo(tx - tw, base - th); ctx.lineTo(tx, base - th - h * 0.03); ctx.lineTo(tx + tw, base - th); ctx.fill();
      ctx.fillRect(tx - tw, base - th * 0.7, tw * 2, 2);
    });
  });
  ctx.fillStyle = '#3a3474'; ctx.fillRect(0, hz - h * 0.02, w, h * 0.02 + 1);
  ctx.fillStyle = 'rgba(255,200,130,0.5)';
  for (let i = 0; i < 6; i++) ctx.fillRect(sx - 20 + rnd(i) * 40, hz - h * 0.017 + i * 2, 14 - i, 1);
}

// ---------- Las Vegas: noche, rascacielos, neones y esfera luminosa ----------
function lasvegas(ctx, w, h, hz, hd, t) {
  stars(ctx, w, hz, 50, t);
  tiled(w, -hd * w * 0.2, w * 1.1, x0 => {
    for (let i = 0; i < 12; i++) {
      const bw = w * (0.035 + rnd(i + 2) * 0.035), bh = h * (0.08 + rnd(i + 30) * 0.2);
      const x = x0 + i * w * 0.09, y = hz - bh;
      ctx.fillStyle = '#0c0c1a'; ctx.fillRect(x, y, bw, bh);
      windows(ctx, x, y, bw, bh, ['#ffd36b', '#7ef2ff', '#ff7ae6'], i + 3, 0.5);
      ctx.strokeStyle = `hsl(${(i * 47 + t * 40) % 360}, 95%, 62%)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bw, y); ctx.stroke();
    }
    const nx = x0 + w * 0.7;
    ctx.fillStyle = '#16162a'; ctx.fillRect(nx, hz - h * 0.3, w * 0.006, h * 0.3);
    ctx.fillRect(nx - w * 0.012, hz - h * 0.27, w * 0.03, h * 0.02);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(nx, hz - h * 0.31, 3, 3);
  });
  const cx = w * 0.32 - hd * w * 0.12, r = h * 0.075, cy = hz - r * 0.95;
  const hue = (t * 25) % 360;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, `hsl(${hue}, 90%, 70%)`); g.addColorStop(1, `hsl(${(hue + 80) % 360}, 90%, 40%)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsla(${hue}, 90%, 60%, 0.15)`; ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();
}

// ---------- Madrid: sierra al fondo y cuatro torres ----------
function madrid(ctx, w, h, hz, hd, t) {
  hills(ctx, w, hz, h * 0.075, 3.5, -hd * 0.25, '#8ea6c6');
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 5; i++) {
    const px = ((i * w * 0.23 - hd * w * 0.05) % w + w) % w;
    ctx.beginPath(); ctx.moveTo(px - 10, hz - h * 0.085); ctx.lineTo(px, hz - h * 0.1); ctx.lineTo(px + 12, hz - h * 0.085); ctx.fill();
  }
  tiled(w, -hd * w * 0.18, w * 1.2, x0 => {
    for (let i = 0; i < 14; i++) {
      const bw = w * (0.04 + rnd(i + 9) * 0.04), bh = h * (0.02 + rnd(i + 50) * 0.04);
      ctx.fillStyle = '#7b8596'; ctx.fillRect(x0 + i * w * 0.085, hz - bh, bw, bh);
    }
    const tx = x0 + w * 0.42;
    [0.26, 0.24, 0.245, 0.22].forEach((th, i) => {
      const x = tx + i * w * 0.05, bw = w * 0.032, top = hz - h * th;
      ctx.fillStyle = ['#506685', '#5a6f8d', '#4c5f7c', '#5d7293'][i];
      ctx.fillRect(x, top, bw, h * th);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let k = 0; k < 10; k++) ctx.fillRect(x, top + k * h * th / 10, bw, 1);
      if (i === 0) {
        ctx.fillStyle = '#506685';
        ctx.fillRect(x, top - h * 0.03, 3, h * 0.03); ctx.fillRect(x + bw - 3, top - h * 0.03, 3, h * 0.03); ctx.fillRect(x, top - h * 0.03, bw, 3);
      } else if (i === 2) {
        ctx.beginPath(); ctx.moveTo(x, top); ctx.quadraticCurveTo(x + bw / 2, top - h * 0.02, x + bw, top); ctx.fill();
      }
    });
  });
}

// ---------- Berlín: cielo cubierto, torre de televisión y puerta ----------
function berlin(ctx, w, h, hz, hd, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 6; i++) {
    const px = ((i * w * 0.31 - hd * w * 0.03 + t * 4) % (w * 1.3)) - w * 0.15;
    ctx.beginPath(); ctx.ellipse(px, hz * (0.2 + rnd(i) * 0.4), w * 0.18, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  }
  tiled(w, -hd * w * 0.2, w * 1.2, x0 => {
    for (let i = 0; i < 13; i++) {
      const bw = w * (0.05 + rnd(i + 4) * 0.04), bh = h * (0.03 + rnd(i + 60) * 0.05);
      const x = x0 + i * w * 0.093;
      ctx.fillStyle = '#4b5462'; ctx.fillRect(x, hz - bh, bw, bh);
      windows(ctx, x, hz - bh, bw, bh, ['rgba(255,240,200,0.35)'], i + 11, 0.4);
    }
    const tx = x0 + w * 0.3, th = h * 0.28;
    ctx.fillStyle = '#39414d';
    ctx.beginPath(); ctx.moveTo(tx - w * 0.009, hz); ctx.lineTo(tx - w * 0.004, hz - th * 0.62); ctx.lineTo(tx + w * 0.004, hz - th * 0.62); ctx.lineTo(tx + w * 0.009, hz); ctx.fill();
    ctx.beginPath(); ctx.arc(tx, hz - th * 0.66, h * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(tx - 1.5, hz - th, 3, th * 0.34);
    ctx.fillStyle = '#ff4040'; ctx.fillRect(tx - 1.5, hz - th - 3, 3, 3);
    const gx = x0 + w * 0.7, gw = w * 0.1, gh = h * 0.06;
    ctx.fillStyle = '#525a66';
    ctx.fillRect(gx, hz - gh, gw, gh * 0.18);
    for (let k = 0; k < 6; k++) ctx.fillRect(gx + k * gw / 5.4, hz - gh, gw * 0.05, gh);
    ctx.fillRect(gx + gw * 0.3, hz - gh * 1.25, gw * 0.4, gh * 0.25);
  });
}

// ---------- Tokio: monte al fondo, neones y torre de celosía ----------
function tokyo(ctx, w, h, hz, hd, t) {
  stars(ctx, w, hz, 25, t);
  const fx = w * 0.62 - hd * w * 0.03;
  ctx.fillStyle = '#4f3a72';
  ctx.beginPath(); ctx.moveTo(fx - w * 0.28, hz); ctx.lineTo(fx - w * 0.045, hz - h * 0.16); ctx.lineTo(fx + w * 0.045, hz - h * 0.16); ctx.lineTo(fx + w * 0.28, hz); ctx.fill();
  ctx.fillStyle = 'rgba(240,235,255,0.85)';
  ctx.beginPath(); ctx.moveTo(fx - w * 0.075, hz - h * 0.12); ctx.lineTo(fx - w * 0.045, hz - h * 0.16); ctx.lineTo(fx + w * 0.045, hz - h * 0.16); ctx.lineTo(fx + w * 0.075, hz - h * 0.12);
  ctx.lineTo(fx + w * 0.03, hz - h * 0.13); ctx.lineTo(fx, hz - h * 0.115); ctx.lineTo(fx - w * 0.03, hz - h * 0.13); ctx.fill();
  tiled(w, -hd * w * 0.2, w * 1.1, x0 => {
    for (let i = 0; i < 14; i++) {
      const bw = w * (0.03 + rnd(i + 8) * 0.035), bh = h * (0.05 + rnd(i + 70) * 0.13);
      const x = x0 + i * w * 0.078, y = hz - bh;
      ctx.fillStyle = '#121327'; ctx.fillRect(x, y, bw, bh);
      windows(ctx, x, y, bw, bh, ['#ffe9a8', '#9ff3ff'], i + 21, 0.45);
      if (rnd(i + 5) > 0.5) {
        ctx.fillStyle = ['#ff3d7f', '#38e1ff', '#ffd23f', '#7cff6b'][i % 4];
        ctx.fillRect(x + bw * 0.2, y + bh * 0.2, Math.max(2, bw * 0.18), bh * 0.4);
      }
    }
    const tx = x0 + w * 0.5, th = h * 0.27, tb = w * 0.035;
    ctx.strokeStyle = '#ff4b2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx - tb, hz); ctx.lineTo(tx, hz - th); ctx.lineTo(tx + tb, hz); ctx.stroke();
    for (let k = 1; k < 7; k++) {
      const y = hz - th * k / 7, half = tb * (1 - k / 7);
      ctx.beginPath(); ctx.moveTo(tx - half, y); ctx.lineTo(tx + half, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - half, y); ctx.lineTo(tx + tb * (1 - (k - 1) / 7), y + th / 7); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(tx - tb * 0.35, hz - th * 0.55, tb * 0.7, 3);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(tx - 1.5, hz - th - 4, 3, 4);
  });
}

const DRAW = { monaco, istanbul, lasvegas, madrid, berlin, tokyo };

export function drawBackdrop(id, ctx, w, h, hz, heading, time) {
  (DRAW[id] || monaco)(ctx, w, h, hz, heading, time);
}

// Miniatura para el selector de circuitos.
export function drawThumb(ctx, w, h, circuit) {
  const th = circuit.theme, hz = h * 0.58;
  const sky = ctx.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.6, th.sky[1]); sky.addColorStop(1, th.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hz + 1);
  drawBackdrop(circuit.id, ctx, w, h, hz, 0, 1);
  ctx.fillStyle = th.ground[0]; ctx.fillRect(0, hz, w, h - hz);
  const road = (hw, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(w / 2 - hw, h); ctx.lineTo(w / 2 + hw, h); ctx.lineTo(w * 0.53, hz); ctx.lineTo(w * 0.51, hz); ctx.closePath(); ctx.fill(); };
  road(w * 0.48, th.kerb[0]);
  road(w * 0.42, th.road[0]);
}
