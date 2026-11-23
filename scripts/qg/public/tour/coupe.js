// Coupe AA : niveaux, dalles, poteaux, noyau, terrasses et noms des pièces tirés de plan.js.
import { NIVEAUX, NOYAU, TRAME, VIDES, lieux, niveau } from "./plan.js";
import { alt, sousPlafond } from "./dessin.js";

// Pièces nommées sur la coupe : [id, x, z du texte].
const ETIQUETTES = [
  ["carnegie-hall", 10.8, 5.9],
  ["penny-lane", 25.2, 1.5],
  ["return-to-sender", 39.6, 1.5],
  ["mezzanine", 21.6, 5.2],
  ["soul-kitchen", 39.6, 5.2],
  ["studio-54", 10.8, 8.8],
  ["beale-street", 25.2, 8.8],
  ["fever", 39.6, 8.8],
  ["strawberry-fields", 14.4, 13],
  ["call-me", 3.6, 12.5],
  ["sziget", 3.6, 16.3],
  ["blue-note", 25.2, 12.5],
  ["duc-des-lombards", 25.2, 16.3],
  ["hellfest", 39.6, 12.5],
  ["capitol", 39.6, 16.3],
  ["octopus", 18, 21.6],
  ["le-palace", 25.2, 20.4],
  ["caveau", 39.6, 20.4],
  ["salle-pleyel", 25.2, 25],
  ["woodstock", 39.6, 25],
  ["jarre", 39.6, 31.2],
];
const W = TRAME.largeur;
const OR = 'style="fill:var(--or)"';

