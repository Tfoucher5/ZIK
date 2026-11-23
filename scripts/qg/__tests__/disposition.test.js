import { describe, expect, it } from "vitest";
import { repartir, repli } from "../public/disposition.js";

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
