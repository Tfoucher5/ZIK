// Plan d'un niveau en SVG, dessiné uniquement à partir de plan.js.
import { E2, NIVEAUX, NOYAU, TRAME, VIDES, lieux } from "./plan.js";
import { trait } from "./trait.js";
import { decoPlan } from "./deco-trait.js";

const W = TRAME.largeur;
const H = TRAME.profondeur;
const TRAITS = {
  porteur: "por",
  cloison: "clo",
  pointille: "tir",
  mobile: "tir",
  "garde-corps": "fin",
  acrotere: "fin",
};
export const alt = (z) =>
  (z > 0 ? "+" : z < 0 ? "−" : "±") + Math.abs(z).toFixed(2).replace(".", ",");
export const sousPlafond = (n) =>
  n.sousPlafond ?? (n.h - 0.8).toFixed(2).replace(".", ",");
const boite = (poly) => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const tousLieux = new Map(
  NIVEAUX.flatMap((n) => lieux(n).map((p) => [p.id, p])),
);
const prive = (p) => p.acces === "direction" || p.acces === "fondateur";

function noyau(t, n) {
  const { R, L, P, vit, trou, pt, esc, texte, croix } = t;
  const [x1, y1, x2, y2] = NOYAU.rect;
  const sert = (a) => a.dessert.includes(n.id);
  if (n.facade === false) {
    R(x1, y1, x2 - x1, y2 - y1, "tir");
    const ap = NOYAU.ascenseurs.find((a) => a.prive).cabine;
    P('<g class="orl" stroke-width=".7" stroke-dasharray="2 1.5">');
    R(ap[0], ap[1], ap[2], ap[3], "");
    P("</g>");
    esc(x1 + 0.7, y1 + 0.4, 3.6, 1.2);
    return;
  }
  R(x1, y1, x2 - x1, y2 - y1, "gris");
  R(x1, y1, x2 - x1, y2 - y1, "por");
  for (const m of NOYAU.murs) L(...m, "por");
  const cab = ([x, y, w, h], cl) => {
    R(x + 0.35, y + 0.35, w - 0.7, h - 0.7, cl);
    croix(x + 0.35, y + 0.35, w - 0.7, h - 0.7, cl);
  };
  for (const a of NOYAU.ascenseurs) {
    if (a.prive) {
      P(`<g class="${sert(a) ? "orl" : "tir"}" stroke-width=".7">`);
      cab(a.cabine, "");
      P("</g>");
    } else cab(a.cabine, sert(a) || a.id === "MC" ? "fin" : "tir");
    if (sert(a)) {
      const { x, y, l, axe } = a.porte;
      const [c, d] = axe === "h" ? [x + l, y] : [x, y + l];
      trou(x, y, c, d);
      vit(x, y, c, d, a.prive ? "orl" : "vit");
    }
    const [ex, ey] = a.etiquette;
    texte(
      ex,
      ey,
      a.id,
      "us",
      a.prive ? ` style="fill:${sert(a) ? "var(--or)" : "#6E7186"}"` : "",
    );
  }
  for (const [x, y, w, h] of NOYAU.gaines) croix(x, y, w, h, "mob");
  for (const e of NOYAU.escaliers) {
    for (const v of e.volees) esc(...v);
    const { x, y, l, axe, sens } = e.porte;
    pt(x, y, l, axe, sens);
    texte(...e.etiquette, e.id, "us");
  }
  const s = NOYAU.sanitaires;
  trou(...s.passage);
  for (const p of s.portes) pt(p.x, p.y, p.l, p.axe, p.sens);
  for (const [x, y] of s.cuvettes) R(x, y, 0.45, 0.65, "mob", 0.15);
  for (const [x, y] of s.etiquettes) texte(x, y, "WC", "us");
}

function e2(t, n) {
  if (!E2.dessert.includes(n.id)) return;
  const ed = E2.edicules[n.id];
  const [x1, y1, x2, y2] = ed ?? E2.rect;
  t.L(x2, y1, x2, y2, "por");
  t.L(x1, y2, x2, y2, "por");
  if (ed) (t.L(x1, y1, x2, y1, "por"), t.L(x1, y1, x1, y2, "por"));
  const w = (x2 - x1 - 0.9) / 2;
  t.esc(x1 + 0.4, y1 + 0.4, w, y2 - y1 - 0.8);
  t.esc(x1 + 0.5 + w, y1 + 0.4, w, y2 - y1 - 0.8);
  t.texte((x1 + x2) / 2, (y1 + y2) / 2 + 0.2, "E2", "us");
}

