import { describe, expect, it } from "vitest";
import { LIEUX, creneau, lieu, ou, salleDe } from "../public/tour3d/agenda.js";
import { fenetresAllumees, soleil } from "../public/tour3d/lumiere.js";
import { niveau } from "../public/tour/plan.js";

const AGENTS = ["dev", "seo", "ux", "analyste", "recette", "avocat", "ceo"];

describe("creneau", () => {
  it("tout le monde est chez soi à 5 h, sauf Théo", () => {
    for (const id of AGENTS) expect(creneau(5, id)).toBe("maison");
    expect(creneau(5, "theo")).not.toBe("maison");
  });

  it("déjeune une heure entre 12 h et 14 h", () => {
    for (const id of AGENTS) {
      const midi = [12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75].filter(
        (h) => creneau(h, id) === "dejeuner",
      );
      expect(midi.length).toBe(4);
    }
  });

  it("arrive avant 9 h 15 et part entre 18 h et 23 h", () => {
    for (const id of AGENTS) {
      expect(creneau(9.25, id)).not.toBe("maison");
      expect(creneau(23.5, id)).toBe("maison");
      expect(creneau(16, id)).not.toBe("maison");
    }
  });

  it("Nora tient l'accueil de 8 h à 20 h", () => {
    expect(creneau(7.9, "accueil")).toBe("maison");
    expect(creneau(10, "accueil")).toBe("poste");
    expect(creneau(20, "accueil")).toBe("maison");
  });
});

describe("lieu", () => {
  it("mène chaque créneau dans une pièce du plan prévue pour lui", () => {
    const l = lieu("dejeuner", "dev", 12);
    expect(LIEUX.dejeuner).toContain(l.piece);
    expect(l.niveau).toBe("n1");
    expect(lieu("poste", "dev", 10)).toBeNull();
    expect(lieu("maison", "dev", 22)).toBeNull();
  });

  it("garde Théo au penthouse", () => {
    for (const c of ["cafe", "dejeuner", "pause", "balade", "soiree"])
      expect(lieu(c, "theo", 15).niveau).toBe("n7");
  });

  it("toutes les pièces de l'agenda existent et sont ouvertes aux employés", () => {
    for (const liste of Object.values(LIEUX))
      for (const piece of liste) expect(ou(piece)).toBeTruthy();
    for (let h = 0; h < 24; h += 0.25)
      for (const c of Object.keys(LIEUX)) {
        const l = lieu(c, "dev", h);
        const p = [
          ...niveau(l.niveau).pieces,
          ...niveau(l.niveau).terrasses,
        ].find((x) => x.id === l.piece);
        expect(["employes", "public"]).toContain(p.acces);
      }
  });
});

describe("salleDe", () => {
  it("réunit chaque pôle dans sa salle, le board à Woodstock", () => {
    expect(salleDe("tech").piece).toBe("tomorrowland");
    expect(salleDe("operations").piece).toBe("vieilles-charrues");
    expect(salleDe("board")).toEqual({ niveau: "n6", piece: "woodstock" });
  });
});

describe("lumière", () => {
  it("fait le jour à midi, la nuit à minuit", () => {
    expect(soleil(13).nuit).toBe(0);
    expect(soleil(0).nuit).toBe(1);
    expect(soleil(13).position.y).toBeGreaterThan(soleil(8).position.y);
  });

  it("dore le coucher et bleuit la nuit", () => {
    expect(soleil(19.5).couleur).toBe("#ffb04d");
    expect(soleil(23).couleur).toBe("#6f86ff");
  });

  it("éteint les bureaux la nuit, sauf présence", () => {
    expect(fenetresAllumees(14, 0)).toBe(true);
    expect(fenetresAllumees(23, 0)).toBe(false);
    expect(fenetresAllumees(23, 2)).toBe(true);
  });
});
