import { describe, expect, it } from "vitest";
import {
  ACCES,
  E2,
  FESTIVALS,
  NIVEAUX,
  NOYAU,
  TRAME,
  VIDES,
  lieux,
} from "../public/tour/plan.js";
import { dessinerPlan } from "../public/tour/dessin.js";
import { dessinerCoupe } from "../public/tour/coupe.js";
import { EQUIPE } from "../public/noms.js";

const W = TRAME.largeur;
const H = TRAME.profondeur;
const rectPoly = ([x1, y1, x2, y2]) => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];
function dedans([x, y], poly) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      ok = !ok;
  }
  return ok;
}
const auSol = (n) => lieux(n).filter((p) => !p.altitude);
const e2 = (n) =>
  E2.dessert.includes(n.id) ? (E2.edicules[n.id] ?? E2.rect) : null;
// Ce qui se trouve au point (x, y) d'un niveau : un lieu, E2, le noyau, ou dehors.
function quoi(n, pt) {
  const p = auSol(n).find((l) => dedans(pt, l.poly));
  if (p) return p.id;
  if (e2(n) && dedans(pt, rectPoly(e2(n)))) return "E2";
  if (dedans(pt, rectPoly(NOYAU.rect))) return "noyau";
  const [x, y] = pt;
  return x < n.x0 || x > W || y < 0 || y > H ? "dehors" : null;
}
// Les deux côtés d'un passage de largeur l, à d mètres du trait.
function cotes({ x, y, l, axe }, d = 0.3) {
  return axe === "h"
    ? [
        [x + l / 2, y - d],
        [x + l / 2, y + d],
      ]
    : [
        [x - d, y + l / 2],
        [x + d, y + l / 2],
      ];
}
const palier = (a) => cotes(a.porte)[a.porte.cote > 0 ? 1 : 0];
const DEHORS = new Set(["rue", "service"]);
const tous = NIVEAUX.flatMap((n) => lieux(n).map((p) => ({ ...p, niveau: n })));

