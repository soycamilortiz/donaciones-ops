/* ============================================================
   Iconografía Feather. Cada icono es una lista de primitivas SVG;
   se construyen con createElementNS, nunca con innerHTML.
   Trazo 2.2, extremos redondos, sin relleno.
   ============================================================ */

import { s } from './dom.js';

const P = (d) => ['path', { d }];
const L = (x1, y1, x2, y2) => ['line', { x1, y1, x2, y2 }];
const C = (cx, cy, r) => ['circle', { cx, cy, r }];
const R = (x, y, width, height, rx) => ['rect', { x, y, width, height, rx, ry: rx }];
const PL = (points) => ['polyline', { points }];

export const ICONS = {
  grid: [R(3, 3, 7, 7), R(14, 3, 7, 7), R(14, 14, 7, 7), R(3, 14, 7, 7)],
  users: [P('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), C(9, 7, 4), P('M23 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  shield: [P('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')],
  home: [P('M3 21h18'), P('M5 21V8l7-4 7 4v13'), P('M9 21v-6h6v6')],
  package: [P('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'), PL('3.27 6.96 12 12.01 20.73 6.96'), L(12, 22.08, 12, 12)],
  camera: [P('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'), C(12, 13, 4)],
  arrowRight: [L(5, 12, 19, 12), PL('12 5 19 12 12 19')],
  arrowLeft: [L(19, 12, 5, 12), PL('12 19 5 12 12 5')],
  plus: [L(12, 5, 12, 19), L(5, 12, 19, 12)],
  check: [PL('20 6 9 17 4 12')],
  x: [L(18, 6, 6, 18), L(6, 6, 18, 18)],
  search: [C(11, 11, 8), L(21, 21, 16.65, 16.65)],
  refresh: [PL('23 4 23 10 17 10'), PL('1 20 1 14 7 14'), P('M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15')],
  lock: [R(3, 11, 18, 11, 2), P('M7 11V7a5 5 0 0 1 10 0v4')],
  alert: [C(12, 12, 10), L(12, 8, 12, 12), L(12, 16, 12.01, 16)],
  info: [C(12, 12, 10), L(12, 16, 12, 12), L(12, 8, 12.01, 8)],
  triangle: [P('M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'), L(12, 9, 12, 13), L(12, 17, 12.01, 17)],
  logout: [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), PL('16 17 21 12 16 7'), L(21, 12, 9, 12)],
  globe: [C(12, 12, 10), L(2, 12, 22, 12), P('M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z')],
  mail: [P('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'), PL('22 6 12 13 2 6')],
  trash: [PL('3 6 5 6 21 6'), P('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')],
  book: [P('M4 19.5A2.5 2.5 0 0 1 6.5 17H20'), P('M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z')],
  clock: [C(12, 12, 10), PL('12 6 12 12 16 14')],
  swap: [PL('17 1 21 5 17 9'), P('M3 11V9a4 4 0 0 1 4-4h14'), PL('7 23 3 19 7 15'), P('M21 13v2a4 4 0 0 1-4 4H3')],
  wifiOff: [P('M5 12.55a11 11 0 0 1 14.08 0'), P('M1.42 9a16 16 0 0 1 21.16 0'), P('M8.53 16.11a6 6 0 0 1 6.95 0'), L(12, 20, 12.01, 20), L(2, 2, 22, 22)],
  heart: [P('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z')],
  settings: [C(12, 12, 3), P('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z')],
  calendar: [R(3, 4, 18, 18, 2), L(16, 2, 16, 6), L(8, 2, 8, 6), L(3, 10, 21, 10)],
};

/** Devuelve un <svg> nuevo. `cls` va al elemento, no al padre. */
export function icon(name, cls = 'ico', stroke = 2.2) {
  const parts = ICONS[name];
  if (!parts) throw new Error(`icono desconocido: ${name}`);
  return s('svg', {
    class: cls, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', 'stroke-width': stroke,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  }, parts.map(([tag, attrs]) => s(tag, attrs)));
}

/** Spinner: dos arcos, uno de pista y uno de avance. */
export function spinner(cls = 'spin') {
  return s('svg', { class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    s('circle', { cx: 12, cy: 12, r: 9.5, stroke: '#DFE3D6', 'stroke-width': 3, fill: 'none' }),
    s('path', { d: 'M12 2.5a9.5 9.5 0 0 1 9.5 9.5', stroke: '#F2C230', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }),
  ]);
}
