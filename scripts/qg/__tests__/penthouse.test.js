import { describe, expect, it } from "vitest";
import { Grille, dedans } from "../public/chemins.js";
import {
  ARRIVEE,
  CONTOUR,
  PAUSES,
  THEO,
  implanter,
  panneaux,
} from "../public/penthouse-plan.js";

describe("plan du penthouse", () => {
  const grille = new Grille(0, 22, -11, 5);
  implanter(grille);

  it("place Théo et ses pauses dans l'étage", () => {
    for (const p of [ARRIVEE, THEO, ...PAUSES])
      expect(dedans(CONTOUR, p.x, p.z)).toBe(true);
    expect(PAUSES.length).toBeGreaterThanOrEqual(4);
    expect(PAUSES.length).toBeLessThanOrEqual(6);
  });

  it("relie l'ascenseur au bureau et à chaque pause", () => {
    for (const p of [THEO, ...PAUSES])
      expect(grille.trajet(ARRIVEE, p).length).toBeGreaterThan(0);
  });
});

describe("panneaux", () => {
  it("affiche les chiffres reçus", () => {
    const { liste, bandeau } = panneaux({
      limite: { cinqHeures: 42.4, semaine: 130 },
      chantiers: { enCours: 3, aFaire: 5, fait: 12 },
      aTrancher: 2,
      agentsActifs: 7,
      heure: new Date(2026, 10, 16, 9, 5),
    });
    expect(liste.map((p) => p.valeur)).toEqual(["7", "2", "3", undefined]);
    expect(liste[1].alerte).toBe(true);
    expect(liste[2].sous).toBe("en cours · 5 à faire · 12 faits");
    expect(liste[3].jauges).toEqual([
      ["5 heures", 42],
      ["Semaine", 100],
    ]);
    expect(bandeau).toBe("THÉO · FONDATEUR   09:05");
  });

  it("reste calme sans données", () => {
    const { liste, bandeau } = panneaux({ limite: null, chantiers: {} });
    expect(liste[0].valeur).toBe("0");
    expect(liste[1].alerte).toBe(false);
    expect(liste[3]).toMatchObject({ jauges: [], sous: "inconnue" });
    expect(bandeau).toBe("THÉO · FONDATEUR");
  });

  it("ne change de clé que si l'affichage change", () => {
    const d = { agentsActifs: 1, heure: new Date(2026, 10, 16, 9, 5, 1) };
    const a = panneaux(d).cle;
    expect(
      panneaux({ ...d, heure: new Date(2026, 10, 16, 9, 5, 40) }).cle,
    ).toBe(a);
    expect(panneaux({ ...d, agentsActifs: 2 }).cle).not.toBe(a);
  });
});
