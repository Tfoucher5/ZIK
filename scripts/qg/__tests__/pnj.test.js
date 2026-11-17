import { describe, expect, it } from "vitest";
import {
  ROLES,
  bureauxLibres,
  droitsPnj,
  lieuPnj,
  presents,
} from "../public/tour3d/pnj.js";
import { accesDe, itineraire } from "../public/tour3d/acces.js";
import { niveau } from "../public/tour/plan.js";

const MARDI = 2;
const SAMEDI = 6;
const nb = (h, j) => presents(h, j).length;

describe("population", () => {
  it("60 à 80 en journée de semaine, une quinzaine le soir, une poignée la nuit", () => {
    expect(nb(11, MARDI)).toBeGreaterThanOrEqual(55);
    expect(nb(11, MARDI)).toBeLessThanOrEqual(80);
    expect(nb(20.5, MARDI)).toBeGreaterThanOrEqual(10);
    expect(nb(20.5, MARDI)).toBeLessThanOrEqual(20);
    expect(nb(3, MARDI)).toBeGreaterThanOrEqual(3);
    expect(nb(3, MARDI)).toBeLessThanOrEqual(7);
  });

  it("moins de monde le week-end", () => {
    expect(nb(11, SAMEDI)).toBeLessThan(nb(11, MARDI) / 2);
  });

  it("la nuit : veilleur au hall, ménage, noctambules, personne au restaurant", () => {
    const roles = new Set(presents(3, MARDI).map((p) => p.role));
    expect(roles.has("veilleur")).toBe(true);
    expect(roles.has("menage")).toBe(true);
    expect(roles.has("cuisinier")).toBe(false);
  });

  it("les cuisiniers et serveurs sont là au service de midi", () => {
    const roles = presents(12.5, MARDI).map((p) => p.role);
    expect(roles.filter((r) => r === "cuisinier").length).toBe(4);
    expect(roles).toContain("serveur");
  });
});

describe("affectation", () => {
  it("chaque rôle va dans une pièce du plan qu'il a le droit d'occuper", () => {
    for (let h = 0; h < 24; h += 0.5)
      for (const { role, k } of presents(h, MARDI)) {
        const l = lieuPnj(role, k, h);
        expect(accesDe(niveau(l.niveau), l.piece)).toBe(l.acces);
        expect(droitsPnj(role, k).has(l.acces)).toBe(true);
      }
  });

  it("un bureau par employé, jamais celui d'un agent", () => {
    const libres = bureauxLibres();
    const pris = presents(11, MARDI)
      .filter((p) => !ROLES[p.role].pieces)
      .map((p) => lieuPnj(p.role, p.k, 15).bureau);
    expect(new Set(pris).size).toBe(pris.length);
    for (const b of pris) expect(libres.map((l) => l.bureau)).toContain(b);
  });

  it("place les métiers à leur poste : cuisine, café public, salle de sport, hall", () => {
    expect(lieuPnj("cuisinier", 0, 12).piece).toBe("soul-kitchen");
    expect(lieuPnj("barista", 0, 9).piece).toBe("cavern-club");
    expect(lieuPnj("coach", 0, 9).piece).toBe("madison-square-garden");
    expect(lieuPnj("veilleur", 0, 3).piece).toBe("carnegie-hall");
    expect(lieuPnj("assistante", 0, 10).niveau).toBe("n6");
  });
});

describe("droits des PNJ", () => {
  it("personne n'est fondateur ; seule l'assistante entre à la direction", () => {
    for (const [role, r] of Object.entries(ROLES))
      for (let k = 0; k < r.n; k++) {
        const d = droitsPnj(role, k);
        expect(d.has("fondateur")).toBe(false);
        expect(d.has("direction")).toBe(role === "assistante");
      }
  });

  it("prend A1 ou A2, jamais l'ascenseur privé", () => {
    for (const [role, r] of Object.entries(ROLES)) {
      if (role === "assistante") continue;
      for (let k = 0; k < r.n; k++)
        for (const t of itineraire(droitsPnj(role, k), "n0", "n4") ?? [])
          expect(["A1", "A2"]).toContain(t.asc);
    }
  });
});
