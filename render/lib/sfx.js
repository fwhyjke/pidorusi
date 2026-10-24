// Синтез фонового звука: микс-буфер, примитивы (тон, шум, щелчок, удар), запись WAV -> MP3.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 44100, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));

function createMix(dur, seed = 7) {
  const N = Math.round(SR * dur);
  const L = new Float32Array(N), R = new Float32Array(N);
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  function put(i, v, pan = 0) { if (i < 0 || i >= N) return; L[i] += v * (1 - Math.max(0, pan)); R[i] += v * (1 + Math.min(0, pan)); }
  // тон с экспоненциальным спадом (dec) или ровный; f1 — глиссандо
  function tone(t0, d, f, amp, { att = 0.005, dec = null, type = 'sine', pan = 0, f1 = null } = {}) {
    const n = Math.round(d * SR), i0 = Math.round(t0 * SR); let ph = 0;
    for (let k = 0; k < n; k++) {
      const tt = k / SR, fr = f1 ? f + (f1 - f) * (k / n) : f; ph += TAU * fr / SR;
      const w = type === 'sine' ? Math.sin(ph) : type === 'saw' ? ((ph / TAU) % 1) * 2 - 1 : Math.sign(Math.sin(ph));
      const env = Math.min(1, tt / att) * (dec ? Math.exp(-tt / dec) : Math.min(1, (d - tt) / 0.05));
      put(i0 + k, w * amp * env, pan);
    }
  }
  // шум через однополюсный ФНЧ (lp: 0.01 — гул, 0.8 — шипение); env(k) — своя огибающая по доле длительности
  function noise(t0, d, amp, { lp = 0.1, att = 0.01, dec = null, pan = 0, env = null } = {}) {
    const n = Math.round(d * SR), i0 = Math.round(t0 * SR); let y = 0;
    for (let k = 0; k < n; k++) {
      const tt = k / SR; y += lp * ((rnd() * 2 - 1) - y);
      const e = env ? env(tt / d) : Math.min(1, tt / att) * (dec ? Math.exp(-tt / dec) : Math.min(1, (d - tt) / 0.05));
      put(i0 + k, y * amp * e, pan);
    }
  }
  const click = (t, amp = 0.3, f = 2400) => { tone(t, 0.03, f, amp, { dec: 0.006 }); noise(t, 0.02, amp * 0.6, { lp: 0.6, dec: 0.004 }); };
  const thud = (t, amp = 0.5) => { tone(t, 0.6, 70, amp, { dec: 0.18, f1: 38 }); noise(t, 0.15, amp * 0.4, { lp: 0.05, dec: 0.05 }); };

  // нормализация к пику peak (0.28 ≈ -11 dBFS) и запись; gain(t) — множитель громкости по времени (тишина, затухание)
  function save(mp3, { peak = 0.28, gain = () => 1, wav = null } = {}) {
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const g = peak / pk;
    const buf = Buffer.alloc(44 + N * 4);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
    for (let i = 0; i < N; i++) {
      const f = gain(i / SR);
      buf.writeInt16LE(Math.round(clamp(L[i] * g * f, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g * f, -1, 1) * 32767), 46 + i * 4);
    }
    wav = wav || mp3.replace(/\.mp3$/, '.wav');
    fs.mkdirSync(path.dirname(wav), { recursive: true }); fs.mkdirSync(path.dirname(mp3), { recursive: true }); fs.writeFileSync(wav, buf);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3]);
    return { gain: g, wav };
  }

  return { SR, N, L, R, TAU, rnd, put, tone, noise, click, thud, save };
}

module.exports = { SR, TAU, clamp, prog, createMix };
