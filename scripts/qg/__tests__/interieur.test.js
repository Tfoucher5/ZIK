import { describe, expect, it } from "vitest";
import { NIVEAUX, niveau } from "../public/tour/plan.js";
import { EQUIPE } from "../public/noms.js";
import { versLocal } from "../public/tour3d/repere.js";
import {
  bureaux,
  enFacade,
  lireNiveau,
  sieges,
  solDe,
  troncons,
} from "../public/tour3d/interieur-plan.js";

const tous = NIVEAUX.map(lireNiveau);

describe("intérieurs 3D lus depuis le plan", () => {
  it("donne un poste à chaque agent de noms.js, une seule fois", () => {
    const ids = tous.flatMap((n) => Object.keys(n.postes));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.keys(EQUIPE).sort());
  });

  it("place l'occupant d'un poste nord au nord du bureau, tourné vers le sud", () => {
    const [b] = bureaux({
      type: "poste",
      x: 10,
      y: 4,
      w: 2,
      h: 1,
      a: 0,
      occupant: "dev",
    });
    const c = versLocal(11, 4.5);
    expect(b).toMatchObject({ x: c.x, z: c.z, rot: Math.PI, angle: 0 });
    expect(b.place.z).toBeCloseTo(c.z - 0.95);
    const [s] = bureaux({ type: "poste", x: 10, y: 4, w: 2, h: 1, a: 180 });
    expect(s.place.z).toBeCloseTo(c.z + 0.95);
    expect(s.angle).toBe(Math.PI);
  });

  it("range un îlot rangée nord puis rangée sud, comme le plan", () => {
    const b = bureaux({
      type: "ilot",
      x: 5,
      y: 2,
      n: 2,
      occupants: ["a", "b", "c"],
    });
    expect(b.map((p) => p.occupant)).toEqual(["a", "b", "c", null]);
    expect(b[2].x).toBeCloseTo(versLocal(5.8, 0).x);
    expect(b[0].place.z).toBeLessThan(b[2].place.z);
  });

  it("met chaque poste dans sa pièce, en coordonnées locales", () => {
    const n6 = lireNiveau(niveau("n6"));
    expect(n6.postes.ceo.piece).toBe("aretha");
    expect(n6.postes.ceo.x).toBeCloseTo(versLocal(23.8, 0).x);
  });

  it("perce les murs aux portes et laisse les murs sans porte entiers", () => {
    const m = { x1: 0, y1: 5, x2: 10, y2: 5 };
    expect(troncons(m, [])).toEqual([[0, 5, 10, 5]]);
    const p = [
      { x: 4, y: 5, l: 1, axe: "h" },
      { x: 2, y: 0, l: 1, axe: "v" },
    ];
    expect(troncons(m, p)).toEqual([
      [0, 5, 4, 5],
      [5, 5, 10, 5],
    ]);
    expect(
      troncons({ x1: 3, y1: 0, x2: 3, y2: 6 }, [
        { x: 3, y: 6, l: 2, axe: "v" },
      ]),
    ).toEqual([[3, 0, 3, 6]]);
  });

  it("laisse les façades à la structure", () => {
    expect(enFacade({ x1: 0, y1: 0, x2: 10, y2: 0 })).toBe(true);
    expect(enFacade({ x1: 21.6, y1: 3, x2: 21.6, y2: 8 }, 21.6)).toBe(true);
    expect(enFacade({ x1: 9, y1: 0, x2: 9, y2: 5.6 })).toBe(false);
  });

  it("choisit le sol selon l'usage", () => {
    const s = (id) =>
      solDe(NIVEAUX.flatMap((n) => n.pieces).find((p) => p.id === id));
    expect(s("madison-square-garden")).toBe("sportif");
    expect(s("strawberry-fields")).toBe("gazon");
    expect(s("soul-kitchen")).toBe("carrelage");
    expect(s("daft-punk")).toBe("moquette");
    expect(s("highway-61")).toBe("beton");
  });

  it("donne des sièges aux tables, tournés vers la table", () => {
    const t = sieges({ type: "table", x: 0, y: 0, w: 1.5, h: 0.8 });
    expect(t).toHaveLength(4);
    expect(Math.abs(t[0].angle)).toBeCloseTo(0);
    expect(sieges({ type: "ronde", x: 2, y: 2, r: 0.5, n: 4 })).toHaveLength(4);
  });

  it("donne des pauses aux salles de pause et des lieux à toutes les pièces", () => {
    const n2 = lireNiveau(niveau("n2"));
    expect(n2.pauses.some((p) => p.piece === "studio-54")).toBe(true);
    expect(n2.salles["madison-square-garden"].sieges.length).toBeGreaterThan(0);
    for (const n of tous)
      for (const p of n.pauses)
        expect(Number.isFinite(p.x + p.z + p.angle)).toBe(true);
  });
});
