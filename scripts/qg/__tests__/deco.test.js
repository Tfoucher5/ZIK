import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NOYAU, lieux, niveau } from "../public/tour/plan.js";
import { DECO, FACES, MURAL, SOL, taille } from "../public/tour/deco.js";
import { SYMBOLES, symbole } from "../public/tour/deco-trait.js";
import { dessinerPlan } from "../public/tour/dessin.js";

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
const segment = ({ x, y, l, axe }) => [
  x,
  y,
  ...(axe === "h" ? [x + l, y] : [x, y + l]),
];
function distance([px, py], [x1, y1, x2, y2]) {
  const [dx, dy] = [x2 - x1, y2 - y1];
  const k = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(px - x1 - k * dx, py - y1 - k * dy);
}
// Portes d'un niveau, noyau compris (paliers des ascenseurs et de l'escalier qui le desservent, sanitaires).
const portes = (n) =>
  [
    ...n.portes,
    ...[...NOYAU.ascenseurs, ...NOYAU.escaliers]
      .filter((a) => a.dessert.includes(n.id))
      .map((a) => a.porte),
    ...NOYAU.sanitaires.portes,
  ].map(segment);
// Points de l'emprise d'un élément : le long du mur, ou le carré (tapis : le rectangle) d'un objet posé.
function emprise(e) {
  const { l } = taille(e);
  const [dx, dy] = FACES[e.face];
  if (e.sol) {
    const [a, b] = e.type === "tapis" ? [e.l / 2, e.p / 2] : [l / 2, l / 2];
    return [-1, 0, 1].flatMap((i) =>
      [-1, 0, 1].map((j) => [e.x + i * a, e.y + j * b]),
    );
  }
  const [ux, uy] = [Math.abs(dy), Math.abs(dx)];
  return Array.from({ length: 11 }, (_, k) => {
    const s = (k / 10 - 0.5) * l;
    return [e.x + ux * s + dx * 0.3, e.y + uy * s + dy * 0.3];
  });
}
const tous = Object.entries(DECO).flatMap(([id, l]) =>
  l.map((e) => ({ ...e, niveau: id })),
);
const source3d = ["deco3d.js", "deco-toiles.js"]
  .map((f) =>
    readFileSync(new URL(`../public/tour3d/${f}`, import.meta.url), "utf8"),
  )
  .join("\n");

describe("déco de la ZIK TOWER", () => {
  it("habille chaque niveau du RDC au N6, pas le N7", () => {
    expect(Object.keys(DECO).sort()).toEqual([
      "n0",
      "n1",
      "n2",
      "n3",
      "n4",
      "n5",
      "n6",
    ]);
  });

  it.each(
    tous.map((e) => [`${e.niveau} ${e.piece} ${e.type} (${e.x}, ${e.y})`, e]),
  )("%s : dans sa pièce, loin des portes, type connu en 2D et 3D", (_, e) => {
    const n = niveau(e.niveau);
    const piece = lieux(n).find((p) => p.id === e.piece);
    expect(piece).toBeTruthy();
    expect(FACES[e.face]).toBeTruthy();
    expect((e.sol ? SOL : MURAL)[e.type]).toBeTruthy();
    const { h } = taille(e);
    if (!e.sol) expect(h >= 1.2 && h <= 2.45).toBe(true);
    for (const pt of emprise(e)) {
      expect(dedans(pt, piece.poly)).toBe(true);
      for (const p of portes(n)) expect(distance(pt, p)).toBeGreaterThan(1);
    }
    expect(SYMBOLES[symbole(e)]).toBeTypeOf("function");
    expect(source3d).toMatch(
      new RegExp(`^  "?${e.type}"?: |e\\.type === "${e.type}"`, "m"),
    );
  });

  it("dessine la déco sur le plan du niveau", () => {
    const svg = dessinerPlan(niveau("n0"));
    expect(svg.match(/stroke="var\(--mag\)"/g)?.length).toBeGreaterThanOrEqual(
      DECO.n0.length,
    );
  });
});
