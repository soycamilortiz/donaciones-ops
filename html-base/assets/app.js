/* ============================================================
   Shell de la app, modales, avisos e ilustraciones.
   Cada vista declara su ruta en <body data-route="/app/...">.
   ============================================================ */

import { el, s, fill } from './dom.js';
import { icon, spinner } from './icons.js';
import { ME, ORG, roleName } from './data.js';

export { el, s, fill, icon, spinner };

export const NAV = [
  { href: 'app.html', route: '/app', label: 'Resumen', ico: 'grid' },
  { href: 'usuarios.html', route: '/app/usuarios', label: 'Usuarios', ico: 'users' },
  { href: 'roles.html', route: '/app/roles', label: 'Roles', ico: 'shield' },
  { href: 'acopios.html', route: '/app/acopios', label: 'Acopios', ico: 'home' },
  { href: 'inventario.html', route: '/app/inventario', label: 'Inventario', ico: 'package' },
  { href: 'donaciones.html', route: '/app/donaciones', label: 'Donaciones', ico: 'camera' },
];

const SB_FOOT = {
  '/app': ['Sesión de 8 horas', 'Al vencer se pide usuario, contraseña y captcha otra vez.'],
  '/app/usuarios': ['Sin enlace mágico', 'Quien se suma ya tiene que estar registrado con ese correo.'],
  '/app/roles': ['Alcance global', 'La matriz no es por organización: un cambio aplica a todas.'],
  '/app/acopios': ['Nada se borra', 'Los acopios se dan de baja. Uno en baja no admite inventario nuevo.'],
  '/app/inventario': ['Un inventario por acopio', 'Cambiar de bodega cambia todo lo de abajo. La elección se recuerda.'],
  '/app/donaciones': ['Refresco automático', 'Si hay algo en cola, la lista se recarga sola cada 4 segundos.'],
};

/* -------------------------------------------------------------------- shell */

function mountShell() {
  const host = document.querySelector('[data-shell]');
  if (!host) return;

  const route = document.body.dataset.route || '/app';
  const active = NAV.slice(1).find((n) => route.startsWith(n.route)) || NAV[0];
  const [ft, fb] = SB_FOOT[active.route] || SB_FOOT['/app'];

  const orgSelect = el('select', { class: 'sb-select', id: 'org-switch' }, [
    el('option', { text: ORG.nombre }),
    el('option', { text: 'Fundación Tierra Grata Colombia' }),
  ]);

  fill(host, el('aside', { class: 'sidebar' }, [
    el('a', { class: 'sb-brand', href: 'index.html', 'aria-label': 'SOS Chocó — inicio' },
      el('img', { class: 'logo logo-sb', src: 'assets/logo-mark-cream.png', alt: 'SOS Chocó', width: 520, height: 441 })),
    el('div', { class: 'sb-org' }, [
      el('label', { class: 'sb-label', for: 'org-switch', text: 'Organización' }),
      orgSelect,
      el('p', { class: 'sb-role', text: roleName(ME.roleSlug) }),
    ]),
    el('nav', { class: 'sb-nav' }, NAV.map((n) => el('a', {
      class: 'nav-item', href: n.href,
      'aria-current': n.route === active.route ? 'page' : null,
    }, [icon(n.ico), n.label]))),
    el('div', { class: 'sb-foot' }, [
      el('p', { class: 'sb-foot-title', text: ft }),
      el('p', { class: 'sb-foot-text', text: fb }),
    ]),
  ]));

  const bar = document.querySelector('[data-topbar]');
  if (!bar) return;
  fill(bar, [
    el('div', { class: 'tb-user' }, [
      el('div', { class: 'avatar', text: ME.iniciales }),
      el('div', { class: 'col' }, [
        el('span', { class: 'tb-name', text: ME.usuario }),
        el('span', { class: 'tb-mail', text: ME.correo }),
      ]),
    ]),
    el('div', { class: 'tb-sep' }),
    el('span', { class: 'tb-lang' }, [icon('globe'), 'ES']),
    el('a', { class: 'tb-action', href: 'index.html' }, [icon('logout'), 'Salir']),
  ]);
}

/* ------------------------------------------------------------------ modales */

export function openModal(m) {
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  m.querySelector('input, select, textarea, button')?.focus();
}

export function closeModal(m) {
  m.hidden = true;
  document.body.style.overflow = '';
}

