import { describe, expect, it } from "vitest";
import { tenue } from "../public/perso-tenue.js";
import { EQUIPE } from "../public/noms.js";

describe("tenue selon le rang", () => {
  it("habille le fondateur en costume noir", () => {
    const t = tenue(EQUIPE.theo, "theo", "#ffffff");
    expect(t).toMatchObject({ rang: "fondateur", style: "costume" });
    expect(t.haut).toBe("#0d0d10");
  });

  it("donne à la direction la cravate de son pôle et une taille au-dessus", () => {
    for (const id of [
      "ceo",
      "argent",
      "operations",
      "produit",
      "tech",
      "marketing",
    ]) {
      const t = tenue(EQUIPE[id], id, "#22c55e");
      expect(t).toMatchObject({
        rang: "chef",
        style: "costume",
        cravate: "#22c55e",
      });
      expect(t.taille).toBeGreaterThan(1);
    }
  });

  it("laisse l'équipe en tenue décontractée", () => {
    const t = tenue(EQUIPE.dev, "dev", "#22c55e");
    expect(t.rang).toBe("equipe");
    expect(["sweat", "tshirt"]).toContain(t.style);
    expect(t.cravate).toBeUndefined();
    expect(t.taille).toBe(1);
  });

  it("reconnaît un rôle venu de /agents quelle que soit la casse", () => {
    expect(tenue({ nom: "Karim", role: "cto" }, "tech", "#000").rang).toBe(
      "chef",
    );
    expect(tenue({ nom: "Alex" }, "x", "#000").rang).toBe("equipe");
  });

  it("garde le même look d'une ouverture à l'autre", () => {
    expect(tenue(EQUIPE.ux, "ux", "#000")).toEqual(
      tenue(EQUIPE.ux, "ux", "#000"),
    );
    expect(tenue(EQUIPE.ux, "ux", "#000")).toMatchObject({
      longs: true,
      lunettes: false,
    });
  });
});
