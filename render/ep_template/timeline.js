// Таймлайн ролика. Заготовка: скопируй папку в render/epN и замени сцены, HUD, плашки и биты по раскадровке.
// Время — секунды ролика. Сюжет 0–110 с (по tmp/words.json), затем 2 с финальной карточки.
const C = require('../lib/core');
const { lerp, prog, E } = C;
const { makeTimeline } = require('../lib/tl');
const { drawHUD } = require('./art/hud');
const SC = require('./scenes');
const PAL = require('./palette');

const STORY = 110.0, DURATION = STORY + 2.0;

// [id, t0, t1, draw, hud]. Склейки — в паузах между фразами озвучки, сцены по 3.5–6.5 с.
// hud: clock — время истории в сцене, value [от, до] — показатель на шкале (интерполяция по сцене)
const S = [
  [1, 0.0, 5.0, SC.placeholder('СЦЕНА 1'), { clock: '06:00', value: [10, 20] }],
  [2, 5.0, 10.0, SC.placeholder('СЦЕНА 2', PAL.danger), { clock: '06:02', value: [20, 35] }],
  [3, 10.0, 55.0, SC.placeholder('СЦЕНЫ 3…'), { clock: '06:10', value: [35, 60] }],
  [4, 55.0, 105.0, SC.placeholder('…СЦЕНЫ N', PAL.safe), { clock: '07:00', value: [60, 90] }],
  [5, 105.0, STORY, SC.placeholder('КЛИФФХЭНГЕР', PAL.danger), { clock: '07:30', value: [90, 100] }],
  [99, STORY, DURATION, SC.endCard, null], // финальная карточка: не трогать, кроме оформления
];
const scenes = S.map(([id, t0, t1, draw, hud]) => ({ id, t0, t1, draw, hud }));

// плашки: короткие метки на важных событиях (появляются на бите, держатся 1.5–3 с, исчезают до конца сцены)
const plates = [
  { t0: 1.0, t1: 4.6, text: 'ПРИМЕР ПЛАШКИ', color: PAL.danger },
];

// биты: эффекты на ударных словах (t — начало слова из words.json)
const beats = [
  { t: 2.0, flash: [PAL.key, 0.5], shake: 0.8, dur: 0.35 },
  { t: 7.5, glitch: 0.6, dur: 0.2 },
];

const TL = makeTimeline({ scenes, beats, storyEnd: STORY });

function hudAt(t) {
  if (t >= STORY - 0.1) return null; // HUD уходит вместе с сюжетом
  const s = TL.sceneAt(t), k = prog(t, s.t0, s.t1);
  return { t, intro: prog(t, 0.2, 0.8), clock: s.hud.clock, value: lerp(s.hud.value[0], s.hud.value[1], E.inOut(k)), valueColor: s.hud.value[1] > 80 ? PAL.danger : PAL.key };
}

module.exports = { DURATION, STORY, scenes, sceneAt: TL.sceneAt, hudAt, drawHUD, fxAt: TL.fxAt, plates, beats };
