// Фоновый звук серии: node audio.js --ep epN [--dst путь.mp3]  ->  ../tmp/outer.mp3 (WAV копия в out/). Без --ep — ep_template.
const path = require('path');
const { createMix } = require('./lib/sfx');

const args = process.argv.slice(2);
const ep = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : 'ep_template';
const { DURATION } = require(`./${ep}/timeline`);
const M = createMix(DURATION);
const opts = require(`./${ep}/audio`)(M) || {};
const mp3 = args.includes('--dst') ? path.resolve(args[args.indexOf('--dst') + 1]) : path.join(__dirname, '..', 'tmp', 'outer.mp3');
const r = M.save(mp3, { gain: opts.gain, peak: opts.peak, wav: path.join(__dirname, 'out', 'outer.wav') });
console.log('done', mp3, 'peak gain', r.gain.toFixed(3));
