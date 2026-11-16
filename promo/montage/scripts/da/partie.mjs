// Vidéo « Feuille de match » en DA réseaux (1080×1920) : une vraie partie, notée à la main case par case.
// Papier animé image par image (pose puis tremblé), jamais d'interpolation. Zone sûre x 60–940, y 160–1480.
// Fin : carte « blind test multijoueur » (retour de Théo). Son : vrais sons de la TV ZIK, jamais de musique.
// node scripts/da/partie.mjs [--essai 0,3.2,9.5] → out/lot1-da/feuille-de-match-v2.mp4 (ou images d'essai)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  BLANC,
  VERT,
  bande,
  bandeau,
  colle,
  j,
  lancer,
  page,
  rng,
} from "./kit.mjs";

const FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const OUT = "out/lot1-da";
const REC = "public/rec/lot1-partie";
const FPS = 30;
const SONS = "../../../ZIK/static/sounds"; // dépôt principal, sons CC0 (CREDITS.txt)
const idx = JSON.parse(readFileSync(`${REC}/index.json`, "utf8")).frames;
const plan = (t) => {
  let a = 0,
    b = idx.length - 1;
  while (a < b) {
    const m = (a + b + 1) >> 1;
    if (idx[m][1] <= t) a = m;
    else b = m - 1;
  }
  return pathToFileURL(`${REC}/${idx[a][0]}`).href;
};

// Années 80, 7/10. src = seconde du rush, d = durée, m = manche, ev = [instant, élément], zoom = instant du plan serré
// prettier-ignore
const SEGS = [
  { src: 3.5, d: 2.5, m: 1, ev: [[0, "h1"], [0.13, "h2"], [0.55, "h3"]] },
  { src: 5.9, d: 1.4, m: 1, ev: [[1.0, "v1"]] },
  { src: 51.3, d: 1.4, m: 2, ev: [[0.6, "v2"]] },
  { src: 87.4, d: 3.7, m: 3, ev: [[1.95, "v3"], [2.2, "k3a"], [2.85, "k3b"]], zoom: 1.95 },
  { src: 102.0, d: 3.2, m: 4, ev: [[2.0, "v4"], [2.2, "k4a"], [2.6, "k4b"]] },
  { src: 163.0, d: 3.1, m: 5, ev: [[0.2, "k5a"], [0.85, "k5b"], [2.0, "v5"]] },
  { src: 182.7, d: 0.9, m: 6, ev: [[0.3, "v6"]] },
  { src: 219.8, d: 0.9, m: 7, ev: [[0.3, "v7"]] },
  { src: 256.2, d: 2.8, m: 8, ev: [[1.7, "v8"], [1.9, "k8a"], [2.3, "k8b"]], zoom: 1.7 },
  { src: 298.2, d: 1.0, m: 9, ev: [[0.3, "v9"]] },
  { src: 304.6, d: 2.5, m: 10, ev: [[1.1, "v10"], [1.3, "k10"]] },
  { d: 3.4, m: 10, ev: [[0, "e1"], [0.2, "e2"], [0.4, "e3"], [0.9, "e4"], [1.5, "e5"]] },
  { d: 4.4, m: 11, ev: [[0, "f1"], [0.2, "f2"], [0.45, "f3"], [1.0, "f4"], [1.6, "f5"], [2.2, "f6"]] },
];
const TROUVE = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1];

const CX = 752,
  CY = (i) => 290 + i * 114; // piste des 10 manches, à droite de l'écran
const posca = (x, y, t, s, rot) =>
  `<div class="abs posca" style="left:${x}px;top:${y}px;font-size:${s}px;transform:rotate(${rot}deg);transform-origin:0 0;text-shadow:0 0 18px #000,0 0 6px #000">${t}</div>`;
