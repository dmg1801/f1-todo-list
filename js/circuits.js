// Circuitos del calendario. Cada carrera nueva pasa al siguiente.
// plan: [segmentos, curvatura (+ derecha, − izquierda), 'T' = túnel]
// theme: colores y paisaje (ver js/scene/backdrops.js).
export const CIRCUITS = [
  {
    id: 'monaco',
    plan: [[34, 0], [16, 6.6], [18, 0], [24, -5.2], [12, 0], [20, 7], [12, 0], [26, -4.4], [64, 0.6, 'T'], [14, -6.4], [26, 0], [18, 5.6], [16, -6.6], [30, 0], [18, 7], [24, 0]],
    theme: {
      night: false,
      sky: ['#2a73c8', '#6fb0ea', '#d4ebf8'],
      ground: ['#5f6c57', '#5a6752'],
      road: ['#3f424a', '#3b3e46'],
      kerb: ['#d8222c', '#f2f2f2'],
      walls: { color: ['#d9dde3', '#c9cdd4'], stripe: '#d8222c' },
      lamp: '#fff2c4'
    }
  },
  {
    id: 'istanbul',
    plan: [[60, 0], [34, -4.4], [28, 0], [40, 3.6], [26, 0], [26, -4.2], [10, -2], [26, -4.2], [10, -2], [26, -4.2], [40, 0], [30, 5], [24, -5], [70, 0], [26, 4.2], [30, 0]],
    theme: {
      night: false,
      sky: ['#1b1446', '#7a3b6b', '#f39a55'],
      ground: ['#5d7a2f', '#56712a'],
      road: ['#3a3d45', '#363940'],
      kerb: ['#d8222c', '#f2f2f2'],
      walls: null,
      stands: true,
      lamp: '#ffe2b0'
    }
  },
  {
    id: 'lasvegas',
    plan: [[130, 0], [20, -6.2], [40, 0], [24, 5.2], [150, 0], [22, -5.6], [60, 0], [28, 4.2], [28, -4.2], [100, 0]],
    theme: {
      night: true,
      sky: ['#02020a', '#120a2e', '#3c1858'],
      ground: ['#1a1b22', '#17181e'],
      road: ['#2c2e36', '#292b32'],
      kerb: ['#ff2bd6', '#f2f2f2'],
      walls: { color: ['#1c1c28', '#191924'], stripe: '#ff2bd6', glow: true },
      lamp: '#ff7ae6'
    }
  },
  {
    id: 'madrid',
    plan: [[80, 0], [26, 5.2], [30, 0], [34, -4.4], [44, 0, 'T'], [26, 3.6], [64, 4.6], [40, 0], [24, -5.4], [24, 4], [56, 0]],
    theme: {
      night: false,
      sky: ['#2f6fcf', '#86b7ea', '#f3d9a8'],
      ground: ['#8c8f4c', '#848746'],
      road: ['#3d3f46', '#393b42'],
      kerb: ['#c60b1e', '#ffc400'],
      walls: null,
      stands: true,
      lamp: '#fff2c4'
    }
  },
  {
    id: 'berlin',
    plan: [[90, 0], [20, -6], [30, 0], [24, 6], [60, 0], [34, -3.2], [34, 3.2], [80, 0], [22, 5.6], [40, 0]],
    theme: {
      night: false,
      sky: ['#26303d', '#5b697b', '#aeb8c4'],
      ground: ['#6c6f73', '#67696d'],
      road: ['#3b3d43', '#37393f'],
      kerb: ['#d8222c', '#f2f2f2'],
      walls: null,
      stands: true,
      lamp: '#f3f0e0'
    }
  },
  {
    id: 'tokyo',
    plan: [[70, 0], [28, 5.2], [20, -5.2], [28, 5.2], [40, 0], [48, -4], [30, 0], [24, 6.2], [60, 0], [34, -3.6], [50, 0]],
    theme: {
      night: true,
      sky: ['#0a0f2a', '#3a1f5c', '#e06a8c'],
      ground: ['#24252d', '#212229'],
      road: ['#30323a', '#2d2f36'],
      kerb: ['#d8222c', '#f2f2f2'],
      walls: { color: ['#26283a', '#222434'], stripe: '#38e1ff', glow: true },
      lamp: '#9ff3ff'
    }
  }
];

export const DEFAULT_CIRCUIT = 'monaco';

export function getCircuit(id) {
  return CIRCUITS.find(c => c.id === id) || CIRCUITS[0];
}

export function nextCircuit(id) {
  const i = CIRCUITS.findIndex(c => c.id === id);
  return CIRCUITS[(i + 1) % CIRCUITS.length].id;
}
