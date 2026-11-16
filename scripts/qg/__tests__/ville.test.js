import { describe, expect, it } from "vitest";
import {
  avancer,
  distanceBoite,
  emprise,
  enseigne,
  lampadaires,
  placerTours,
  position,
  routes,
  voitures,
} from "../public/ville-plan.js";

// Copie de contour() de batiment.js (qui charge three), aile ouest allongée.
const contour = () => [
  [-20, -8],
  [8, -10],
  [15, -10],
  [21, -4],
  [21, 6],
  [16, 10],
  [-8, 10],
  [-8, 6],
  [-32, 6],
  [-32, -4.5],
  [-20, -4.5],
];
const plateau = emprise(contour());
const voies = routes(plateau, 250);
const opts = { centre: plateau.centre, voies, rayon: 250, plafond: 48.6 };
const tours = placerTours(240, opts);

const surRoute = (v, x, z, marge) =>
  v.axe === "x" ? Math.abs(z - v.o) < marge : Math.abs(x - v.o) < marge;

describe("ville", () => {
  it("place assez de tours, toutes hors du dégagement et dans le rayon", () => {
    expect(tours.length).toBeGreaterThanOrEqual(150);
    for (const t of tours) {
      expect(distanceBoite(t, plateau.centre)).toBeGreaterThanOrEqual(45);
      expect(
        Math.hypot(t.x - plateau.centre[0], t.z - plateau.centre[1]),
      ).toBeLessThanOrEqual(250);
    }
  });

  it("aucune tour ne mord sur une route ni sur une autre tour", () => {
    for (const t of tours)
      for (const v of voies)
        expect(
          v.axe === "x"
            ? Math.abs(t.z - v.o) - t.p / 2
            : Math.abs(t.x - v.o) - t.l / 2,
        ).toBeGreaterThanOrEqual(6);
    for (const [i, a] of tours.entries())
      for (const b of tours.slice(i + 1))
        expect(
          Math.abs(a.x - b.x) >= (a.l + b.l) / 2 ||
            Math.abs(a.z - b.z) >= (a.p + b.p) / 2,
        ).toBe(true);
  });

  it("les tours proches ne dépassent pas le sommet de la tour ZIK", () => {
    const [cx, cz] = plateau.centre;
    for (const t of tours)
      if (Math.hypot(t.x - cx, t.z - cz) < 120)
        expect(t.h).toBeLessThanOrEqual(48.6);
  });

  it("est reproductible pour une même graine", () => {
    expect(placerTours(240, opts)).toEqual(tours);
  });

  it("aucune route ne traverse le pied de la tour", () => {
    for (const [x, z] of contour())
      for (const v of voies) expect(surRoute(v, x, z, 5)).toBe(false);
  });

  it("l'enseigne est collée à la face tournée vers la tour", () => {
    const t = { x: 100, z: 0, l: 10, p: 8, h: 40 };
    const e = enseigne(t, [0, 0]);
    expect(e.x).toBeCloseTo(94.9);
    expect(e.z).toBe(0);
    expect(e.angle).toBeCloseTo(-Math.PI / 2);
  });

  it("les lampadaires évitent les carrefours", () => {
    for (const [x, z] of lampadaires(voies)) {
      const croisees = voies.filter((v) => surRoute(v, x, z, 4.6));
      expect(croisees.length).toBe(0);
    }
  });

  it("une voiture reste sur sa route et revient de l'autre côté", () => {
    const [v] = voitures(voies, 1);
    const route = voies[v.route];
    for (let k = 0; k < 500; k++) {
      avancer(v, 0.1, route.demi);
      expect(Math.abs(v.s)).toBeLessThanOrEqual(route.demi);
    }
    const p = position(v, route);
    expect(surRoute(route, p.x, p.z, 4.5)).toBe(true);
  });
});