const coche = (i) =>
  TROUVE[i]
    ? `<div class="colle" style="left:${CX + 4}px;top:${CY(i) + 2}px;width:92px;height:92px"><div class="p" style="border-radius:50%;background:${VERT};display:grid;place-items:center"><svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="#111" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" style="filter:url(#toner)"><path d="M10 32 L25 46 L50 14"/></svg></div></div>`
    : `<svg class="abs" style="left:${CX - 6}px;top:${CY(i) - 8}px;filter:url(#posca)" width="112" height="112" viewBox="0 0 112 112" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"><path d="M18 20 L92 94"/><path d="M96 16 L20 96"/></svg>`;

// Chaque élément animé : [id, origine x, origine y, html]
const ELS = [
  [
    "ecran",
    359,
    884,
    `<div class="colle" style="left:66px;top:262px;width:586px;height:1245px"><div class="p" style="padding:10px"><img id="shot" style="width:566px;height:1225px;display:block;background:#000"></div></div>`,
  ],
  [
    "piste",
    800,
    860,
    Array.from(
      { length: 10 },
      (_, i) =>
        `<div class="abs mono" style="left:${CX - 52}px;top:${CY(i) + 36}px;font-size:19px;opacity:.55">${String(i + 1).padStart(2, "0")}</div><span class="case abs" style="left:${CX}px;top:${CY(i)}px;width:96px;height:96px;transform:rotate(${[1, -1.2, 0.6, -0.5, 1.4, -1, 0.4, 1.1, -0.8, 0.7][i]}deg)"></span>`,
    ).join(""),
  ],
  ...TROUVE.map((_, i) => [`v${i + 1}`, CX + 48, CY(i) + 48, coche(i)]),
  [
    "h1",
    330,
    1000,
    bande({ x: 92, y: 880, rot: -3, seed: 5, mag: 1 }, "7/10", 250),
  ],
  [
    "h2",
    400,
    1160,
    bande({ x: 128, y: 1108, rot: 2, seed: 6 }, "sur les années 80", 74),
  ],
  ["h3", 380, 1290, posca(118, 1232, "tu fais mieux ?", 100, -3)],
  ["k3a", 360, 1120, posca(104, 1140, "TINA TURNER.", 100, -3)],
  ["k3b", 400, 1230, posca(210, 1244, "j'ai honte.", 96, 2)],
  ["k4a", 330, 1090, posca(120, 1124, "ok celle-là", 96, -2)],
  ["k4b", 380, 1190, posca(170, 1222, "trop facile.", 104, 2)],
  ["k5a", 300, 1090, posca(120, 1084, "maria…", 100, -3)],
  ["k5b", 400, 1200, posca(180, 1186, "maria QUOI ?", 104, 2)],
  ["k8a", 360, 1100, posca(104, 1118, "personne l'a eue.", 88, -2)],
  ["k8b", 400, 1200, posca(140, 1220, "même pas les autres.", 74, 2)],
  ["k10", 360, 1120, posca(130, 1160, "et de 7.", 112, -3)],
  [
    "e1",
    360,
    440,
    bande({ x: 70, y: 290, rot: -3, seed: 7, mag: 1 }, "7/10", 320),
  ],
  ["e2", 330, 660, bande({ x: 96, y: 606, rot: 2, seed: 8 }, "sur les", 96)],
  [
    "e3",
    370,
    790,
    bande({ x: 66, y: 716, rot: -1.5, seed: 9 }, "années 80", 142),
  ],
  ["e4", 360, 980, posca(84, 912, "tu fais mieux ?", 112, -3)],
  [
    "e5",
    360,
    1220,
    colle(
      {
        x: 72,
        y: 1150,
        rot: 1.4,
        seed: 10,
        a: 2.5,
        style: "padding:22px 28px 18px",
      },
      `<div class="mono" style="font-size:25px;color:#111;filter:url(#toner)">ton score en commentaire<br><span style="font-size:40px">zik-music.fr</span></div>`,
    ),
  ],
  [
    "f1",
    330,
    390,
    bande({ x: 70, y: 300, rot: -2.5, seed: 11 }, "blind test", 172),
  ],
  [
    "f2",
    440,
    560,
    bande({ x: 84, y: 500, rot: 1.8, seed: 12, mag: 1 }, "multijoueur", 150),
  ],
  [
    "f3",
    300,
    730,
    bande({ x: 70, y: 712, rot: -1.2, seed: 13 }, "en ligne", 132),
  ],
  ["f4", 420, 980, posca(130, 922, "contre tes potes.", 108, -3)],
  [
    "f5",
    330,
    1160,
    colle(
      {
        x: 84,
        y: 1120,
        rot: -1.6,
        seed: 14,
        a: 2.5,
        style:
          "padding:20px 26px 16px;display:flex;align-items:center;gap:18px",
      },
      `<i class="point" style="width:30px;height:30px"></i><div class="mono" style="font-size:40px;color:#111;filter:url(#toner)">gratuit · sans appli</div>`,
    ),
  ],
  [
    "f6",
    470,
    1330,
    colle(
      {
        x: 110,
        y: 1262,
        rot: 1.8,
        seed: 15,
        a: 2.5,
        style: "padding:26px 34px 20px",
      },
      `<div class="mono" style="font-size:26px;color:#111;opacity:.7;filter:url(#toner)">dans ton navigateur</div><div class="mono" style="font-size:72px;color:#111;letter-spacing:.06em;filter:url(#toner)">zik-music.fr</div>`,
    ),
  ],
];
const TETES = Array.from({ length: 12 }, (_, m) =>
  bandeau({
    y: 168,
    rubrique: m > 10 ? "Blind test · en ligne" : "Vraie partie · années 80",
    code: String(Math.min(10, Math.max(1, m))).padStart(2, "0"),
    part: Math.min(1, Math.max(0.012, m / 10)),
  }).replace(">code<", ">manche<"),
);

