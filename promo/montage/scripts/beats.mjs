// Grille rythmique d'un son (extrait Deezer de la musique TikTok choisie), pour caler coupes et effets sur le temps.
// node scripts/beats.mjs public/ref/ronisia.mp3 → public/ref/ronisia.beats.json { bpm, beats: [s], bars: [s], drop: s }
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dir } from "@remotion/compositor-win32-x64-msvc";

const file = process.argv[2];
const SR = 11025;
const HOP = 256;
const raw = execFileSync(
  `${dir}/ffmpeg.exe`,
  [
    "-v",
    "error",
    "-i",
    file,
    "-ac",
    "1",
    "-ar",
    String(SR),
    "-c:a",
    "pcm_s16le",
    "-f",
    "wav",
    "-",
  ],
  {
    maxBuffer: 1 << 30,
  },
);
const data = raw.indexOf("data") + 8;
const pcm = new Float32Array((raw.length - data) >> 1).map(
  (_, i) => raw.readInt16LE(data + 2 * i) / 32768,
);
// Passe-bas (moyenne glissante ~275 Hz) : la grosse caisse et la basse donnent le tempo bien plus sûrement que le signal entier
{
  const lp = new Float32Array(pcm.length);
  let acc = 0;
  for (let i = 0; i < pcm.length; i++) {
    acc += pcm[i] - (i >= 40 ? pcm[i - 40] : 0);
    lp[i] = acc / 40;
  }
  pcm.set(lp);
}
const fps = SR / HOP;
const n = Math.floor(pcm.length / HOP);

const energy = new Float32Array(n);
for (let i = 0; i < n; i++) {
  let s = 0;
  for (let j = i * HOP; j < (i + 1) * HOP; j++) s += pcm[j] * pcm[j];
  energy[i] = Math.log(1e-6 + s / HOP);
}
const onset = energy.map((e, i) => (i ? Math.max(0, e - energy[i - 1]) : 0));
const at = (x) => {
  const i = Math.floor(x);
  return i + 1 < n ? onset[i] + (onset[i + 1] - onset[i]) * (x - i) : 0;
};

// Tempo par autocorrélation, sans préférence de tempo (une pondération vers 110 faussait 78 → 103)
let best = { score: -1 };
for (let bpm = 70; bpm <= 180; bpm += 0.25) {
  const lag = (60 / bpm) * fps;
  let score = 0;
  for (let i = 0; i + lag * 4 < n; i++)
    score +=
      onset[i] * (at(i + lag) + 0.5 * at(i + 2 * lag) + 0.25 * at(i + 4 * lag));
  if (score > best.score) best = { score, lag, bpm };
}
// Au-delà de 140, on compte en blanches (154 → 77) : rythme de coupe lisible
if (best.bpm > 140) best = { ...best, bpm: best.bpm / 2, lag: best.lag * 2 };
// Phase qui tombe le plus sur les attaques, puis premier temps de mesure
let phase = { score: -1, off: 0 };
for (let off = 0; off < best.lag; off += 0.25) {
  let score = 0;
  for (let x = off; x < n; x += best.lag) score += at(x);
  if (score > phase.score) phase = { score, off };
}
const beats = [];
for (let x = phase.off; x < n; x += best.lag) beats.push(+(x / fps).toFixed(3));
let bar0 = 0;
let barScore = -1;
for (let k = 0; k < 4; k++) {
  let s = 0;
  for (let i = k; i < beats.length; i += 4) s += at(beats[i] * fps);
  if (s > barScore) [barScore, bar0] = [s, k];
}
const bars = beats.filter((_, i) => i >= bar0 && (i - bar0) % 4 === 0);
// Drop : mesure dont l'énergie dépasse le plus celle des deux précédentes
const barEnergy = bars.map((b, i) => {
  let s = 0;
  let c = 0;
  for (
    let f = Math.floor(b * fps);
    f < (bars[i + 1] ?? b + (4 * best.lag) / fps) * fps && f < n;
    f++, c++
  )
    s += energy[f];
  return c ? s / c : -99;
});
let drop = bars[0];
let jump = -Infinity;
for (let i = 2; i < bars.length - 1; i++) {
  const d = barEnergy[i] - (barEnergy[i - 1] + barEnergy[i - 2]) / 2;
  if (d > jump) [jump, drop] = [d, bars[i]];
}
writeFileSync(
  file.replace(/\.mp3$/, ".beats.json"),
  JSON.stringify({ bpm: best.bpm, beats, bars, drop }),
);
console.log(
  `${file} : ${best.bpm} BPM, 1er temps de mesure ${bars[0]} s, drop ${drop} s`,
);
