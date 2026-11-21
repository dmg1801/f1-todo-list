// Escuderías: nombre, emblema local y librea.
// body = carrocería, second = color secundario, trim = ribetes/detalles,
// ui = acento de interfaz legible sobre fondo oscuro, ui2 = acento secundario.
export const TEAMS = [
  { id: 'ferrari',      name: 'Ferrari',       emblem: 'ferrari.svg',      livery: { body: '#d0101e', second: '#121212', trim: '#ffffff' }, ui: '#ff3b47', ui2: '#ffffff' },
  { id: 'mclaren',      name: 'McLaren',       emblem: 'mclaren.svg',      livery: { body: '#ff8000', second: '#111111', trim: '#47c7fc' }, ui: '#ff8a1f', ui2: '#47c7fc' },
  { id: 'williams',     name: 'Williams',      emblem: 'williams.svg',     livery: { body: '#0b2a63', second: '#ffffff', trim: '#ffffff' }, ui: '#5aa9ff', ui2: '#ffffff' },
  { id: 'red-bull',     name: 'Red Bull',      emblem: 'red-bull.svg',     livery: { body: '#1d2b7a', second: '#ffcc00', trim: '#e3122d' }, ui: '#ffcc00', ui2: '#ff3b4e' },
  { id: 'aston-martin', name: 'Aston Martin',  emblem: 'aston-martin.svg', livery: { body: '#005a4e', second: '#cedc00', trim: '#ffffff' }, ui: '#cedc00', ui2: '#21c08b' },
  { id: 'mercedes',     name: 'Mercedes-Benz', emblem: 'mercedes.svg',     livery: { body: '#121314', second: '#c3c7cc', trim: '#00d2be' }, ui: '#00d2be', ui2: '#c3c7cc' },
  { id: 'alpine',       name: 'Alpine',        emblem: 'alpine.svg',       livery: { body: '#0a4ea3', second: '#ff5fa8', trim: '#ff9fcd' }, ui: '#ff6fb1', ui2: '#4f95ff' },
  { id: 'audi',         name: 'Audi',          emblem: 'audi.svg',         livery: { body: '#8a9098', second: '#141414', trim: '#e3061b' }, ui: '#ff3347', ui2: '#b9bec5' },
  { id: 'renault',      name: 'Renault',       emblem: 'renault.svg',      livery: { body: '#5ab4e5', second: '#ffd700', trim: '#ffffff' }, ui: '#ffd700', ui2: '#5ab4e5' },
  { id: 'apex-gp',      name: 'Apex GP',       emblem: 'apex-gp.svg',      livery: { body: '#0b0b0c', second: '#151515', trim: '#d4af37' }, ui: '#d4af37', ui2: '#f1dc94' },
  { id: 'haas',         name: 'Haas',          emblem: 'haas.svg',         livery: { body: '#f2f2f2', second: '#d1001f', trim: '#d1001f' }, ui: '#ff3048', ui2: '#ffffff' }
];

export const DEFAULT_TEAM = 'ferrari';

export function getTeam(id) {
  return TEAMS.find(t => t.id === id) || TEAMS[0];
}

export function emblemPath(team) {
  return `./assets/teams/${team.emblem}`;
}

// Color de texto legible sobre el acento (negro o blanco según luminancia).
export function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.22 ? '#0b0c10' : '#ffffff';
}