// Fenêtre de présence de chaque élément (secondes)
const vie = { ecran: [0, 0], piste: [0, 1e9] };
let at = 0;
for (const s of SEGS) {
  s.t0 = at;
  at += s.d;
  if (s.src != null) vie.ecran[1] = at;
  for (const [o, id] of s.ev) vie[id] = [s.t0 + o, id[0] === "v" ? 1e9 : at];
}
const FIN = SEGS.at(-1).t0; // la carte multijoueur remplace la piste
for (const id of ["piste", ...TROUVE.map((_, i) => `v${i + 1}`)])
  vie[id][1] = FIN;
const TOTAL = Math.round(at * FPS);
// buzz de la TV à chaque manche trouvée, roulement de la finale (coup à 3,5 s) calé sur le score
const SFX = [
  ...TROUVE.flatMap((ok, i) =>
    ok ? [["buzz", vie[`v${i + 1}`][0], 0.5]] : [],
  ),
  ["drumroll", SEGS.at(-2).t0 - 3.5, 1.6],
];
const POSE = 3; // images de « pose » : la pièce arrive de travers, puis se cale
const graine = (id) =>
  [...id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) | 0;
const BASE = [-0.9, 0.7, -0.4, 1, -0.8, 0.5, -1, 0.8, -0.3, 0.7, -0.6, 0];

function etat(f) {
  const t = f / FPS;
  const si = SEGS.findLastIndex((s) => s.t0 <= t + 1e-6);
  const s = SEGS[si];
  const tic = Math.floor(f / 4); // tremblé : le papier bouge 7 fois par seconde, comme une prise image par image
  const show = {};
  for (const [id] of ELS) {
    const [a, b] = vie[id] || [1e9, 0];
    if (t + 1e-6 < a || t + 1e-6 >= b) continue;
    const r = rng(graine(id) + tic * 977);
    const calme = id === "ecran" ? 0.45 : 1;
    let v = [j(r, 1.3) * calme, j(r, 1.3) * calme, j(r, 0.28) * calme, 1];
    if (id === "ecran") {
      const g = rng(si * 131 + 5);
      v = [v[0] + j(g, 7), v[1] + j(g, 6), v[2] + BASE[si], 1];
    } else if (f - Math.round(a * FPS) < POSE && a > 0)
      v = [v[0] + 8, v[1] - 10, v[2] + 2.4, 1.05];
    show[id] = v.map((n) => +n.toFixed(2));
  }
  const g = rng(tic * 53 + 1);
  return {
    show,
    src: s.src != null ? plan(s.src + (t - s.t0)) : null,
    tete: s.m,
    zoom: s.zoom != null && t - s.t0 >= s.zoom ? 1.16 : 1,
    grain: [Math.floor(g() * 400), Math.floor(g() * 400)],
  };
}

