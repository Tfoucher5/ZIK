import { describe, expect, it } from "vitest";
import {
  VISITEUR,
  droits,
  grille,
  itineraire,
  paliers,
  passe,
} from "../public/tour3d/acces.js";
import { versLocal } from "../public/tour3d/repere.js";
import { niveau } from "../public/tour/plan.js";

const n0 = niveau("n0");
const atteint = (g, de, vers) => g.trajet(de, vers).length > 0;
const local = (x, y) => versLocal(x, y);

describe("droits", () => {
  it("donne à chacun employes, son pôle, la direction aux chefs, tout à Théo", () => {
    expect([...droits("dev", "tech")].sort()).toEqual([
      "employes",
      "pole:tech",
      "public",
    ]);
    expect(droits("tech").has("direction")).toBe(true);
    expect(droits("tech").has("pole:tech")).toBe(true);
    for (const id of ["ceo", "avocat", "client-pro"])
      expect(droits(id).has("direction")).toBe(true);
    expect(droits("dev", "tech").has("fondateur")).toBe(false);
    expect(droits("theo").has("fondateur")).toBe(true);
    expect(droits("theo").has("service")).toBe(true);
  });
});

describe("portes", () => {
  it("un visiteur ne passe jamais les portiques ni le tambour", () => {
    const fermees = n0.portes.filter((p) => !passe(n0, p, VISITEUR));
    expect(fermees.filter((p) => p.type === "portiques")).toHaveLength(2);
    expect(fermees.some((p) => p.type === "tambour")).toBe(true);
    for (const p of n0.portes.filter((p) => passe(n0, p, VISITEUR)))
      expect(p.entre.every((e) => ["rue", "cavern-club"].includes(e))).toBe(
        true,
      );
  });

  it("un employé passe les portiques", () => {
    const d = droits("dev", "tech");
    for (const p of n0.portes.filter((p) => p.type === "portiques"))
      expect(passe(n0, p, d)).toBe(true);
  });
});

describe("grille", () => {
  const rue = local(5, 27);
  const cafe = local(6, 21.6);
  const hall = local(9, 13);

  it("un visiteur va de la rue au café, jamais dans le hall", () => {
    const g = grille(n0, VISITEUR);
    expect(atteint(g, rue, cafe)).toBe(true);
    expect(atteint(g, cafe, hall)).toBe(false);
  });

  it("un employé entre dans le hall par les portiques du café", () => {
    expect(atteint(grille(n0, droits("dev", "tech")), cafe, hall)).toBe(true);
  });

  it("un employé n'entre pas au penthouse, Théo si", () => {
    const n7 = niveau("n7");
    const pal = paliers("n7").AP;
    const bureau = local(40, 6);
    expect(atteint(grille(n7, droits("dev", "tech")), pal, bureau)).toBe(false);
    expect(atteint(grille(n7, droits("theo")), pal, bureau)).toBe(true);
  });

  it("un employé hors pôle n'entre pas sur le plateau Technique", () => {
    const n3 = niveau("n3");
    const pal = paliers("n3").A1;
    const plateau = niveau("n3").pieces.find((p) => p.id === "daft-punk");
    const [x, y] = plateau.poly[0];
    const dedans = local(x + 1.5, y + 1.5);
    expect(atteint(grille(n3, droits("dev", "tech")), pal, dedans)).toBe(true);
    expect(atteint(grille(n3, droits("seo", "marketing")), pal, dedans)).toBe(
      false,
    );
  });
});

describe("itineraire", () => {
  it("prend A1 ou A2 pour un employé, en évitant la cabine occupée", () => {
    const d = droits("dev", "tech");
    expect(itineraire(d, "n0", "n3")).toEqual([
      { asc: "A1", de: "n0", vers: "n3" },
    ]);
    expect(itineraire(d, "n0", "n3", new Set(["A1"]))[0].asc).toBe("A2");
    expect(itineraire(d, "n3", "n3")).toEqual([]);
  });

  it("ne donne jamais l'ascenseur privé à un employé, ni le N7", () => {
    const d = droits("dev", "tech");
    expect(itineraire(d, "n0", "n7")).toBeNull();
    expect(itineraire(d, "n0", "n6")[0].asc).not.toBe("AP");
  });

  it("monte la direction par l'ascenseur privé, avec correspondance au besoin", () => {
    expect(itineraire(droits("ceo"), "n0", "n6")[0].asc).toBe("AP");
    expect(itineraire(droits("theo"), "n3", "n7")).toEqual([
      { asc: "A1", de: "n3", vers: "n6" },
      { asc: "AP", de: "n6", vers: "n7" },
    ]);
  });
});
