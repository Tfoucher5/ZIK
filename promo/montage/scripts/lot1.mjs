// Lot 1 (look natif TikTok, sans charte ZIK) : quiz rébus emoji en vidéo + carrousel photo.
// node scripts/lot1.mjs → out/lot1/quiz/*.png, out/lot1/carrousel/*.png, out/lot1/quiz-rebus.mp4
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const OUT = "out/lot1";
const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=TikTok+Sans:wght@500;700;800&family=Noto+Color+Emoji&display=block" rel="stylesheet">';
const CSS = `*{margin:0;box-sizing:border-box}body{font-family:'TikTok Sans',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;text-align:center}
.e{font-family:'Noto Color Emoji';line-height:1.15}
.b{display:inline-block;background:#fff;color:#000;font-weight:700;border-radius:14px;padding:10px 22px;line-height:1.25;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.k{background:#000;color:#fff}.t{background:none;color:#fff;font-weight:800;text-shadow:0 0 6px rgba(0,0,0,.55),0 2px 2px rgba(0,0,0,.4)}`;

// Quiz : 5 rébus, du plus facile au plus dur. Réponses (commentaire épinglé, jamais à l'écran) :
// Le lion est mort ce soir · Les démons de minuit · Dernière danse · Coup de soleil · Mistral gagnant
const REBUS = ["🦁💀🌙", "😈😈🕛", "🔚💃", "👊☀️", "🌬️🏆"];
const NIV = ["facile", "ça va", "hmm", "dur", "impossible"];
const quizBg = "#f2ece1";
const quiz = [
  [
    `<span class="b k" style="font-size:66px">devine la chanson<br>avec les emojis 🎵</span>
     <span class="b" style="font-size:44px">5 titres, le dernier personne l'a</span>`,
    2.6,
  ],
  ...REBUS.flatMap((r, i) => [
    [
      `<span class="b k" style="font-size:52px">${i + 1}/5 · ${NIV[i]}</span>
       <div class="e" style="font-size:${[...new Intl.Segmenter().segment(r)].length > 2 ? 205 : 290}px;white-space:nowrap">${r}</div>`,
      3.4 + i * 0.4,
    ],
  ]),
  [
    `<span class="b k" style="font-size:60px">t'en as eu combien ?</span>
     <span class="b" style="font-size:46px">réponses dans les com 👇<br>(pas de triche)</span>`,
    3,
  ],
];

// Carrousel : sorties 1996 (années vérifiées)
const SONS = [
  [
    "Spice Girls",
    "Wannabe",
    "juillet 1996",
    "#ff8fb1",
    "tout le monde connaît le couplet de Mel B, personne ne sait le chanter",
  ],
  [
    "Gala",
    "Freed From Desire",
    "août 1996",
    "#8fd3ff",
    "encore chantée dans les stades aujourd'hui",
  ],
  ["Khaled", "Aïcha", "1996", "#ffd36b", "écrite par Jean-Jacques Goldman"],
  [
    "Fugees",
    "Killing Me Softly",
    "1996",
    "#c3a3ff",
    "une reprise du tube de Roberta Flack (1973)",
  ],
  [
    "Blackstreet",
    "No Diggity",
    "juillet 1996",
    "#9be3b4",
    "avec Dr. Dre dessus",
  ],
  [
    "Carrapicho",
    "Tic Tic Tac",
    "juin 1996",
    "#ffab7a",
    "le tube de l'été 96 en France",
  ],
];
const carrousel = [
  [
    "#1d1d1d",
    `<span class="b" style="font-size:78px">ces sons ont<br>30 ans en 2026</span>
     <span class="t" style="font-size:46px">désolé 💀</span>`,
  ],
  ...SONS.map(([a, t, d, bg, note], i) => [
    bg,
    `<span class="t" style="font-size:40px;color:#000;text-shadow:none;font-weight:700">${i + 1}/6</span>
     <span class="b k" style="font-size:72px">${t}</span>
     <span class="b" style="font-size:48px">${a} · ${d}</span>
     <div style="max-width:760px;line-height:1.7"><span class="b" style="display:inline;font-size:40px;font-weight:500;padding:6px 18px">${note}</span></div>`,
  ]),
  [
    "#1d1d1d",
    `<span class="b" style="font-size:64px">lequel t'a fait<br>le plus mal ? 👇</span>
     <span class="t" style="font-size:38px;font-weight:700;max-width:800px">nous on en fait des blind tests sur zik-music.fr</span>`,
  ],
];

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
async function shoot(file, w, h, bg, body) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(
    `<html><head>${FONTS}<style>${CSS}body{width:${w}px;height:${h}px;background:${bg}}</style></head><body>${body}</body></html>`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
}

mkdirSync(`${OUT}/quiz`, { recursive: true });
mkdirSync(`${OUT}/carrousel`, { recursive: true });
// Quiz : contenu centré dans la zone sûre (y 160–1480) → padding bas pour remonter le centre
let list = "";
for (const [i, [body, d]] of quiz.entries()) {
  const f = `${OUT}/quiz/${i}.png`;
  await shoot(
    f,
    1080,
    1920,
    quizBg,
    `<div style="display:contents">${body}</div><div style="height:260px"></div>`,
  );
  list += `file '${i}.png'\nduration ${d}\n`;
}
list += `file '${quiz.length - 1}.png'\n`;
writeFileSync(`${OUT}/quiz/list.txt`, list);
for (const [i, [bg, body]] of carrousel.entries())
  await shoot(
    `${OUT}/carrousel/${i + 1}.png`,
    1080,
    1350,
    bg,
    `<div style="display:contents">${body}</div><div style="height:180px"></div>`,
  );
await browser.close();

execFileSync(FF, [
  "-y",
  "-loglevel",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  `${OUT}/quiz/list.txt`,
  "-r",
  "30",
  "-pix_fmt",
  "yuv420p",
  "-c:v",
  "libx264",
  "-crf",
  "18",
  "-movflags",
  "+faststart",
  `${OUT}/quiz-rebus.mp4`,
]);
console.log("ok");
