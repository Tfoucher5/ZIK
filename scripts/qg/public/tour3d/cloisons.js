// Cloisons, vitrages et portes d'un niveau, depuis les murs et portes du plan (les façades sont à la structure).
import * as THREE from "three";
import { MAT, boite, cylindre } from "../meubles.js";
import { porte } from "../portes.js";
import { versLocal } from "./repere.js";
import { enFacade, troncons } from "./interieur-plan.js";
import { M, groupe, lueur } from "./mobilier-base.js";

const IGNORES = new Set(["trou", "pointille", "acrotere"]);
const lecteur = lueur("#3ddc84", 1.4);
const sortie = lueur("#22c55e", 1.6);

function paroi(g, [x1, y1, x2, y2], type, h) {
  const a = versLocal(x1, y1);
  const b = versLocal(x2, y2);
  const l = Math.hypot(b.x - a.x, b.z - a.z);
  const s = groupe(
    g,
    (a.x + b.x) / 2,
    (a.z + b.z) / 2,
    Math.atan2(-(b.z - a.z), b.x - a.x),
  );
  if (type === "cloison" || type === "porteur") {
    boite(s, l, h, type === "porteur" ? 0.25 : 0.12, MAT.platre, 0, h / 2, 0);
    return;
  }
  if (type === "mobile") {
    boite(s, l, h - 0.1, 0.1, MAT.chene, 0, (h - 0.1) / 2, 0);
    for (let x = -l / 2 + 1.2; x < l / 2; x += 1.2)
      boite(s, 0.02, h - 0.1, 0.11, M.noyer, x, (h - 0.1) / 2, 0);
    return;
  }
  const garde = type === "garde-corps";
  const hv = garde ? 1.1 : h;
  const cadre = type === "vitrage-or" ? MAT.or : MAT.noir;
  boite(s, l, hv, 0.03, MAT.verre, 0, hv / 2, 0).castShadow = false;
  boite(s, l, 0.05, 0.07, garde ? MAT.alu : cadre, 0, hv, 0);
  if (garde) return;
  boite(s, l, 0.05, 0.07, cadre, 0, 0.025, 0);
  for (let x = -l / 2 + 1.2; x < l / 2 - 0.2; x += 1.2)
    boite(s, 0.04, h, 0.05, cadre, x, h / 2, 0);
}

function portiques(g, l, n) {
  const pas = l / n;
  for (let i = 0; i <= n; i++) {
    const x = -l / 2 + i * pas;
    boite(g, 0.18, 1, 0.9, MAT.alu, x, 0.5, 0);
    boite(g, 0.12, 0.02, 0.12, lecteur, x, 1.01, 0.3);
    if (i < n)
      for (const s of [-1, 1])
        boite(
          g,
          pas / 2 - 0.15,
          0.6,
          0.02,
          MAT.verre,
          x + pas / 2 + (s * pas) / 4,
          0.75,
          0,
        ).castShadow = false;
  }
}

function tambour(g, l, anime) {
  const r = l / 2;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 2.4, 32, 1, true, 0.6, Math.PI - 1.2),
    MAT.verre,
  );
  tube.position.y = 1.2;
  const tube2 = tube.clone();
  tube2.rotation.y = Math.PI;
  g.add(tube, tube2);
  cylindre(g, r + 0.05, 0.12, MAT.noir, 0, 2.45, 0, 32);
  const rotor = groupe(g, 0, 0);
  cylindre(rotor, 0.06, 2.3, MAT.alu, 0, 1.15, 0, 8);
  for (let k = 0; k < 4; k++)
    boite(
      rotor,
      r - 0.1,
      2.2,
      0.03,
      MAT.verre,
      ((r - 0.1) / 2) * Math.cos((k * Math.PI) / 2),
      1.1,
      ((r - 0.1) / 2) * Math.sin((k * Math.PI) / 2),
    ).rotation.y = (-k * Math.PI) / 2;
  anime((dt) => (rotor.rotation.y += dt * 0.5));
}

function ouverture(g, p, h, anime, x0) {
  const a = versLocal(p.x, p.y);
  const rot = p.axe === "h" ? 0 : -Math.PI / 2;
  const type = p.type ?? (p.double ? "double" : "battant");
  const milieu = groupe(
    g,
    a.x + (p.axe === "h" ? p.l / 2 : 0),
    a.z + (p.axe === "h" ? 0 : p.l / 2),
    rot,
  );
  if (type === "portiques") portiques(milieu, p.l, p.n ?? 3);
  else if (type === "tambour") tambour(milieu, p.l, anime);
  else if (type === "rideau" || type === "quai")
    boite(milieu, p.l, 0.4, 0.3, M.gris, 0, Math.min(h - 0.2, 3.2), 0);
  else if (type === "double") {
    porte(g, a.x, a.z, rot, p.l / 2, MAT.porte, p.sens || 1);
    const b = versLocal(
      p.x + (p.axe === "h" ? p.l : 0),
      p.y + (p.axe === "h" ? 0 : p.l),
    );
    porte(g, b.x, b.z, rot + Math.PI, p.l / 2, MAT.porte, -(p.sens || 1));
  } else if (type === "battant") {
    if (p.inverse) {
      const b = versLocal(
        p.x + (p.axe === "h" ? p.l : 0),
        p.y + (p.axe === "h" ? 0 : p.l),
      );
      porte(g, b.x, b.z, rot + Math.PI, p.l, MAT.porte, -(p.sens || 1));
    } else porte(g, a.x, a.z, rot, p.l, MAT.porte, p.sens || 1);
  }
  const facade = enFacade(
    {
      x1: p.x,
      y1: p.y,
      x2: p.axe === "h" ? p.x + 1 : p.x,
      y2: p.axe === "h" ? p.y : p.y + 1,
    },
    x0,
  );
  if (!facade && type !== "ouvert" && type !== "passage" && h > 2.3)
    boite(milieu, p.l, h - 2.15, 0.12, MAT.platre, 0, (h + 2.15) / 2, 0);
  if (p.controle === "badge")
    boite(milieu, 0.08, 0.12, 0.2, lecteur, p.l / 2 + 0.2, 1.2, 0);
  if (p.controle === "issue") boite(milieu, 0.36, 0.14, 0.2, sortie, 0, 2.3, 0);
}

// Tout dans un groupe de murs, abaissé d'un bloc quand le niveau est ouvert en coupe (structure.js) ; garde-corps à part.
export function cloisons(parent, niveau, h, anime) {
  const g = groupe(parent, 0, 0);
  g.userData.mur = { niveau: niveau.id, hauteur: h };
  for (const m of niveau.murs ?? []) {
    if (IGNORES.has(m.type) || enFacade(m, niveau.x0)) continue;
    const ou = m.type === "garde-corps" ? parent : g;
    for (const t of troncons(m, niveau.portes ?? [])) paroi(ou, t, m.type, h);
  }
  for (const p of niveau.portes ?? []) ouverture(g, p, h, anime, niveau.x0);
}