function vide(t, v) {
  const [x1, y1, x2, y2] = v.rect;
  const [w, h, cx, cy] = [x2 - x1, y2 - y1, (x1 + x2) / 2, (y1 + y2) / 2];
  if (v.type === "eau") {
    for (const d of [0.25, 0.45, 0.65])
      t.L(x1 + d, y1 + 0.4, x1 + d, y2 - 0.4, "tir");
    t.R(x1 + 0.15, y1 + 0.3, w - 0.15, h - 0.6, "fin");
    return t.texte(x1 + 1, y2 - 0.6, v.nom, "us", ' style="text-anchor:start"');
  }
  if (v.type === "verriere") {
    t.R(x1, y1, w, h, "fin");
    for (let x = x1 + 2; x < x2; x += 2) t.L(x, y1, x, y2, "mob");
    t.L(x1, cy, x2, cy, "mob");
    return t.nom(cx, cy - 0.4, "", v.sous);
  }
  t.R(x1, y1, w, h, "tir");
  if (v.type === "vide")
    (t.L(x1, y1, x2, y2, "tir"), t.L(x1, y2, x2, y1, "tir"));
  for (const a of tousLieux
    .get(v.cimes)
    ?.mobilier.filter((m) => m.type === "arbre") ?? [])
    t.Ci(a.x, a.y, a.r, "arb2");
  t.nom(cx, cy + (v.cimes ? 0.3 : 0), v.nom, v.sous);
}

function cotes(t, n) {
  const { L, Ci, P, texte } = t;
  TRAME.x.forEach((x, i) => {
    L(x, -1.2, x, -4.2, "mob");
    Ci(x, -5.2, 1, "bul");
    texte(x, -4.68, TRAME.axesX[i], "bult");
    if (i < 6) texte(x + 3.6, -2.5, "7,20", "cote");
    L(x - 0.3, -1.8, x + 0.3, -2.4, "fin");
  });
  L(0, -2.1, W, -2.1, "mob");
  TRAME.y.forEach((y, i) => {
    L(W + 1.2, y, W + 4.4, y, "mob");
    Ci(W + 5.4, y, 1, "bul");
    texte(W + 5.4, y + 0.52, TRAME.axesY[i], "bult");
    L(W + 1.9, y + 0.3, W + 2.5, y - 0.3, "fin");
  });
  L(W + 2.2, 0, W + 2.2, H, "mob");
  for (const [y, c] of [
    [3.6, "7,20"],
    [12.6, "10,80"],
    [21.6, "7,20"],
  ])
    texte(
      W + 3.4,
      y,
      c,
      "cote",
      ` transform="rotate(90 ${t.f(W + 3.4)} ${t.f(y)})"`,
    );
  const emprise = n.x0
    ? ` · emprise du niveau ${(W - n.x0).toFixed(2).replace(".", ",")} × 25,20`
    : " × 25,20";
  texte(
    21.6,
    -0.9,
    `43,20 hors tout${emprise}`,
    "cote",
    ' style="font-size:3.2px"',
  );
  P(
    `<g transform="translate(-22 304)"><circle r="11" class="fin"/><path d="M0 -15L5 6L0 2L-5 6Z" fill="var(--mag)"/><text y="-17.5" class="bult">N</text></g>`,
  );
  P(
    `<g transform="translate(10 310)"><rect width="50" height="2.4" class="pot"/><rect x="50" width="50" height="2.4" class="fin"/><rect x="100" width="100" height="2.4" class="pot"/>` +
      [
        [0, "0"],
        [50, "5"],
        [100, "10"],
        [200, "20 m"],
      ]
        .map(([x, c]) => `<text x="${x}" y="-2.5" class="cote">${c}</text>`)
        .join("") +
      "</g>",
  );
  const hsp = n.facade === false ? "·" : `${sousPlafond(n).split(" (")[0]} m`;
  P(`<g transform="translate(262 272)"><rect width="235" height="50" class="fin"/><line x1="92" y1="0" x2="92" y2="50" class="fin"/><line x1="92" y1="25" x2="235" y2="25" class="fin"/><line x1="170" y1="25" x2="170" y2="50" class="fin"/>
  <text x="8" y="21" class="ct g">ZIK TOWER</text><text x="8" y="32" class="ct">DOSSIER DE PLANS</text><text x="8" y="40" class="ct">INDICE B · 17.11.2026</text>
  <text x="100" y="11" class="ct">${n.nom.toUpperCase()} · ${alt(n.z)}</text><text x="100" y="20" class="ct m">${n.theme.split(" · ")[0].toUpperCase()}</text>
  <text x="100" y="35" class="ct">ÉCHELLE</text><text x="100" y="44" class="ct m">1:200</text><text x="178" y="35" class="ct">SOUS PLAFOND</text><text x="178" y="44" class="ct m">${hsp}</text></g>`);
}

