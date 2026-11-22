// Generador de escudos para la escudería propia: forma + símbolo + colores + iniciales.
export const SHAPES = ['shield', 'crest', 'circle', 'hexagon', 'diamond', 'square'];
export const SYMBOLS = ['bolt', 'star', 'chevrons', 'flame', 'crown', 'wheel', 'flag', 'wing', 'none'];

const SHAPE_PATH = {
  shield: 'M32 4 56 11v19c0 15-10 24-24 30C18 54 8 45 8 30V11z',
  crest: 'M7 6h50v24c0 16-12 25-25 30C19 55 7 46 7 30z',
  circle: 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56z',
  hexagon: 'M32 4 56 18v28L32 60 8 46V18z',
  diamond: 'M32 3 61 32 32 61 3 32z',
  square: 'M18 5h28a13 13 0 0 1 13 13v28a13 13 0 0 1-13 13H18A13 13 0 0 1 5 46V18A13 13 0 0 1 18 5z'
};

function star(cx, cy, R) {
  const r = R * 0.42, pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

const SYMBOL_SVG = {
  bolt: () => '<path d="M36 10 23 33h9l-4 19 15-25h-10z"/>',
  star: () => star(32, 30, 16),
  chevrons: () => '<path d="M18 19 32 28l14-9v7L32 35l-14-9zM18 31l14 9 14-9v7l-14 9-14-9z"/>',
  flame: () => '<path d="M32 10c5 7 13 12 13 22a13 13 0 0 1-26 0c0-6 4-10 7-14 1 6 3 8 6 9-2-6-2-11 0-17z"/>',
  crown: () => '<path d="M15 42 17 20l9 9 6-14 6 14 9-9 2 22z"/><rect x="15" y="44" width="34" height="4" rx="1"/>',
  wheel: () => '<circle cx="32" cy="30" r="15" fill="none" stroke-width="5"/><circle cx="32" cy="30" r="4"/>' +
    [0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<line x1="32" y1="30" x2="${(32 + 13 * Math.cos(r)).toFixed(1)}" y2="${(30 + 13 * Math.sin(r)).toFixed(1)}" stroke-width="3"/>`; }).join(''),
  flag: () => {
    let s = '<rect x="18" y="12" width="3" height="34" rx="1"/>';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) s += `<rect x="${21 + i * 6.5}" y="${13 + j * 6.5}" width="6.5" height="6.5"/>`;
    return s + '<rect x="21" y="13" width="26" height="19.5" fill="none" stroke-width="1.5"/>';
  },
  wing: () => '<path d="M8 30c9-8 18-10 24-10s15 2 24 10c-9-2-15-1-24 5-9-6-15-7-24-5z"/><path d="M18 36c5-2 9-2 14 2 5-4 9-4 14-2-5 3-9 6-14 8-5-2-9-5-14-8z"/>',
  none: () => ''
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function emblemSVG(e) {
  const shape = SHAPE_PATH[e.shape] || SHAPE_PATH.shield;
  const sym = (SYMBOL_SVG[e.symbol] || SYMBOL_SVG.none)();
  const ini = (e.initials || '').trim().toUpperCase().slice(0, 3);
  const hasSym = e.symbol && e.symbol !== 'none';
  const symScale = e.shape === 'diamond' ? 0.62 : e.shape === 'circle' || e.shape === 'hexagon' ? 0.78 : 0.82;
  const symY = ini ? -4 : 2;
  let text = '';
  if (ini) {
    const size = hasSym ? (ini.length > 2 ? 9 : 11) : (ini.length > 2 ? 15 : 20);
    const y = hasSym ? (e.shape === 'diamond' ? 45 : 50) : 38 + size * 0.05;
    text = `<text x="32" y="${y}" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${size}" fill="${e.fg}" letter-spacing="0.5">${esc(ini)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<path d="${shape}" fill="${e.bg}" stroke="${e.border}" stroke-width="3.5" stroke-linejoin="round"/>` +
    (hasSym ? `<g fill="${e.fg}" stroke="${e.fg}" stroke-width="0" transform="translate(32 ${30 + symY}) scale(${symScale}) translate(-32 -30)">${sym}</g>` : '') +
    text + '</svg>';
}

export function emblemDataURL(e) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(emblemSVG(e));
}

// Iconos pequeños para los botones del editor.
export function shapeIcon(shape) {
  return `<svg aria-hidden="true" viewBox="0 0 64 64" width="30" height="30"><path d="${SHAPE_PATH[shape]}" fill="currentColor"/></svg>`;
}
export function symbolIcon(symbol) {
  if (symbol === 'none') return '<svg aria-hidden="true" viewBox="0 0 64 64" width="30" height="30"><circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="4"/><line x1="18" y1="46" x2="46" y2="18" stroke="currentColor" stroke-width="4"/></svg>';
  return `<svg aria-hidden="true" viewBox="0 0 64 64" width="30" height="30"><g fill="currentColor" stroke="currentColor" stroke-width="0" transform="translate(0 2)">${SYMBOL_SVG[symbol]()}</g></svg>`;
}
