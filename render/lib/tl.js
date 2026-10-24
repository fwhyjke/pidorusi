// Общая логика таймлайна: поиск сцены, эффекты на склейках и битах, чернота перед финальной карточкой.
const C = require('./core');
const { prog } = C;

// scenes: [{id, t0, t1, draw}], beats: [{t, glitch, flash: [цвет, сила], shake, punch, dur}]
// storyEnd — конец сюжета (110.0); 0.1 с перед ним — чернота перед финальной карточкой. softCuts — id сцен с мягкой склейкой.
function makeTimeline({ scenes, beats = [], storyEnd = 110.0, cutGlitch = 0.55, softCuts = [] }) {
  const soft = new Set(softCuts);
  function sceneAt(t) { for (const s of scenes) if (t < s.t1) return s; return scenes[scenes.length - 1]; }
  function fxAt(t) {
    const fx = { shake: 0, glitch: 0, flash: null, punch: 0, black: 0 };
    for (const s of scenes) {
      if (s.t0 === 0) continue;
      const k = 1 - (t - s.t0) / 0.13;
      if (t >= s.t0 && k > 0) fx.glitch = Math.max(fx.glitch, (soft.has(s.id) ? 0.2 : cutGlitch) * k);
    }
    for (const b of beats) {
      if (t < b.t || t > b.t + b.dur) continue;
      const k = 1 - (t - b.t) / b.dur, kk = k * k;
      if (b.glitch) fx.glitch = Math.max(fx.glitch, b.glitch * k);
      if (b.shake) fx.shake = Math.max(fx.shake, b.shake * kk);
      if (b.punch) fx.punch = Math.max(fx.punch, b.punch * kk);
      if (b.flash && (!fx.flash || fx.flash[1] < b.flash[1] * kk)) fx.flash = [b.flash[0], b.flash[1] * kk];
    }
    if (t >= storyEnd - 0.1 && t < storyEnd) fx.black = 1;
    return fx;
  }
  // доля прохождения сцены (0..1) — удобно для HUD
  const sceneProg = t => { const s = sceneAt(t); return prog(t, s.t0, s.t1); };
  return { sceneAt, fxAt, sceneProg };
}

module.exports = { makeTimeline };