describe("plan de la ZIK Tower", () => {
  it("chaque lieu a un id et un nom uniques, un usage, une raison et un accès connu", () => {
    expect(new Set(tous.map((p) => p.id)).size).toBe(tous.length);
    expect(new Set(tous.map((p) => p.nom)).size).toBe(tous.length);
    for (const p of tous) {
      expect(p.usage, p.id).toBeTruthy();
      expect(p.pourquoi, p.id).toBeTruthy();
      expect(ACCES, p.id).toContain(p.acces);
      expect(p.poly.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.nom, p.id).not.toMatch(/bataclan/i);
    }
  });

  it("chaque pièce est dans l'emprise de son niveau, chaque terrasse sur le toit du niveau du dessous", () => {
    NIVEAUX.forEach((n, i) => {
      for (const p of n.pieces)
        for (const [x, y] of p.poly) {
          expect(x, p.id).toBeGreaterThanOrEqual(n.x0);
          expect(x, p.id).toBeLessThanOrEqual(W);
          expect(y, p.id).toBeGreaterThanOrEqual(0);
          expect(y, p.id).toBeLessThanOrEqual(H);
        }
      for (const p of n.terrasses)
        for (const [x, y] of p.poly) {
          expect(x, p.id).toBeGreaterThanOrEqual(NIVEAUX[i - 1].x0);
          if (!p.altitude) expect(x, p.id).toBeLessThanOrEqual(n.x0);
          expect(y, p.id).toBeGreaterThanOrEqual(0);
          expect(y, p.id).toBeLessThanOrEqual(H);
        }
    });
  });

  it("aucun lieu ne chevauche un autre lieu, le noyau, E2 ou un vide", () => {
    for (const n of NIVEAUX) {
      const zones = auSol(n).map((p) => [p.id, p.poly]);
      if (NOYAU.niveaux.includes(n.id))
        zones.push(["noyau", rectPoly(NOYAU.rect)]);
      if (e2(n)) zones.push(["E2", rectPoly(e2(n))]);
      for (const v of VIDES.filter(
        (v) => v.niveau === n.id && ["vide", "atrium"].includes(v.type),
      ))
        zones.push([v.id, rectPoly(v.rect)]);
      for (let x = n.x0 + 0.05; x < W; x += 0.2)
        for (let y = 0.05; y < H; y += 0.2) {
          const ici = zones
            .filter(([, poly]) => dedans([x, y], poly))
            .map(([id]) => id);
          expect(
            ici.length,
            `${n.id} (${x.toFixed(2)}, ${y.toFixed(2)}) : ${ici}`,
          ).toBeLessThanOrEqual(1);
        }
    }
  });

  it("chaque lieu a au moins une porte, et chaque porte relie ce qu'elle annonce", () => {
    for (const n of NIVEAUX) {
      for (const p of lieux(n))
        expect(
          n.portes.some((d) => d.entre.includes(p.id)),
          `${n.id} ${p.id}`,
        ).toBe(true);
      for (const d of n.portes) {
        if (d.entre.some((id) => lieux(n).find((p) => p.id === id)?.altitude))
          continue;
        const attendu = d.entre.map((id) => (DEHORS.has(id) ? "dehors" : id));
        const vus = cotes(d).map((pt) => quoi(n, pt));
        expect(vus.sort(), `${n.id} porte (${d.x}, ${d.y}) ${d.entre}`).toEqual(
          (attendu.length === 1 ? [attendu[0], attendu[0]] : attendu).sort(),
        );
      }
    }
  });

  it("le noyau est au même endroit à tous les niveaux qu'il traverse", () => {
    const [x1, y1, x2, y2] = NOYAU.rect;
    expect(NOYAU.niveaux).toEqual(NIVEAUX.map((n) => n.id));
    for (const n of NIVEAUX)
      expect(x1 >= n.x0 && x2 <= W && y1 >= 0 && y2 <= H, n.id).toBe(true);
    const boites = [
      ...NOYAU.ascenseurs.map((a) => a.cabine),
      ...NOYAU.escaliers.flatMap((e) => e.volees),
      ...NOYAU.gaines,
    ];
    for (const [x, y, w, h] of boites)
      expect(x >= x1 && y >= y1 && x + w <= x2 && y + h <= y2).toBe(true);
  });

  it("chaque ascenseur ne s'arrête qu'aux niveaux qu'il dessert, sur un lieu qui lui est permis", () => {
    const ids = NIVEAUX.map((n) => n.id);
    for (const a of NOYAU.ascenseurs) {
      for (const id of a.dessert) expect(NOYAU.niveaux, a.id).toContain(id);
      if (!a.prive) {
        const rangs = a.dessert.map((id) => ids.indexOf(id));
        expect(rangs.at(-1) - rangs[0] + 1, `${a.id} sans trou`).toBe(
          rangs.length,
        );
      }
      for (const n of NIVEAUX) {
        const arrivee = quoi(n, palier(a));
        if (!a.dessert.includes(n.id)) continue;
        const lieu = lieux(n).find((p) => p.id === arrivee);
        expect(lieu, `${a.id} au ${n.id} débouche sur ${arrivee}`).toBeTruthy();
        if (a.prive)
          expect(
            ["direction", "fondateur", "service"],
            `${a.id} ${n.id}`,
          ).toContain(lieu.acces);
        else
          expect(["public", "fondateur"], `${a.id} ${n.id}`).not.toContain(
            lieu.acces,
          );
      }
    }
    expect(NOYAU.ascenseurs.find((a) => a.id === "A1").dessert).not.toContain(
      "n7",
    );
  });

  it("chaque agent de noms.js a un poste et une seule place", () => {
    const places = tous
      .flatMap((p) =>
        p.mobilier.flatMap((m) => [m.occupant, ...(m.occupants ?? [])]),
      )
      .filter((id) => id && id !== "libre" && !id.startsWith("renfort:"));
    expect([...places].sort()).toEqual(Object.keys(EQUIPE).sort());
    for (const p of tous)
      for (const id of p.occupants) expect(EQUIPE[id], p.id).toBeTruthy();
  });

  it("chaque salle de réunion porte un nom de festival, jamais deux fois le même", () => {
    const salles = tous.filter((p) => p.reunion);
    expect(salles.length).toBeGreaterThanOrEqual(10);
    for (const s of salles) expect(FESTIVALS, s.id).toContain(s.nom);
    expect(new Set(salles.map((s) => s.nom)).size).toBe(salles.length);
    expect(salles.find((s) => s.nom === "Woodstock").usage).toMatch(/board/);
    for (const p of tous.filter((p) => !p.reunion))
      expect(FESTIVALS, p.id).not.toContain(p.nom);
  });

  it("les pièces publiques sont reliées à la rue sans passer par une pièce non publique", () => {
    const publics = new Set([
      "rue",
      ...tous.filter((p) => p.acces === "public").map((p) => p.id),
    ]);
    expect(publics.size).toBeGreaterThan(1);
    const portes = NIVEAUX.flatMap((n) => n.portes);
    const vus = new Set(["rue"]);
    for (let encore = true; encore;) {
      encore = false;
      for (const d of portes) {
        const [a, b = a] = d.entre;
        if (!publics.has(a) || !publics.has(b)) continue;
        for (const [x, y] of [
          [a, b],
          [b, a],
        ])
          if (vus.has(x) && !vus.has(y)) (vus.add(y), (encore = true));
      }
    }
    for (const id of publics) expect(vus.has(id), id).toBe(true);
    for (const d of portes) {
      const pub = d.entre.filter((id) => publics.has(id)).length;
      if (pub === 1 && d.entre.length === 2)
        expect(d.controle, `${d.entre}`).toBeTruthy();
    }
    expect(tous.find((p) => p.id === "cavern-club").acces).toBe("public");
    expect(tous.find((p) => p.id === "carnegie-hall").acces).not.toBe("public");
  });

  it("chaque lieu est accessible depuis le noyau, E2 ou la rue", () => {
    for (const n of NIVEAUX) {
      const vus = new Set(["dehors", "E2"]);
      for (const a of NOYAU.ascenseurs)
        if (a.dessert.includes(n.id)) vus.add(quoi(n, palier(a)));
      for (const e of NOYAU.escaliers)
        if (e.dessert.includes(n.id)) vus.add(quoi(n, cotes(e.porte)[0]));
      for (let encore = true; encore;) {
        encore = false;
        for (const d of n.portes) {
          const ids = d.entre.map((id) => (DEHORS.has(id) ? "dehors" : id));
          if (ids.some((id) => vus.has(id)) && ids.some((id) => !vus.has(id)))
            (ids.forEach((id) => vus.add(id)), (encore = true));
        }
      }
      for (const p of lieux(n))
        expect(vus.has(p.id), `${n.id} ${p.id}`).toBe(true);
    }
  });

  it("dessine chaque niveau et la coupe avec les noms du plan", () => {
    for (const n of NIVEAUX) {
      const svg = dessinerPlan(n);
      for (const p of lieux(n).filter((p) => p.etiquette))
        expect(svg, p.id).toContain(p.nom);
    }
    const coupe = dessinerCoupe();
    expect(coupe).toContain("Woodstock");
    expect(coupe).toContain('data-n="ss"');
  });
});
