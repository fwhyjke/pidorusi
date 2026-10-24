// Общие оверлеи: панель, плашки и постэффекты поверх сцены. HUD у каждой серии свой (epN/art/hud.js).
const { createCanvas } = require('@napi-rs/canvas');
const C = require('./core');
const { W, H, P, clamp, lerp, prog, E, rgba, rr, text, measure, MONO, fmtHMS, glow, rng } = C;

// ---------- панель ----------
function panel(ctx, x, y, w, h, accent, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  rr(ctx, x, y, w, h, 20); ctx.fillStyle = 'rgba(7,10,18,0.62)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2; ctx.stroke();
  // уголки-скобки
  ctx.strokeStyle = accent; ctx.lineWidth = 4; const L = 22;
  ctx.beginPath(); ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x + w - L, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - L); ctx.stroke();
  ctx.restore();
}

const SCR = '#%$@&01?▓░';
function scramble(n, seed) { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += SCR[Math.floor(r() * SCR.length)]; return s; }

// ---------- плашки ----------
// pl: {t0, t1, text, color, y}
function drawPlate(ctx, t, pl) {
  const { t0, t1, color } = pl;
  if (t < t0 || t > t1 + 0.25) return;
  const kin = E.outBack(prog(t, t0, t0 + 0.32));
  const kout = 1 - E.in(prog(t, t1, t1 + 0.25));
  const a = Math.min(prog(t, t0, t0 + 0.12), kout);
  const size = pl.size || 44;
  const tw = measure(ctx, pl.text, { size, weight: 800, ls: 3 });
  const w = tw + 120, h = size + 54;
  const y = pl.y || 1430, x = W / 2 - w / 2;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(W / 2, y + (1 - kout) * -30); ctx.scale(lerp(0.7, 1, kin), lerp(0.7, 1, kin)); ctx.translate(-W / 2, -y);
  glow(ctx, W / 2, y, w * 0.7, color, 0.22);
  rr(ctx, x, y - h / 2, w, h, 16); ctx.fillStyle = 'rgba(8,11,19,0.86)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.stroke();
  // раскрытие текста слева направо
  ctx.save(); const rk = E.out(prog(t, t0 + 0.05, t0 + 0.4));
  ctx.beginPath(); ctx.rect(x, y - h, w * rk, h * 2); ctx.clip();
  const blink = (Math.floor(t * 3) % 2 === 0) ? 1 : 0.35;
  ctx.fillStyle = rgba(color, blink); ctx.fillRect(x + 32, y - 9, 18, 18);
  text(ctx, pl.text, x + 72, y + 2, { size, weight: 800, ls: 3, align: 'left', color: '#F4F7FB' });
  ctx.restore();
  // скан-полоса при появлении
  const sk = prog(t, t0, t0 + 0.45);
  if (sk > 0 && sk < 1) { ctx.fillStyle = rgba(color, 0.5 * (1 - sk)); ctx.fillRect(x + w * sk - 6, y - h / 2, 12, h); }
  ctx.restore();
}

// ---------- постэффекты ----------
const grainTex = [];
function makeGrain() {
  for (let k = 0; k < 4; k++) {
    const c = createCanvas(540, 960), x = c.getContext('2d'), d = x.createImageData(540, 960), r = rng(100 + k);
    for (let i = 0; i < d.data.length; i += 4) { const v = 100 + r() * 155; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); grainTex.push(c);
  }
}
let scan;
function makeScan() {
  scan = createCanvas(W, H); const x = scan.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1);
}
function grain(ctx, t, a = 0.07) {
  if (!grainTex.length) { makeGrain(); makeScan(); }
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a;
  ctx.drawImage(grainTex[Math.floor(t * 24) % 4], 0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(scan, 0, 0); ctx.restore();
}

// глитч: смещённые горизонтальные полосы + цветные сдвиги. src — копия кадра.
function glitch(ctx, src, k, seed) {
  if (k <= 0) return;
  const r = rng(seed);
  const n = Math.floor(4 + k * 14);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(r() * H), h = Math.floor(8 + r() * 120 * k), dx = (r() - .5) * 180 * k;
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    if (r() < 0.35) { ctx.fillStyle = r() < .5 ? rgba(P.cyan, 0.25 * k) : rgba(P.red, 0.25 * k); ctx.fillRect(0, y, W, h); }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * k;
  ctx.drawImage(src, 14 * k, 0); ctx.globalAlpha = 0.18 * k; ctx.drawImage(src, -14 * k, 0);
  ctx.restore();
}
function flash(ctx, color, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba(color, clamp(a)); ctx.fillRect(0, 0, W, H); ctx.restore(); }

module.exports = { drawPlate, grain, glitch, flash, panel, scramble };
