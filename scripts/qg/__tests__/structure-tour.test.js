import { describe, expect, it } from "vitest";
import { NIVEAUX, NOYAU, TRAME, niveau } from "../public/tour/plan.js";
import {
  acroteres,
  dalle,
  dessertes,
  etatCoupe,
  facades,
  gamme,
  gardeCorps,
  mursNoyau,
  percer,
  pieux,
  plafondCoupe,
  poteaux,
} from "../public/tour3d/structure-plan.js";

const ids = (etat, cle) =>
  Object.entries(etat)
    .filter(([, v]) => v[cle])
    .map(([id]) => id);

describe("trame des poteaux", () => {
  it("couvre toute la trame quand l'emprise part de l'axe 1", () => {
    expect(poteaux(niveau("n0"))).toHaveLength(TRAME.x.length * TRAME.y.length);
  });

  it("suit le retrait de chaque niveau", () => {
    expect(poteaux(niveau("n5")).every(([x]) => x >= 7.2)).toBe(true);
    expect(poteaux(niveau("n6")).map(([x]) => x)).not.toContain(14.4);
    expect(new Set(poteaux(niveau("n7")).map(([x]) => x))).toEqual(
      new Set([28.8, 36, 43.2]),
    );
  });

  it("monte sans trou : un poteau présent à un niveau l'est à tous ceux du dessous", () => {
    const portes = NIVEAUX.filter((n) => n.facade !== false);
    for (let i = 1; i < portes.length; i++)
      for (const p of poteaux(portes[i]))
        expect(poteaux(portes[i - 1])).toContainEqual(p);
  });

  it("pose un pieu sous chaque poteau", () => {
    for (const n of NIVEAUX)
      for (const p of poteaux(n)) expect(pieux()).toContainEqual(p);
  });
});

describe("dalles et façades", () => {
  it("couvre le toit du niveau inférieur et perce les vides", () => {
    const i = NIVEAUX.findIndex((n) => n.id === "n6");
    expect(dalle(i).rect[0]).toBe(7.2);
    expect(dalle(i).verrieres).toHaveLength(1);
    const n4 = dalle(NIVEAUX.findIndex((n) => n.id === "n4"));
    expect(n4.trous).toContainEqual([7.2, 7.2, 21.6, 18]);
  });

  it("perce les gaines seulement entre les niveaux desservis", () => {
    const a1 = [28.8, 10.4, 31.2, 12.5];
    expect(dalle(0).trous).not.toContainEqual(a1);
    expect(dalle(NIVEAUX.findIndex((n) => n.id === "n6")).trous).toContainEqual(
      a1,
    );
    expect(
      dalle(NIVEAUX.findIndex((n) => n.id === "n7")).trous,
    ).not.toContainEqual(a1);
  });

  it("donne quatre façades sur le contour, porteuses au sous-sol", () => {
    expect(facades(niveau("n7")).map((f) => f.cote)).toEqual([
      "nord",
      "est",
      "sud",
      "ouest",
    ]);
    expect(facades(niveau("n7"))[3].x1).toBe(28.8);
    expect(facades(niveau("ss"))[0].type).toBe("porteur");
  });

  it("borde d'acrotères les toits en retrait et le toit final", () => {
    expect(acroteres(NIVEAUX.findIndex((n) => n.id === "n3"))).toEqual([]);
    expect(acroteres(NIVEAUX.findIndex((n) => n.id === "n4"))).toHaveLength(3);
    expect(acroteres(NIVEAUX.length - 1)).toHaveLength(4);
  });

  it("met un garde-corps sur les bords libres de Hyde Park, pas contre la façade ni l'édicule", () => {
    const n5 = niveau("n5");
    const gc = gardeCorps(n5.terrasses[0], n5);
    expect(gc).toContainEqual([0, 25.2, 0, 6.6]);
    expect(gc.some(([x1, , x2]) => x1 === 7.2 && x2 === 7.2)).toBe(false);
    expect(gc.some(([x1, , x2]) => x1 === 3.3 && x2 === 3.3)).toBe(false);
  });

  it("monte en gamme avec les matières", () => {
    expect(gamme(niveau("n2"))).toBe(1);
    expect(gamme(niveau("n6"))).toBe(2);
    expect(gamme(niveau("n7"))).toBe(3);
    expect(gamme(niveau("ss"))).toBe(1);
  });
});

describe("noyau", () => {
  it("perce un mur aux ouvertures posées sur sa ligne", () => {
    expect(
      percer([28.8, 7.2, 28.8, 18], [{ x: 28.8, y: 10.9, l: 1.1, axe: "v" }]),
    ).toEqual([
      [28.8, 7.2, 28.8, 10.9],
      [28.8, 12, 28.8, 18],
    ]);
    expect(percer([0, 0, 5, 0], [{ x: 1, y: 2, l: 1, axe: "h" }])).toEqual([
      [0, 0, 5, 0],
    ]);
  });

  it("ouvre les portes palières aux seuls niveaux desservis", () => {
    const ferme = (id, a) => {
      const murs = mursNoyau(id);
      const { x, y, l, axe } = a.porte;
      const milieu = axe === "v" ? [x, y + l / 2] : [x + l / 2, y];
      return murs.some(
        ([x1, y1, x2, y2]) =>
          Math.abs(x1 - x2) < 0.01 === (axe === "v") &&
          milieu[0] >= Math.min(x1, x2) - 0.01 &&
          milieu[0] <= Math.max(x1, x2) + 0.01 &&
          milieu[1] >= Math.min(y1, y2) - 0.01 &&
          milieu[1] <= Math.max(y1, y2) + 0.01,
      );
    };
    for (const a of NOYAU.ascenseurs)
      for (const id of NOYAU.niveaux)
        expect(ferme(id, a), `${a.id} ${id}`).toBe(!a.dessert.includes(id));
  });

  it("dessert les niveaux du plan pour chaque cabine", () => {
    const d = dessertes();
    expect(Object.keys(d).sort()).toEqual(["A1", "A2", "AP", "MC"]);
    expect(d.A1[0]).toBe("ss");
    expect(d.A1.at(-1)).toBe("n6");
    expect(d.MC).toEqual(d.A1);
    expect(d.AP).toEqual(["n0", "n6", "n7", "toit"]);
  });
});

describe("coupe", () => {
  it("garde la tour fermée en vue ville", () => {
    const e = etatCoupe("ville");
    expect(ids(e, "visible")).toEqual(NIVEAUX.map((n) => n.id));
    expect(ids(e, "ouvert")).toEqual([]);
    expect(plafondCoupe("ville")).toBe(Infinity);
  });

  it("masque les niveaux au-dessus et n'ouvre que le niveau choisi", () => {
    const e = etatCoupe("n3");
    expect(ids(e, "visible")).toEqual(["ss", "n0", "n1", "n2", "n3"]);
    expect(ids(e, "ouvert")).toEqual(["n3"]);
    expect(plafondCoupe("n3")).toBeCloseTo(14.6, 1);
  });

  it("refuse un niveau inconnu", () => {
    expect(() => etatCoupe("n9")).toThrow();
  });
});
