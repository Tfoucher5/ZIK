import { describe, expect, it } from "vitest";
import { Grille, dedans } from "../public/chemins.js";

const croise = (grille, chemin, depart) => {
  let p = depart;
  for (const q of chemin) {
    for (let k = 1; k <= 20; k++) {
      const [i, j] = grille.case(
        p.x + ((q.x - p.x) * k) / 20,
        p.z + ((q.z - p.z) * k) / 20,
      );
      if (!grille.libre(i, j)) return true;
    }
    p = q;
  }
  return false;
};

describe("Grille.trajet", () => {
  it("va tout droit sans obstacle", () => {
    const g = new Grille(-10, 10, -10, 10);
    const c = g.trajet({ x: -5, z: 0 }, { x: 5, z: 0 });
    expect(c.at(-1)).toEqual({ x: 5, z: 0 });
    expect(c.length).toBeLessThanOrEqual(2);
  });

  it("contourne un mur en passant par la porte", () => {
    const g = new Grille(-10, 10, -10, 10);
    g.bloquer(0, -4, 0.1, 12, 0.2);
    g.bloquer(0, 7, 0.1, 6, 0.2);
    const depart = { x: -5, z: 0 };
    const c = g.trajet(depart, { x: 5, z: 0 });
    expect(c.at(-1)).toEqual({ x: 5, z: 0 });
    expect(c.some((p) => p.z > 2 && p.z < 4)).toBe(true);
    expect(croise(g, c.slice(0, -1), depart)).toBe(false);
  });

  it("rejoint un siège collé à un meuble", () => {
    const g = new Grille(-10, 10, -10, 10);
    g.bloquer(0, 0, 2, 1);
    const c = g.trajet({ x: -8, z: -8 }, { x: 0, z: 0.6 });
    expect(c.at(-1)).toEqual({ x: 0, z: 0.6 });
  });

  it("rend le point d'arrivée seul si aucun chemin n'existe", () => {
    const g = new Grille(-10, 10, -10, 10);
    g.bloquer(0, 0, 0.5, 20, 0.2);
    expect(g.trajet({ x: -5, z: 0 }, { x: 5, z: 0 })).toEqual([{ x: 5, z: 0 }]);
  });
});

describe("Grille, murs en biais et contour", () => {
  it("ne sort pas du contour du bâtiment", () => {
    const g = new Grille(-10, 10, -10, 10);
    g.masque([
      [-8, -8],
      [8, -8],
      [0, 8],
    ]);
    expect(g.libre(...g.case(0, 0))).toBe(true);
    expect(g.libre(...g.case(-7, 6))).toBe(false);
  });

  it("contourne un mur en biais", () => {
    const g = new Grille(-10, 10, -10, 10);
    g.segment(-6, -6, 6, 6);
    expect(g.libre(...g.case(0, 0))).toBe(false);
    const depart = { x: -4, z: 4 };
    const c = g.trajet(depart, { x: 4, z: -4 });
    expect(c.at(-1)).toEqual({ x: 4, z: -4 });
    expect(croise(g, c.slice(0, -1), depart)).toBe(false);
  });
});

describe("dedans", () => {
  it("dit si un point est dans un polygone", () => {
    const carre = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ];
    expect(dedans(carre, 2, 2)).toBe(true);
    expect(dedans(carre, 5, 2)).toBe(false);
  });
});
