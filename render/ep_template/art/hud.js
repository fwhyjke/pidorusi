// HUD-заготовка: время истории слева, один показатель со шкалой справа. Подписи, цвета и показатели меняй под сюжет.
const C = require('../../lib/core');
const { panel } = require('../../lib/overlay');
const PAL = require('../palette');
const { W, E, clamp, rr, text, glow, MONO } = C;

const LABELS = { clock: 'ВРЕМЯ', value: 'ПОКАЗАТЕЛЬ' };

// st: { t, intro (0..1), clock: '06:14', value (0..100), valueColor }
function drawHUD(ctx, st) {
  const ia = E.out(st.intro);
  if (ia <= 0) return;
  ctx.save(); ctx.translate(0, (1 - ia) * -60); ctx.globalAlpha = ia;
  const y0 = 84, h = 136;
  // время истории
  panel(ctx, 44, y0, 300, h, 'rgba(238,243,248,0.7)');
  text(ctx, LABELS.clock, 70, y0 + 34, { size: 22, weight: 700, color: 'rgba(200,212,235,0.7)', align: 'left', ls: 4 });
  text(ctx, st.clock, 68, y0 + 90, { size: 70, weight: 700, font: MONO, color: PAL.ink, align: 'left' });
  // показатель
  const cw = 440, cx = W - 44 - cw, col = st.valueColor || PAL.key;
  panel(ctx, cx, y0, cw, h, col);
  text(ctx, LABELS.value, cx + 26, y0 + 34, { size: 22, weight: 700, color: 'rgba(200,212,235,0.7)', align: 'left', ls: 4 });
  const bx = cx + 26, bw = cw - 170, by = y0 + 80, bh = 18, v = clamp(st.value / 100);
  rr(ctx, bx, by, bw, bh, 9); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  rr(ctx, bx, by, Math.max(bh, bw * v), bh, 9); ctx.fillStyle = col; ctx.fill();
  glow(ctx, bx + bw * v, by + bh / 2, 50, col, 0.4);
  text(ctx, `${Math.round(st.value)} %`, cx + cw - 24, y0 + 90, { size: 44, weight: 700, font: MONO, color: col, align: 'right' });
  ctx.restore();
}

module.exports = { drawHUD, LABELS };
