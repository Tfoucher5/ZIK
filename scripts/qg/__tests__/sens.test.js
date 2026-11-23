import { describe, expect, it } from "vitest";
import { NIVEAUX, lieux } from "../public/tour/plan.js";
import { versLocal } from "../public/tour3d/repere.js";
import {
  bureaux,
  lireNiveau,
  sieges,
} from "../public/tour3d/interieur-plan.js";
import { cible, milieu, rotation } from "../public/tour3d/sens.js";

const SPORT = new Set([
  "tapis",
  "tapis-de-course",
  "rameur",
  "banc-de-musculation",
  "nacelle",
  "table-de-massage",
]);
const pieces = NIVEAUX.flatMap((n) => lieux(n));
const regarde = (s, [x, y]) => {
  const c = versLocal(x, y);
  return Math.sin(s.angle) * (c.x - s.x) + Math.cos(s.angle) * (c.z - s.z);
};
// Ce que sert un meuble : sa cible (canapé, rang, chaise) ou le meuble lui-même.
const servi = (m, p) => {
  const c = cible(m, p);
  return c?.signe === -1 ? c.point : milieu(m);
};

describe("sens du mobilier", () => {
  it("tourne chaque siège du plan vers le meuble qu'il sert", () => {
    const faux = [];
    for (const p of pieces)
      for (const m of p.mobilier) {
        if (SPORT.has(m.type)) continue;
        for (const s of sieges(m, p))
          if (regarde(s, servi(m, p)) <= 0) faux.push(`${p.id}:${m.type}`);
      }
    expect(faux).toEqual([]);
  });

  it("fait regarder le centre à toutes les chaises d'une table ronde", () => {
    const rondes = pieces.flatMap((p) =>
      p.mobilier.filter((m) => m.type === "ronde"),
    );
    expect(rondes.length).toBeGreaterThan(0);
    for (const m of rondes)
      for (const s of sieges(m, { mobilier: [], poly: [[0, 0]] })) {
        const c = versLocal(m.x, m.y);
        const d = Math.hypot(c.x - s.x, c.z - s.z);
        expect(regarde(s, [m.x, m.y]) / d).toBeCloseTo(1, 5);
      }
  });

  it("tourne les rangs de sièges vers l'écran ou la scène de la pièce", () => {
    const vus = [];
    for (const p of pieces)
      for (const m of p.mobilier.filter((m) => m.type === "rang-de-sieges")) {
        const vise = p.mobilier.find((o) =>
          ["ecran", "scene"].includes(o.type),
        );
        if (!vise) continue;
        vus.push(m);
        for (const s of sieges(m, p))
          expect(regarde(s, milieu(vise))).toBeGreaterThan(0);
      }
    expect(vus.length).toBeGreaterThan(0);
  });

  it("met l'agent face à son bureau", () => {
    for (const n of NIVEAUX)
      for (const b of Object.values(lireNiveau(n).postes)) {
        const d = [b.x - b.place.x, b.z - b.place.z];
        expect(
          Math.sin(b.angle) * d[0] + Math.cos(b.angle) * d[1],
        ).toBeGreaterThan(0);
      }
  });

  it("tourne un canapé vers sa table basse, d'un côté comme de l'autre", () => {
    const piece = (y) => ({
      poly: [[0, 0]],
      mobilier: [{ type: "table-basse", x: 2, y, r: 0.4 }],
    });
    const canape = { type: "canape", x: 1, y: 2, w: 2, h: 0.9 };
    expect(rotation(canape, piece(0))).toBe(0);
    expect(rotation(canape, piece(5))).toBe(Math.PI);
    const [s] = sieges(canape, piece(5));
    expect(regarde(s, [2, 5])).toBeGreaterThan(0);
  });

  it("met le barman en face des tabourets, côté opposé à la salle", () => {
    const p = {
      poly: [
        [0, 0],
        [6, 0],
        [6, 2],
        [0, 2],
      ],
      mobilier: [],
    };
    const m = {
      type: "comptoir",
      x: 1,
      y: 3,
      w: 3,
      h: 0.6,
      n: 3,
      occupant: "a",
    };
    p.mobilier.push(m);
    const [barman] = bureaux(m, p);
    const [client] = sieges(m, p);
    expect(barman.place.z).toBeGreaterThan(versLocal(0, 3.3).z);
    expect(client.z).toBeLessThan(versLocal(0, 3.3).z);
  });
});