const html = page(
  1080,
  1920,
  `<div id="scene" style="position:absolute;inset:0;transform-origin:430px 900px"><div id="tete"></div>${ELS.map(([id, ox, oy, h]) => `<div class="el" id="${id}" style="transform-origin:${ox}px ${oy}px">${h}</div>`).join("")}</div>
<script>
const TETES = ${JSON.stringify(TETES)}; let tete = -1;
window.F = async (st) => {
  for (const e of document.querySelectorAll(".el")) {
    const v = st.show[e.id];
    e.style.display = v ? "block" : "none";
    if (v) e.style.transform = "translate(" + v[0] + "px," + v[1] + "px) rotate(" + v[2] + "deg) scale(" + v[3] + ")";
  }
  if (st.tete !== tete) document.getElementById("tete").innerHTML = TETES[(tete = st.tete)];
  document.getElementById("scene").style.transform = "scale(" + st.zoom + ")";
  document.querySelector(".fond").style.backgroundPosition = st.grain[0] + "px " + st.grain[1] + "px, 0 0";
  document.querySelector(".grain").style.backgroundPosition = st.grain[1] + "px " + st.grain[0] + "px";
  const im = document.getElementById("shot");
  if (st.src && im.src !== st.src) { im.src = st.src; await im.decode(); }
};
</script>`,
  ".el{position:absolute;inset:0;display:none}.fond{background-repeat:repeat,no-repeat}",
);

mkdirSync(`${OUT}/_images`, { recursive: true });
writeFileSync(`${OUT}/_partie.html`, html);
const essai = process.argv.indexOf("--essai");
const b = await lancer();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(pathToFileURL(`${OUT}/_partie.html`).href, {
  waitUntil: "networkidle",
});
await p.evaluate(() => document.fonts.ready);
if (essai > 0) {
  for (const t of process.argv[essai + 1].split(",")) {
    await p.evaluate((st) => window.F(st), etat(Math.round(+t * FPS)));
    await p.screenshot({ path: `${OUT}/essais/partie-${t}.png` });
  }
  await b.close();
  console.log("essai ok, durée", (TOTAL / FPS).toFixed(1));
} else {
  for (let f = 0; f < TOTAL; f++) {
    await p.evaluate((st) => window.F(st), etat(f));
    await p.screenshot({
      path: `${OUT}/_images/${String(f).padStart(5, "0")}.jpg`,
      type: "jpeg",
      quality: 94,
    });
    if (f % 100 === 0) console.log(f, "/", TOTAL);
  }
  await b.close();
  execFileSync(FF, [
    "-y",
    "-loglevel",
    "error",
    "-framerate",
    String(FPS),
    "-i",
    `${OUT}/_images/%05d.jpg`,
    ...SFX.flatMap(([f]) => ["-i", `${SONS}/${f}.ogg`]),
    "-filter_complex",
    SFX.map(
      ([, t, v], i) =>
        `[${i + 1}:a]adelay=${Math.round(t * 1000)}:all=1,volume=${v}[a${i}]`,
    ).join(";") +
      `;${SFX.map((_, i) => `[a${i}]`).join("")}amix=inputs=${SFX.length}:normalize=0,apad[son]`,
    "-map",
    "0:v",
    "-map",
    "[son]",
    "-shortest",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-vf",
    "scale=in_range=pc:out_range=tv,format=yuv420p",
    "-c:v",
    "libx264",
    "-crf",
    "24",
    "-x264-params",
    "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
    "-movflags",
    "+faststart",
    `${OUT}/feuille-de-match-v2.mp4`,
  ]);
  rmSync(`${OUT}/_images`, { recursive: true });
  rmSync(`${OUT}/_partie.html`);
  console.log("ok", (TOTAL / FPS).toFixed(1), "s");
}