const hachure = (t, hp, [x1, y1, x2, y2], plus = "") =>
  t.P(
    `<rect x="${t.f(x1)}" y="${t.f(y1)}" width="${t.f(x2 - x1)}" height="${t.f(y2 - y1)}" fill="url(#${hp})"${plus}/>`,
  );

export function dessinerPlan(n) {
  const t = trait();
  const hp = `hP-${n.id}`;
  const x0 = n.x0;
  t.P('<rect x="-52" y="-66" width="552" height="402" fill="var(--plan)"/>');
  if (x0) t.R(0, 0, W, H, "tir");
  if (n.facade === false) {
    t.R(x0, 0, W - x0, H, "fin");
    hachure(t, hp, [x0, 0, W, H], ' opacity=".5"');
  } else {
    const cl = n.facade === "porteur" ? "por" : "vit";
    for (const c of [
      [x0, 0, W, 0],
      [x0, H, W, H],
      [x0, 0, x0, H],
      [W, 0, W, H],
    ])
      cl === "por" ? t.L(...c, "por") : t.vit(...c);
  }
  for (const p of n.terrasses.filter((p) => !p.altitude)) {
    const [x1, , x2] = boite(p.poly);
    hachure(t, hp, [x1, 0, x2, H]);
    t.vit(x1, 0, x2, 0);
    t.vit(x1, H, x2, H);
    t.vit(x1, 0, x1, H);
  }
  for (const p of n.pieces.filter((p) => p.exterieur))
    hachure(t, hp, boite(p.poly));
  for (const v of VIDES.filter((v) => v.niveau === n.id)) vide(t, v);
  for (const m of n.murs) {
    if (m.type === "trou") t.trou(m.x1, m.y1, m.x2, m.y2);
    else if (m.type.startsWith("vitrage"))
      t.vit(m.x1, m.y1, m.x2, m.y2, m.type === "vitrage-or" ? "orl" : "vit");
    else t.L(m.x1, m.y1, m.x2, m.y2, TRAITS[m.type]);
  }
  e2(t, n);
  for (const p of lieux(n)) p.mobilier.forEach(t.meuble);
  n.abords.forEach(t.meuble);
  decoPlan(t, n);
  for (const d of n.portes) {
    const { x, y, l, axe, sens, type } = d;
    const [c, e] = axe === "h" ? [x + l, y] : [x, y + l];
    if (type === "ouvert") continue;
    if (type && type !== "battant") t.trou(x, y, c, e);
    if (type === "rideau") t.L(x, y, c, e, "tir");
    if (type === "tambour") {
      t.Ci((x + c) / 2, (y + e) / 2, l / 2, "fin");
      t.L(x, y, c, e, "fin");
      if (axe === "v") t.L(x - l / 2, y + l / 2, x + l / 2, y + l / 2, "fin");
      else t.L(x + l / 2, y - l / 2, x + l / 2, y + l / 2, "fin");
    }
    if (type === "portiques")
      for (let i = 0; i < d.n; i++) {
        const k = (i * (l - 0.2)) / (d.n - 1);
        axe === "v"
          ? t.R(x - 0.7, y + k, 1.4, 0.2, "fin")
          : t.R(x + k, y - 0.7, 0.2, 1.4, "fin");
      }
    if (!type)
      d.double
        ? t.pt2(x, y, l, axe, sens)
        : t.pt(x, y, l, axe, sens, d.inverse);
  }
  for (const p of lieux(n))
    if (p.etiquette)
      t.nom(
        ...p.etiquette,
        p.nom,
        p.sous,
        [prive(p) ? "o" : "", p.petit ? "p" : ""].join(" "),
      );
  for (const x of n.textes) {
    const c = x.ref ? tousLieux.get(x.ref).nom + (x.suffixe ?? "") : x.t;
    const rot = x.rot
      ? ` transform="rotate(${x.rot} ${t.f(x.x)} ${t.f(x.y)})"`
      : "";
    t.texte(
      x.x,
      x.y,
      c,
      x.style === "us-or" ? "us" : x.style,
      (x.style === "us-or" ? ' style="fill:var(--or)"' : "") + rot,
    );
  }
  if (NOYAU.niveaux.includes(n.id)) noyau(t, n);
  if (n.facade !== false)
    for (const x of TRAME.x.filter((x) => x >= x0 - 0.01))
      for (const y of TRAME.y) t.R(x - 0.3, y - 0.3, 0.6, 0.6, "pot");
  cotes(t, n);
  return `<svg viewBox="-52 -66 552 402" role="img" aria-label="Plan ${n.nom}, ${n.theme}"><defs><pattern id="${hp}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6h6" stroke="#8D90A6" stroke-width=".3"/></pattern></defs>${t.o.join("")}${t.lab.join("")}</svg>`;
}
