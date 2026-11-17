// Intérieur d'un niveau de la ZIK TOWER, en coordonnées locales au groupe du niveau, construit depuis le plan.
import * as THREE from "three";
import { MAT, plante, solForme, titre } from "../meubles.js";
import { ZIK } from "../deco.js";
import { lieux } from "../tour/plan.js";
import { CENTRE, versLocal } from "./repere.js";
import {
  airePoly,
  bureaux,
  centrePoly,
  ecranZik,
  lireNiveau,
  solDe,
} from "./interieur-plan.js";
import { cloisons } from "./cloisons.js";
import { NEUTRE, bureau3d, mat } from "./mobilier-base.js";
import { meuble3d } from "./mobilier.js";

const SOLS = {
  moquette: MAT.moquette,
  beton: MAT.beton,
  carrelage: MAT.carrelage,
  parquet: MAT.parquet,
  sportif: mat("#2f6f8f", { roughness: 0.6 }),
  gazon: mat("#4f7d3a", { roughness: 1 }),
  terrasse: mat("#8a6a4e", { roughness: 0.8 }),
};
const SANS_GRILLE = { bloquer() {}, segment() {} };
const ORNE = new Set(["direction", "fondateur"]);
// Déjà construits par la structure (structure.js).
const FAIT_PAR_STRUCTURE = new Set(["savile-row"]);
const TOIT_STRUCTURE = new Set(["plateforme", "helisurface", "ecran"]);

const v3 = ({ x, z }) => new THREE.Vector3(x, 0, z);
const siege = (s) => ({ place: v3(s), angle: s.angle, debout: s.debout });

const sousPlafond = (niveau) =>
  Number.parseFloat(String(niveau.sousPlafond ?? "").replace(",", ".")) ||
  niveau.h - 0.8;

// Atrium boisé : des massifs le long des bords des pièces plantées.
function massifs(g, poly) {
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const l = Math.hypot(x2 - x1, y2 - y1);
    const [cx, cy] = centrePoly(poly);
    for (let d = 1; d < l - 0.5; d += 1.8) {
      const px = x1 + ((x2 - x1) * d) / l;
      const py = y1 + ((y2 - y1) * d) / l;
      const k = 0.7 / Math.hypot(cx - px, cy - py);
      const p = versLocal(px + (cx - px) * k, py + (cy - py) * k);
      plante(
        g,
        SANS_GRILLE,
        p.x,
        p.z,
        0.8 + (i % 3) * 0.3,
        Math.round(d) % 2 === 0,
      );
    }
  }
}

export function interieur(groupe, niveau) {
  const h = sousPlafond(niveau);
  const fonctions = [];
  const anime = (f) => fonctions.push(f);
  const lu = lireNiveau(niveau);
  const ecrans = {};
  const tousEcrans = [];

  cloisons(groupe, niveau, h, anime);

  for (const p of lieux(niveau)) {
    if (FAIT_PAR_STRUCTURE.has(p.id)) continue;
    const sol = solDe(p);
    if (!niveau.terrasses.includes(p)) {
      const contour = p.poly.map(([x, y]) => {
        const q = versLocal(x, y);
        return [q.x, q.z];
      });
      solForme(groupe, contour, SOLS[sol], 0.005);
    }
    if (sol === "gazon") massifs(groupe, p.poly);

    const [ex, ey] = p.etiquette ?? centrePoly(p.poly);
    const e = versLocal(ex, ey);
    const couleur = ORNE.has(p.acces) ? ZIK.or : "#e5e7eb";
    titre(groupe, p.nom, couleur, e.x, e.z, p.usage ?? "", Math.min(h, 2.9));

    const c = { piece: p, zik: ecranZik(p), hauteur: h, anime };
    for (const m of p.mobilier) {
      if (niveau.id === "toit" && TOIT_STRUCTURE.has(m.type)) continue;
      const postes = bureaux(m, p);
      if (!postes.length || m.type === "comptoir") meuble3d(groupe, m, c);
      for (const b of postes) {
        const ecran = bureau3d(groupe, b, c.zik ? ZIK.magenta : NEUTRE);
        tousEcrans.push({ x: b.x + CENTRE.x, y: b.z + CENTRE.y, ecran });
        if (lu.postes[b.occupant]?.piece === p.id) ecrans[b.occupant] = ecran;
      }
    }
  }

  const postes = Object.fromEntries(
    Object.entries(lu.postes).map(([id, b]) => [
      id,
      { place: v3(b.place), angle: b.angle, ecran: ecrans[id] },
    ]),
  );
  const pauses = lu.pauses.map((s) => ({ ...siege(s), piece: s.piece }));
  const salles = Object.fromEntries(
    Object.entries(lu.salles).map(([id, s]) => [
      id,
      { centre: v3(s.centre), sieges: s.sieges.map(siege) },
    ]),
  );

  const lampes = lieux(niveau)
    .filter((p) => !p.exterieur)
    .sort((a, b) => airePoly(b.poly) - airePoly(a.poly))
    .slice(0, 4)
    .map((p) => {
      const c = versLocal(...centrePoly(p.poly));
      const l = new THREE.PointLight("#ffe2b8", 6, 14, 1.6);
      l.position.set(c.x, h - 0.3, c.z);
      groupe.add(l);
      return l;
    });

  return {
    postes,
    pauses,
    lieux: salles,
    lampes,
    ecrans: tousEcrans,
    animer: (dt, t) => fonctions.forEach((f) => f(dt, t)),
  };
}
