// Сцены-заглушки. Каждую замени своей отрисовкой: draw(ctx, lt, t, d) — lt — время от начала сцены, t — время ролика, d — длительность.
// Рисуй в координатах 1080×1920, главное — в центре; камеру двигай через C.cam.
const C = require('../lib/core');
const { drawEndCard } = require('../lib/endcard');
const PAL = require('./palette');
const { W, H, E, prog, lerp, rgba, vgrad, glow, pool, fog, motes, text, cam } = C;

// заглушка: фон с глубиной, свет, туман, крупная подпись и медленный наезд камеры
function placeholder(label, accent = PAL.key) {
  return (ctx, lt, t, d) => {
    ctx.save(); cam(ctx, { x: W / 2, y: H / 2, z: lerp(1.0, 1.08, E.inOut(prog(lt, 0, d))) });
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, PAL.bg[0]], [1, PAL.bg[1]]]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba('#ffffff', 0.03); ctx.fillRect(0, 1400, W, H - 1400);
    pool(ctx, W / 2, 1450, 520, 120, accent, 0.25);
    glow(ctx, W / 2, 900, 600, accent, 0.18);
    fog(ctx, t, { y0: 1100, y1: 1700, color: '#8DA2C8', a: 0.1 });
    motes(ctx, t, { n: 40, color: accent, a: 0.3 });
    text(ctx, label, W / 2, 900, { size: 72, weight: 900, color: PAL.ink, ls: 4 });
    text(ctx, `${(t - lt).toFixed(1)}–${(t - lt + d).toFixed(1)} с · заменить`, W / 2, 990, { size: 30, weight: 600, color: rgba(PAL.ink, 0.5) });
    ctx.restore();
  };
}

// финальная карточка: общая из lib/endcard, цвета — из палитры. extra — место для мотива серии.
const endCard = (ctx, lt, t) => drawEndCard(ctx, lt, t, { bg: PAL.bg, text: PAL.ink, accent: PAL.key });

module.exports = { placeholder, endCard };
