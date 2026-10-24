// Базовые утилиты: математика, цвет, примитивы рисования, атмосфера.
const W = 1080, H = 1920, FPS = 30;

// Палитра серии 1 (тёмный хоррор, акценты: красный — опасность, циан — ИИ/ключевое, янтарь — безопасно). Новая серия задаёт свою.
const P = {
  bg0: '#0B0F1A', bg1: '#121828', bg2: '#1B2336', bg3: '#273049', bg4: '#36405C',
  red: '#FF3B47', cyan: '#4FE3FF', cyanDeep: '#0FAFD2', amber: '#FFB547',
  white: '#EEF3F8', ink: '#05070C',
  skin: '#C9937A', skinD: '#9C6B57', skinL: '#E2B49C',
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = k => k * k * (3 - 2 * k);
const E = {
  inOut: k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  outExpo: k => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  outBack: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)); }
function noise2(x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
  const h = (a, b) => hash(a * 57.0 + b * 131.0);
  return lerp(lerp(h(i, j), h(i + 1, j), fx), lerp(h(i, j + 1), h(i + 1, j + 1), fx), fy);
}

// ---------- цвет ----------
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a = 1) { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, k) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(k))).toString(16).padStart(2, '0')).join('');
}
const shade = (h, k) => (k >= 0 ? mix(h, '#ffffff', k) : mix(h, '#000000', -k));

// ---------- пути ----------
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function poly(ctx, pts, fill, stroke, lw = 2) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
function ellipse(ctx, x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function hgrad(ctx, x0, x1, stops) { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }

// ---------- свет ----------
// мягкое пятно света, аддитивно
function glow(ctx, x, y, r, color, a = 1, op = 'lighter') {
  if (r <= 0 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.35, rgba(color, a * 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// эллиптическое пятно (световая лужа на полу)
function pool(ctx, x, y, rx, ry, color, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); glow(ctx, 0, 0, rx, color, a); ctx.restore();
}
// луч/конус света из точки
function beam(ctx, x, y, ang, spread, len, color, a = .25) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, len);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
  ctx.arc(x, y, len, ang - spread, ang + spread); ctx.closePath(); ctx.fill(); ctx.restore();
}
function vignette(ctx, k = .7, color = '#000') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// слои тумана: мягкие эллипсы, дрейфуют
function fog(ctx, t, { y0 = 0, y1 = H, color = '#8DA2C8', a = .12, n = 7, seed = 3, speed = 18, scale = 1 } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const bx = r() * W * 1.6 - W * .3, by = lerp(y0, y1, r()), rx = (380 + r() * 520) * scale, ry = (90 + r() * 140) * scale;
    const x = ((bx + t * speed * (0.5 + r())) % (W + rx * 2)) - rx;
    pool(ctx, x, by, rx, ry, color, a * (0.6 + r() * .6));
  }
  ctx.restore();
}
// парящие частицы/пыль
function motes(ctx, t, { n = 60, seed = 9, color = '#ffffff', a = .5, area = [0, 0, W, H], size = 3, drift = 12 } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const [x0, y0, w, h] = area;
    const px = x0 + ((r() * w + Math.sin(t * 0.4 + i) * drift + t * drift * (r() - .5)) % w + w) % w;
    const py = y0 + ((r() * h - t * drift * (0.3 + r())) % h + h) % h;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + i);
    circle(ctx, px, py, size * (0.4 + r()), rgba(color, a * tw));
  }
  ctx.restore();
}

// ---------- текст ----------
function text(ctx, s, x, y, { size = 40, weight = 700, font = 'Inter', color = '#fff', align = 'center', base = 'middle', ls = 0, a = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= a; ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = `${ls}px`;
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function measure(ctx, s, { size = 40, weight = 700, font = 'Inter', ls = 0 } = {}) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = `${ls}px`; const m = ctx.measureText(s).width; ctx.restore(); return m;
}
const MONO = 'JetBrainsMono Nerd Font Mono';
const fmtHMS = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, c = s % 60; return [h, m, c].map(v => String(v).padStart(2, '0')).join(':'); };
const hms = (h, m, s) => h * 3600 + m * 60 + s;
const money = v => Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ').replace(/ /g, ' ') + ' ₽';

// ---------- камера ----------
// масштаб/сдвиг относительно точки фокуса (fx,fy) мира, выводится в центр (cx,cy)
function cam(ctx, { x = W / 2, y = H / 2, z = 1, rot = 0, cx = W / 2, cy = H / 2 } = {}) {
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-x, -y);
}

module.exports = { W, H, FPS, P, clamp, lerp, prog, smooth, E, rng, hash, noise1, noise2, hex2rgb, rgba, mix, shade, rr, poly, circle, ellipse, vgrad, hgrad, glow, pool, beam, vignette, fog, motes, text, measure, MONO, fmtHMS, hms, money, cam };
