// Финальная карточка «Продолжение в профиле» (обязательные 2 с после сюжета). Цвета и фон — под стиль серии.
const C = require('./core');
const { W, H, E, prog, rgba, vgrad, glow, motes, text } = C;

// o: { bg: [верх, низ], text, accent, extra(ctx, lt, t) — свой элемент стиля серии (символ, таймер, логотип) }
function drawEndCard(ctx, lt, t, { bg = ['#05070D', '#020306'], text: tc = '#F4F7FB', accent = '#4FE3FF', extra = null, line1 = 'ПРОДОЛЖЕНИЕ', line2 = 'В ПРОФИЛЕ' } = {}) {
  ctx.fillStyle = vgrad(ctx, 0, H, [[0, bg[0]], [1, bg[1]]]); ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, 1000, 650, accent, 0.12);
  motes(ctx, t, { n: 50, seed: 101, color: accent, a: 0.25, size: 2, drift: 6 });
  // строки раскрываются слева направо
  const rev = (a, b) => E.out(prog(lt, a, b));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 860, W * rev(0.1, 0.55), 150); ctx.clip();
  text(ctx, line1, W / 2, 940, { size: 100, weight: 900, color: tc, ls: 5 });
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 990, W * rev(0.3, 0.75), 150); ctx.clip();
  glow(ctx, W / 2, 1065, 360, accent, 0.2);
  text(ctx, line2, W / 2, 1065, { size: 100, weight: 900, color: accent, ls: 5 });
  ctx.restore();
  if (extra) extra(ctx, lt, t);
}

module.exports = { drawEndCard };
