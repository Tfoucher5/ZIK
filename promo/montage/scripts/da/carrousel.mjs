// Carrousel « ces sons ont 30 ans en 2026 » en DA réseaux (1080×1350).
// node scripts/da/carrousel.mjs → out/lot1-da/carrousel/1-8.png
import { mkdirSync } from "node:fs";
import {
  BLANC,
  ROSE,
  bande,
  bandeau,
  cases,
  colle,
  img,
  j,
  lancer,
  page,
  pastille,
  rng,
  scotch,
} from "./kit.mjs";

const OUT = "out/lot1-da/carrousel";
const POCH = (n) => img(`public/pochettes/da/${n}.jpg`);
// Sorties 1996. [pochette, lignes du titre, artiste, mot à la main]
const SONS = [
  ["wannabe", ["Wannabe"], "Spice Girls", "tout le monde connaît le couplet de Mel B.<br>personne sait le chanter."],
  ["freed", ["Freed From", "Desire"], "Gala", "30 ans et encore chantée<br>dans tous les stades."],
  ["aicha", ["Aïcha"], "Khaled", "écrite par Jean-Jacques Goldman.<br>oui oui."],
  ["killing", ["Killing Me", "Softly"], "Fugees", "une reprise de Roberta Flack (1973).<br>donc elle a 53 ans, en vrai."],
  ["diggity", ["No Diggity"], "Blackstreet", "avec Dr. Dre dessus.<br>toujours pas une ride."],
  ["tictac", ["Tic Tic Tac"], "Carrapicho", "le tube de l'été 96.<br>tu connais la choré, mens pas."],
];
const LUM = { wannabe: 0.72, aicha: 0.95 }; // pochettes claires : on fonce avant de tramer
const copie = (n) =>
  `<div class="copie" style="width:100%;height:100%;--b:${LUM[n] || 1.08}"><img src="${POCH(n)}"></div>`;
const tete = (i) =>
  bandeau({ y: 62, rubrique: i ? `Ces sons ont 30 ans · ${i}/6` : "Ces sons ont 30 ans", code: "1996", part: i / 6 || 0.012 });
const label = (x, y, t, s = 30) =>
  `<div class="abs mono" style="left:${x}px;top:${y}px;font-size:${s}px;display:flex;align-items:center;gap:16px;filter:url(#toner)"><i class="point" style="width:${s * 0.7}px;height:${s * 0.7}px"></i>${t}</div>`;
const posca = (x, y, t, s, rot = -2, extra = "") =>
  `<div class="abs posca" style="left:${x}px;top:${y}px;font-size:${s}px;transform:rotate(${rot}deg);transform-origin:0 0;${extra}">${t}</div>`;
const fleche = (x, y, rot, w = 120) =>
  `<svg class="abs" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg);filter:url(#posca)" width="${w}" height="60" viewBox="0 0 120 60" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 34 C40 20 70 22 108 30"/><path d="M84 10 L110 30 L82 50"/></svg>`;

const une = () =>
  tete(0) +
  bande({ x: 62, y: 190, rot: -2.2, seed: 11 }, "Ces sons", 236) +
  bande({ x: 690, y: 424, rot: 3, seed: 12, z: 4 }, "ont", 132) +
  bande({ x: 76, y: 520, rot: -3.4, seed: 13, mag: 1, z: 3 }, "30 ans", 318) +
  label(84, 872, "en 2026", 36) +
  posca(430, 838, "désolé.", 112, -5) +
  colle({ x: 20, y: 1010, w: 360, h: 360, rot: -8, seed: 21 }, copie("freed")) +
  colle({ x: 640, y: 1000, w: 360, h: 360, rot: 7, seed: 22 }, copie("diggity")) +
  colle({ x: 330, y: 960, w: 390, h: 390, rot: 2, seed: 23, z: 2 }, copie("tictac")) +
  scotch(440, 938, 170, -4) +
  posca(700, 936, "glisse", 70, -4) +
  fleche(838, 946, -6, 100);

const son = ([n, lignes, artiste, mot], i) => {
  const r = rng(40 + i);
  const g = i % 2 === 0; // pochette à gauche ou à droite, une image sur deux
  const cx = g ? 74 + j(r, 12) : 330 + j(r, 12);
  const rot = (g ? -1 : 1) * (2 + r() * 2.5);
  const long = Math.max(...lignes.map((l) => l.length));
  const t = lignes.length > 1 ? 150 : long <= 7 ? 232 : 186;
  const ty = lignes.length > 1 ? 690 : 752;
  return (
    tete(i + 1) +
    colle({ x: cx, y: 186, w: 610, h: 610, rot, seed: 60 + i }, copie(n)) +
    scotch(cx + 190 + j(r, 40), 168, 180, rot - 3 + j(r, 4)) +
    pastille({ x: g ? 660 + j(r, 16) : 76 + j(r, 16), y: 250 + r() * 170, d: 250, rot: g ? 9 : -11 }, "30", "ans. pile.") +
    lignes
      .map((l, k) =>
        bande(
          { x: (g ? 150 : 66) + k * 70 + j(r, 16), y: ty + k * (t * 0.92), rot: -rot * 0.7 + j(r, 1) + k * 1.4, seed: 80 + i * 3 + k, z: 3 + k },
          l,
          t,
        ),
      )
      .join("") +
    label(84, 1004, `${artiste} · sorti en 1996`, 28) +
    posca(88, 1058, mot, 58, -1.5)
  );
};

const fin = () =>
  tete(6) +
  bande({ x: 64, y: 190, rot: -2, seed: 31 }, "Lequel t'a fait", 148) +
  bande({ x: 150, y: 322, rot: 1.6, seed: 32, mag: 1, z: 2 }, "le plus mal ?", 172) +
  SONS.map(
    ([, l, a], i) =>
      `<div class="abs" style="left:${92 + (i % 2) * 6}px;top:${548 + i * 74}px;display:flex;align-items:center;gap:22px;transform:rotate(${[-0.6, 0.5, -0.3, 0.7, -0.5, 0.4][i]}deg)"><span class="case" style="width:52px;height:52px"></span><span style="font:800 58px/1 'Barlow Condensed';text-transform:uppercase;color:${BLANC};filter:url(#toner)">${l.join(" ")}</span><span class="mono" style="font-size:20px;opacity:.6">${a}</span></div>`,
  ).join("") +
  `<svg class="abs" style="left:84px;top:${548 + 5 * 74 - 22}px;filter:url(#posca)" width="90" height="80" viewBox="0 0 90 80" fill="none" stroke="${ROSE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M10 44 L34 66 L80 10"/></svg>` +
  posca(600, 872, "(moi)", 56, -6) +
  posca(560, 560, "dis-le en<br>commentaire", 70, 4) +
  fleche(590, 720, 150, 110) +
  colle(
    { x: 70, y: 1016, rot: -1.2, seed: 33, a: 2.5, style: "padding:20px 28px 16px" },
    `<div class="mono" style="font-size:27px;color:#111;filter:url(#toner)">nous, on en fait des blind tests<br><span style="font-size:36px">zik-music.fr</span></div>`,
  ) +
  `<div class="abs" style="left:742px;top:1020px;transform:rotate(3deg)">${cases("1996", 0)}</div>`;

const slides = [une(), ...SONS.map(son), fin()];
mkdirSync(OUT, { recursive: true });
const b = await lancer();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, body] of slides.entries()) {
  await p.setContent(page(1080, 1350, body), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${OUT}/${i + 1}.png` });
}
await b.close();
console.log("ok");
