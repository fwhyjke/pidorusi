// Фоновый звук ролика (без голоса). Заготовка: дрон по интенсивности сюжета, щелчки на склейках, удары на битах, звон на финальной карточке.
// Свои звуки событий добавляй по раскадровке: tone / noise / click / thud из lib/sfx.js.
const { clamp, prog } = require('../lib/sfx');
const TL = require('./timeline');

module.exports = function build(M) {
  const { SR, N, TAU, rnd, put, tone, noise, click, thud } = M;
  const story = TL.STORY, end = TL.DURATION;

  // интенсивность дрона по времени: нарастает к клиффхэнгеру; замени на кривую своего сюжета
  const level = t => (t < story ? 0.3 + 0.7 * prog(t, 0, story) : 0);
  let p1 = 0, p2 = 0, y = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, c = level(t);
    p1 += TAU * 55 / SR; p2 += TAU * 82.7 / SR; y += 0.01 * ((rnd() * 2 - 1) - y);
    put(i, c * (Math.sin(p1) * 0.22 + Math.sin(p2) * 0.1 * (0.6 + 0.4 * Math.sin(TAU * 0.11 * t)) + y * 0.9) * 0.5);
  }
  // щелчок на каждой склейке, удар на каждом бите со встряской
  TL.scenes.forEach(s => { if (s.t0 > 0 && s.t0 < story) click(s.t0, 0.12, 1800); });
  TL.beats.forEach(b => { if (b.shake) thud(b.t, 0.4 * b.shake); else click(b.t, 0.15, 2600); });
  // финальная карточка: мягкий удар и звон
  thud(story, 0.35); tone(story, 1.9, 1318, 0.035, { dec: 0.8 }); tone(story, 1.9, 659, 0.04, { dec: 1.0 }); tone(story, 2.0, 55, 0.08, { att: 0.3 });

  // тишина 0.1 с перед карточкой и затухание в конце
  // peak — пик после нормализации: фон должен быть тихим (средний уровень около −33 дБ), голос ляжет поверх
  return { peak: 0.15, gain: t => (t > story - 0.1 && t < story ? 0 : t > end - 0.4 ? clamp((end - t) / 0.4) : 1) };
};