/** Cierra con Escape y clic en el fondo. Atrapa el foco dentro del diálogo. */
export function wireModal(m) {
  m.addEventListener('mousedown', (e) => { if (e.target === m) closeModal(m); });
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(m)));
  document.addEventListener('keydown', (e) => {
    if (m.hidden) return;
    if (e.key === 'Escape') { closeModal(m); return; }
    if (e.key !== 'Tab') return;
    const f = [...m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea')];
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* -------------------------------------------------------------------- aviso */

export function toast({ title, text, action = 'Cerrar', ico = 'wifiOff', gold = false }) {
  document.querySelector('.toast')?.remove();
  const btn = el('button', { class: 'toast-btn', type: 'button', text: action });
  const mark = el('div', { class: 'toast-icon' }, icon(ico));
  if (gold) {
    mark.style.background = 'var(--gold-soft)';
    mark.style.color = 'var(--gold-deep)';
    btn.style.background = 'var(--gold)';
    btn.style.color = 'var(--gold-deep)';
  }
  const node = el('div', { class: 'toast', role: 'status' }, [
    mark,
    el('div', { class: 'toast-copy' }, [
      el('p', { class: 'toast-title', text: title }),
      text ? el('p', { class: 'toast-text', text }) : null,
    ]),
    btn,
  ]);
  btn.addEventListener('click', () => node.remove());
  document.body.appendChild(node);
  return node;
}

/* ------------------------------------------------------------- ilustración */

const ART = {
  lata: () => [
    s('rect', { width: 100, height: 100, fill: '#DFE3D6' }),
    s('rect', { x: 33, y: 18, width: 34, height: 58, rx: 5, fill: '#12331A' }),
    s('rect', { x: 33, y: 36, width: 34, height: 20, fill: '#F2C230' }),
    s('rect', { x: 43, y: 10, width: 14, height: 8, rx: 2, fill: '#3A463B' }),
  ],
  botella: () => [
    s('rect', { width: 100, height: 100, fill: '#E9EDE2' }),
    s('path', { d: 'M40 14h20v10l7 12v42H33V36l7-12z', fill: '#35688F' }),
    s('rect', { x: 38, y: 46, width: 24, height: 16, fill: '#F4F1E8' }),
  ],
  caja: () => [
    s('rect', { width: 100, height: 100, fill: '#DFE3D6' }),
    s('rect', { x: 24, y: 30, width: 52, height: 40, rx: 4, fill: '#8B958B' }),
    s('rect', { x: 24, y: 44, width: 52, height: 4, fill: '#F4F1E8' }),
  ],
  bolsa: () => [
    s('rect', { width: 100, height: 100, fill: '#E9EDE2' }),
    s('path', { d: 'M26 72 44 46l12 14 10-16 14 28z', fill: '#8B958B' }),
    s('circle', { cx: 36, cy: 32, r: 7, fill: '#8B958B' }),
  ],
};

/** Foto de producto: silueta vectorial. No hay imágenes en el prototipo. */
export function productArt(kind = 'lata', size = 52) {
  const build = ART[kind] || ART.caja;
  return s('svg', {
    width: size, height: size, viewBox: '0 0 100 100',
    preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true',
  }, build());
}

/* ---------------------------------------------------------------- captcha */

const POOL = 'abcdefghjkmnpqrstuvwxyz23456789';
const GLYPH_COLORS = ['#3A463B', '#1D7A46', '#5E6B5E', '#3A463B', '#9C7208'];

export function newCaptcha(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) out += POOL[Math.floor(Math.random() * POOL.length)];
  return out;
}

/** Reproduce el SVG que emite svg-captcha: glifos rotados sobre ruido. */
export function captchaSvg(text) {
  const noise = [
    'M6 34C32 12 50 44 74 22C98 0 112 40 138 26C164 12 186 38 208 20',
    'M4 16C28 40 54 8 80 34C106 46 124 14 150 30C176 44 192 18 210 36',
    'M12 46C42 26 62 42 90 16C118 38 140 8 168 44',
  ].map((d, i) => s('path', {
    d, fill: 'none', stroke: i === 1 ? '#DFE3D6' : '#C3CBBE',
    'stroke-width': 1.6 - i * 0.1, 'stroke-linecap': 'round',
  }));

  const glyphs = [...text].map((ch, i) => {
    const x = 22 + i * 36;
    const y = 34 + (i % 2 ? 4 : -1);
    const rot = (i % 2 ? 1 : -1) * (5 + (i * 3) % 8);
    return s('text', {
      x, y, 'font-family': 'Archivo, sans-serif', 'font-size': 28 + (i % 3),
      'font-weight': 700, fill: GLYPH_COLORS[i % GLYPH_COLORS.length],
      transform: `rotate(${rot} ${x} ${y})`, text: ch,
    });
  });

  return s('svg', { width: 214, height: 52, viewBox: '0 0 214 52', role: 'img', 'aria-label': 'Captcha' }, [...noise, ...glyphs]);
}

/* ---------------------------------------------------------------- arranque */

document.addEventListener('DOMContentLoaded', () => {
  mountShell();
  document.querySelectorAll('[data-ico]').forEach((host) => {
    fill(host, icon(host.dataset.ico, 'ico', host.dataset.stroke || 2.2));
  });
});
