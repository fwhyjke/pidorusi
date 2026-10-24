// Рендер ролика: кадры canvas -> ffmpeg. Серия — папка epN с timeline.js (см. CLAUDE.md, «Стек генерации видео»). Без --ep рендерится ep_template.
//   node render.js --ep epN --still 1.5,12,40   контрольные кадры в out/stills
//   node render.js --ep epN --workers 8         полный рендер -> ../tmp/video.mp4 (+ outer.mp3), ../tmp/video_voice.mp4 (+ voice.mp3)
//   node render.js --from 0 --to 300 --out f.mp4   внутренний режим воркера (номера кадров)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');
const C = require('./lib/core');
const O = require('./lib/overlay');

const { W, H, FPS } = C;
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const EP = arg('ep', 'ep_template');
const TL = require(`./${EP}/timeline`);
const TMP = path.join(__dirname, '..', 'tmp');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const sceneCv = createCanvas(W, H), sctx = sceneCv.getContext('2d');
const mainCv = createCanvas(W, H), mctx = mainCv.getContext('2d');
const fxCv = createCanvas(W, H), fctx = fxCv.getContext('2d');

function frame(t) {
  const sc = TL.sceneAt(t);
  const lt = t - sc.t0, d = sc.t1 - sc.t0;
  sctx.save(); sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
  sctx.fillStyle = '#000'; sctx.fillRect(0, 0, W, H);
  sc.draw(sctx, lt, t, d);
  sctx.restore();

  const fx = TL.fxAt(t);
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H);
  const z = 1 + fx.shake * 0.04 + fx.punch;
  const dx = (Math.sin(t * 91) + Math.sin(t * 57)) * 22 * fx.shake, dy = (Math.cos(t * 83) + Math.sin(t * 41)) * 22 * fx.shake;
  mctx.save(); mctx.translate(W / 2 + dx, H / 2 + dy); mctx.scale(z, z); mctx.drawImage(sceneCv, -W / 2, -H / 2); mctx.restore();
  C.vignette(mctx, 0.55);
  O.grain(mctx, t, 0.06);

  const hud = TL.hudAt(t);
  if (hud) TL.drawHUD(mctx, hud);
  for (const pl of TL.plates) O.drawPlate(mctx, t, pl);

  if (fx.flash) O.flash(mctx, fx.flash[0], fx.flash[1]);
  if (fx.glitch > 0) {
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.drawImage(mainCv, 0, 0);
    O.glitch(mctx, fxCv, fx.glitch, Math.floor(t * FPS));
  }
  if (fx.black > 0) { mctx.fillStyle = `rgba(0,0,0,${fx.black})`; mctx.fillRect(0, 0, W, H); }
  return mainCv;
}

async function renderRange(f0, f1, file) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) {
    const cv = frame(f / FPS);
    const buf = Buffer.from(cv.data());
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
}

async function main() {
  if (arg('still')) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const files = [];
    for (const s of arg('still').split(',')) {
      const t = parseFloat(s); const cv = frame(t);
      const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(f, cv.toBuffer('image/png')); files.push(f);
    }
    // контактный лист: все кадры в уменьшенном виде на одной картинке — для быстрой проверки
    const cols = Math.min(5, files.length), cw = 360, ch = 640;
    const sheet = path.join(OUT, 'sheet.png');
    const fc = files.map((_, i) => `[${i}:v]scale=${cw}:${ch}[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') +
      (files.length > 1 ? `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * cw}_${Math.floor(i / cols) * ch}`).join('|')}:fill=black` : 'null');
    await ff([...files.flatMap(f => ['-i', f]), '-filter_complex', fc, sheet]);
    console.log(sheet);
    return;
  }
  if (arg('from') != null) { await renderRange(+arg('from'), +arg('to'), arg('out')); return; }

  const total = Math.round(TL.DURATION * FPS);
  const n = +arg('workers', 6);
  const a = +arg('start', 0), b = arg('end') != null ? Math.round(+arg('end') * FPS) : total;
  const per = Math.ceil((b - Math.round(a * FPS)) / n);
  const jobs = [], parts = [];
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const f0 = Math.round(a * FPS) + i * per, f1 = Math.min(b, f0 + per);
    if (f0 >= f1) break;
    const file = path.join(OUT, `part${i}.mp4`); parts.push(file);
    jobs.push(new Promise((res, rej) => {
      const p = spawn(process.execPath, [__filename, '--ep', EP, '--from', String(f0), '--to', String(f1), '--out', file], { stdio: 'inherit' });
      p.on('close', c => (c === 0 ? res() : rej(new Error('worker ' + i))));
    }));
  }
  await Promise.all(jobs);
  const list = path.join(OUT, 'parts.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  const dst = arg('dst', path.join(TMP, 'video_noaudio.mp4'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  await ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', dst]);
  // склейка со звуком: фон -> video.mp4, фон + голос -> video_voice.mp4 (превью для проверки синхрона)
  const outer = path.join(TMP, 'outer.mp3'), voice = path.join(TMP, 'voice.mp3');
  if (arg('dst') == null && fs.existsSync(outer)) {
    await ff(['-i', dst, '-i', outer, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(TMP, 'video.mp4')]);
    if (fs.existsSync(voice)) await ff(['-i', dst, '-i', outer, '-i', voice, '-filter_complex', '[2:a]aformat=channel_layouts=stereo[v];[1:a][v]amix=inputs=2:duration=first:normalize=0[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', path.join(TMP, 'video_voice.mp4')]);
    fs.unlinkSync(dst);
    console.log('done', path.join(TMP, 'video.mp4'), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  } else console.log('done', dst, '(без звука: нет tmp/outer.mp3)', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
const ff = a => new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }).on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
main().catch(e => { console.error(e); process.exit(1); });
