import { describe, expect, it } from "vitest";
import { disposer, repartir, repli } from "../public/disposition.js";

// Étendue en x d'un pôle : ses bureaux, puis le bureau du chef et son fauteuil au bout.
const etendue = ({ x, sens, cols }) => {
  const bout = x + sens * (cols * 1.6 + 2);
  return [Math.min(x, bout), Math.max(x, bout)];
};

const ACTUEL = { produit: 7, tech: 5, operations: 3, marketing: 4, argent: 2 };

describe("disposer", () => {
  it("prévoit deux postes par membre, chaque pôle dans sa rangée", () => {
    const { poles } = disposer(ACTUEL);
    expect(poles.produit.cols * 2).toBe(14);
    expect(poles.marketing).toMatchObject({ cols: 4, sens: 1, z: 3 });
    expect(poles.operations).toMatchObject({ cols: 3, sens: 1, z: -1.5 });
    expect(poles.argent).toMatchObject({ cols: 2, sens: -1, z: 3 });
  });

  it("ne superpose aucun pôle d'une même rangée", () => {
    const { poles } = disposer({ ...ACTUEL, tech: 12 });
    const liste = Object.values(poles);
    for (const a of liste)
      for (const b of liste) {
        if (a === b || a.z !== b.z) continue;
        const [a0, a1] = etendue(a);
        const [b0, b1] = etendue(b);
        expect(a1 <= b0 || b1 <= a0).toBe(true);
      }
  });

  it("agrandit l'aile ouest pour que la rangée tienne dans le bâtiment", () => {
    const petit = disposer({ produit: 2, tech: 2 });
    expect(petit.ouest).toBe(-20);
    const grand = disposer(ACTUEL);
    const plusLoin = Math.min(
      ...Object.values(grand.poles).map((p) => etendue(p)[0]),
    );
    expect(grand.ouest).toBeLessThan(-20);
    expect(grand.ouest).toBeLessThanOrEqual(plusLoin - 0.5);
  });

  it("envoie un pôle trop grand pour sa rangée au bout de la rangée qui s'agrandit", () => {
    const avant = disposer(ACTUEL);
    const apres = disposer({ ...ACTUEL, marketing: 9 });
    expect(apres.poles.marketing).toMatchObject({ z: -1.5, sens: -1 });
    expect(apres.ouest).toBeLessThan(avant.ouest);
  });

  it("garde au moins une colonne à un pôle vide", () => {
    expect(disposer({}).poles.argent.cols).toBe(1);
  });
});

describe("repartir", () => {
  it("range les agents par pôle, le board à part, les chefs exclus", () => {
    const m = repartir([
      { id: "da", equipe: "Produit", nom: "Nina" },
      { id: "motion", equipe: "Produit & design" },
      { id: "dev", equipe: "Technique" },
      { id: "chef-projet", equipe: "Opérations" },
      { id: "chef-tech", equipe: "board" },
      { id: "avocat", equipe: "board" },
      { id: "nouveau", equipe: "renforts" },
      { id: "bizarre", equipe: 42 },
      null,
      { equipe: "Technique" },
    ]);
    expect(m.equipes.produit).toEqual(["da", "motion"]);
    expect(m.equipes.tech).toEqual(["dev"]);
    expect(m.equipes.operations).toEqual(["chef-projet"]);
    expect(m.board).toEqual(["avocat"]);
    expect(m.autres).toEqual(["nouveau", "bizarre"]);
    expect(m.fiches.get("da").nom).toBe("Nina");
    expect(m.fiches.has("chef-tech")).toBe(false);
  });
});

describe("repli", () => {
  it("traduit l'organigramme au format de /agents", () => {
    const org = {
      chefs: [
        { id: "ceo", equipe: [] },
        { id: "tech", equipe: ["dev", "reviewer"] },
      ],
      board: ["chef-*", "avocat"],
    };
    expect(repartir(repli(org))).toMatchObject({
      equipes: { tech: ["dev", "reviewer"] },
      board: ["avocat"],
    });
  });
});