export function dessinerCoupe() {
  const s = [];
  const Z = (z) => +((42 - z) * 10).toFixed(1);
  const X = (x) => +(x * 10).toFixed(1);
  const rc = (a, z1, b, z2, cl, e = "") =>
    s.push(
      `<rect x="${X(a)}" y="${Z(z2)}" width="${X(b - a)}" height="${+((z2 - z1) * 10).toFixed(1)}" class="${cl}" ${e}/>`,
    );
  const ln = (a, z1, b, z2, cl) =>
    s.push(
      `<line x1="${X(a)}" y1="${Z(z1)}" x2="${X(b)}" y2="${Z(z2)}" class="${cl}"/>`,
    );
  const tx = (x, z, t, cl, e = "") =>
    s.push(`<text x="${X(x)}" y="${Z(z)}" class="${cl}" ${e}>${t}</text>`);
  const arb = (x, z, h, r) => {
    ln(x, z, x, z + h, "fin");
    s.push(
      `<circle cx="${X(x)}" cy="${Z(z + h)}" r="${X(r)}" class="arb"/><circle cx="${X(x + r * 0.2)}" cy="${Z(z + h + r * 0.1)}" r="${X(r * 0.6)}" class="arb2"/>`,
    );
  };
  // Silhouettes à l'échelle, posées au niveau z.
  const bons = (z, ...xs) =>
    xs.forEach((x) => {
      s.push(`<circle cx="${X(x)}" cy="${Z(z + 1.6)}" r="1.5" class="pot"/>`);
      ln(x, z + 1.4, x, z + 0.75, "fin");
      ln(x, z + 0.75, x - 0.18, z, "fin");
      ln(x, z + 0.75, x + 0.18, z, "fin");
    });
  const etages = NIVEAUX.filter((n) => n.z >= 0 && n.facade !== false);
  const toit = NIVEAUX.at(-1);
  s.push(
    '<rect x="-160" y="-10" width="790" height="540" fill="var(--plan)"/>',
  );
  // sol, sous-sol, pieux
  rc(-15, -8.6, 0, 0, "terre");
  rc(W, -8.6, 50, 0, "terre");
  rc(0, -8.6, W, -4, "terre");
  ln(-15, 0, 0, 0, "por");
  ln(W, 0, 50, 0, "por");
  for (const x of TRAME.x)
    rc(x - 0.45, -8.6, x + 0.45, -4, "fin", 'fill="var(--plan)"');
  rc(-0.3, -4, 43.5, -3.4, "poc");
  ln(-0.15, -3.4, -0.15, 0, "por");
  ln(43.35, -3.4, 43.35, 0, "por");
  // poteaux : jusqu'au plafond du plus haut niveau qui les contient
  for (const x of TRAME.x) {
    const haut = Math.max(
      ...etages.filter((n) => n.x0 <= x + 0.01).map((n) => n.z + n.h),
    );
    rc(
      x - 0.25,
      -3.4,
      x + 0.25,
      haut - 0.3,
      "fin",
      'fill="rgba(255,255,255,.07)"',
    );
  }
  // dalles : toit du niveau du dessous, moins les vides
  [...etages, toit].forEach((n, i) => {
    let x = i ? etages[i - 1].x0 : 0;
    const vides = VIDES.filter((v) => v.niveau === n.id && v.type !== "eau");
    for (const [a, , b] of vides
      .map((v) => v.rect)
      .sort((p, q) => p[0] - q[0])) {
      if (a > x) rc(x, n.z - 0.3, a, n.z, "poc");
      x = Math.max(x, b);
    }
    if (x < W) rc(x, n.z - 0.3, W, n.z, "poc");
  });
  rc(7.6, 9.7, 21.2, 10.5, "terre");
  rc(7.6, 9.7, 21.2, 10.5, "fin");
  // façades
  const fa = (x, z1, z2) =>
    [-0.1, 0.1].forEach((d) => ln(x + d, z1, x + d, z2, "vit"));
  for (const n of etages) {
    fa(n.x0, n.z, n.z + n.h);
    if (n.id === "n0") ln(W, n.z, W, n.z + n.h, "por");
    else fa(W, n.z, n.z + n.h);
  }
  // noyau
  rc(28.8, -3.4, 36, toit.z, "gris");
  for (const x of [28.8, 31.2, 33.4, 36])
    ln(x, -3.4, x, x >= 33.4 ? 37.7 : 34.5, "clo");
  ln(31.2, 27.3, 28.8, 27.3, "clo");
  for (const n of NOYAU.escaliers[0].dessert
    .map(niveau)
    .filter((n) => n.facade !== false))
    s.push(
      `<path d="M${X(31.4)} ${Z(n.z)}L${X(33.2)} ${Z(n.z + n.h / 2)}L${X(31.4)} ${Z(n.z + n.h)}" class="fin"/>`,
    );
  const [a1, , , ap] = NOYAU.ascenseurs;
  for (const z of a1.dessert.map((id) => niveau(id).z)) {
    rc(29.2, z, 30.8, z + 2.3, "fin");
    s.push(`<circle cx="${X(30)}" cy="${Z(z + 1.15)}" r="2" class="pot"/>`);
  }
  const arrets = ap.dessert.map((id) => niveau(id).z);
  for (const z of arrets) {
    rc(33.8, z, 35.6, z + 2.3, "orl", 'stroke-width=".7"');
    s.push(`<circle cx="${X(34.7)}" cy="${Z(z + 1.15)}" r="2.2" class="orf"/>`);
  }
  ln(
    34.7,
    arrets[0] + 2.3,
    34.7,
    arrets[1],
    'orl" stroke-dasharray="2 2" stroke-width=".5',
  );
  // hall et atrium
  ln(14.4, 3.6, 14.4, 4.7, "fin");
  ln(14.4, 4.7, 15, 4.7, "fin");
  rc(10, 0, 12.4, 1.05, "fin");
  bons(0, 11.2, 4, -3.4, -4.4);
  bons(3.6, 18);
  ln(13.2, 0.4, 13.2, 3, "ecr");
  arb(2.4, 0, 3.4, 1.2);
  tx(10.8, 5, "hall · 6,90 m", "cz", 'text-anchor="middle"');
  const eau = VIDES.find((v) => v.type === "eau");
  const zEau = niveau(eau.niveau).z;
  rc(
    eau.rect[0],
    zEau,
    eau.rect[0] + 0.35,
    zEau + eau.hauteur,
    "fin",
    'fill="url(#hE)"',
  );
  rc(eau.rect[0] + 0.35, zEau, 8.6, zEau + 0.2, "fin");
  for (const [x, h, r] of [
    [10.6, 5.4, 1.5],
    [13.4, 7.2, 2],
    [16.6, 5, 1.6],
    [19.2, 6.4, 1.3],
  ])
    arb(x, zEau, h, r);
  bons(zEau, 15, 12);
  ln(21.6, 14.6, 21.6, 15.7, "fin");
  ln(14.4, 18.4, 14.4, 19.5, "fin");
  ln(7.2, 14.6, 7.2, 15.7, "fin");
  arb(18.6, 18.4, 1.8, 0.9);
  bons(18.4, 16.4, 4.4);
  s.push(
    `<path d="M${X(8)} ${Z(22.9)}L${X(14.4)} ${Z(24)}L${X(20.8)} ${Z(22.9)}M${X(8)} ${Z(23.15)}L${X(14.4)} ${Z(24.25)}L${X(20.8)} ${Z(23.15)}" class="vit"/>`,
  );
  for (let x = 9.6; x < 20; x += 1.6) {
    const d = 1.1 * (1 - Math.abs(x - 14.4) / 6.4);
    ln(x, 22.9 + d, x, 23.2 + d, "fin");
  }
  tx(eau.rect[0] + 1.7, zEau + 6.5, eau.nom, "cz");
  tx(14.4, 20.9, "verrière", "cz", 'text-anchor="middle"');
  const pieces = new Map(
    NIVEAUX.flatMap((n) => lieux(n).map((p) => [p.id, p])),
  );
  for (const [id, x, z] of ETIQUETTES) {
    const p = pieces.get(id);
    tx(
      x,
      z,
      p.nom,
      "cr",
      p.acces === "direction" || p.acces === "fondateur" ? OR : "",
    );
  }
  tx(39.6, 30.3, "double hauteur 6,40 m", "cz", 'text-anchor="middle"');
  ln(42.7, 28.2, 42.7, 33.2, "ecr");
  for (let z = 28.6; z < 33.6; z += 0.9)
    s.push(
      `<circle cx="${X(32.3)}" cy="${Z(z)}" r="2.6" class="orl" stroke-width=".6"/>`,
    );
  // terrasses
  for (const n of NIVEAUX)
    for (const p of n.terrasses.filter((p) => !p.altitude)) {
      const x = Math.min(...p.poly.map((q) => q[0]));
      ln(x, n.z, x, n.z + 1.1, "fin");
      ln(x, n.z + 1.1, x + 0.5, n.z + 1.1, "fin");
      tx(
        x - 1,
        n.z + 0.8,
        p.nom,
        "cl",
        `text-anchor="end"${p.acces === "fondateur" ? " " + OR : ""}`,
      );
    }
  ln(toit.x0, toit.z, toit.x0, toit.z + 1.1, "fin");
  ln(toit.x0, toit.z + 1.1, toit.x0 + 0.5, toit.z + 1.1, "fin");
  rc(0.3, 18.4, 3.3, 21.2, "clo");
  arb(5.4, 18.4, 1.6, 0.9);
  arb(9.2, 22.8, 1.7, 0.9);
  bons(22.8, 19.4);
  arb(23.4, 27.6, 1.8, 1);
  bons(27.6, 26.4, 25.6);
  // toit, héliport, enseigne
  const heli = toit.terrasses[0];
  rc(28.8, 34.8, W, 37.7, "tir");
  tx(39.7, 35.2, "ZIK", "ens");
  rc(28.2, 37.7, 43.8, heli.altitude, "poc");
  ln(28.2, heli.altitude, 27.4, 38.5, "fin");
  ln(43.8, heli.altitude, 44.6, 38.5, "fin");
  s.push(
    `<g class="fin" transform="translate(${X(36.6)} ${Z(heli.altitude)})"><ellipse cx="0" cy="-15" rx="17" ry="8.5"/><path d="M15 -17L46 -22l1 -6M-34 -27H34M0 -23.5v-3.5M-12 -1.5H13M-7 -7.5l-2 6M7 -7.5l2 6"/></g>`,
  );
  // rue
  arb(-7, 0, 3.6, 2.2);
  arb(-12.6, 0, 3.2, 1.9);
  ln(-10, 0, -10, 5.4, "fin");
  ln(-10, 5.4, -8.8, 5.4, "fin");
  tx(-7.5, -1.6, "Parvis · ouest", "cz", 'text-anchor="middle"');
  tx(46.6, -1.6, "Service · est", "cz", 'text-anchor="middle"');
  tx(
    21.6,
    -6.6,
    "pieux sous chaque file de poteaux",
    "cz",
    'text-anchor="middle"',
  );
  TRAME.x.forEach((x, i) => {
    s.push(
      `<circle cx="${X(x)}" cy="${Z(-9.9)}" r="8" class="bul"/><text x="${X(x)}" y="${Z(-9.9) + 2.6}" class="bult" style="font-size:7px">${TRAME.axesX[i]}</text>`,
    );
    if (i < 6) tx(x + 3.6, -9.6, "7,20", "cz", 'text-anchor="middle"');
  });
  // repères de niveaux, cliquables
  for (const n of NIVEAUX) {
    ln(W, n.z, 57.5, n.z, "mob");
    const court =
      n.bouton === "RDC" ? "RDC" : n.bouton === "T" ? "Toit" : `N${n.bouton}`;
    tx(
      45,
      n.z + 2.1,
      `${court} · ${n.theme.split(" · ")[0]}`,
      "cl",
      n.prive ? OR : "",
    );
    tx(
      45,
      n.z + 0.7,
      `${alt(n.z)}${n.facade === false ? "" : ` · HSP ${sousPlafond(n)}`}`,
      "cz",
    );
    s.push(
      `<rect x="-20" y="${Z(n.z + n.h)}" width="${X(59.5) + 20}" height="${n.h * 10}" class="hit" data-n="${n.id}"><title>${n.nom} · ${n.theme}</title></rect>`,
    );
  }
  ln(43.8, heli.altitude, 57.5, heli.altitude, "mob");
  tx(
    45,
    heli.altitude + 0.6,
    `${alt(heli.altitude)} · ${heli.nom}, héliport`,
    "cz",
    OR,
  );
  // matières
  for (const [a, b, t, e] of [
    [0, 18.4, "béton · moquette", ""],
    [18.4, 27.6, "chêne · laiton", ""],
    [27.6, 34.8, "marbre · noyer · or", OR],
  ]) {
    ln(59, a + 0.4, 59, b - 0.4, "fin");
    ln(58.4, a + 0.4, 59, a + 0.4, "fin");
    ln(58.4, b - 0.4, 59, b - 0.4, "fin");
    s.push(
      `<text x="${X(60.6)}" y="${Z((a + b) / 2)}" class="cz" text-anchor="middle" transform="rotate(90 ${X(60.6)} ${Z((a + b) / 2)})" ${e}>${t}</text>`,
    );
  }
  return `<svg viewBox="-160 -10 790 540" role="img" aria-label="Coupe verticale de la ZIK Tower"><defs><pattern id="hT" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v5" stroke="#8D90A6" stroke-width=".35"/></pattern><pattern id="hE" width="1.4" height="6" patternUnits="userSpaceOnUse"><path d="M.7 0v4" stroke="#F2F2F6" stroke-width=".3"/></pattern></defs>${s.join("")}</svg>`;
}
