import { describe, it, expect } from "vitest";
import { universOf } from "../univers.js";

describe("univers d'une page", () => {
  it("l'accueil exact aiguille", () => {
    expect(universOf("/")).toBe("aiguillage");
  });

  it("vitrine, offres, comparatifs et création sont côté soirée", () => {
    for (const p of ["/soiree", "/pro", "/pro/merci", "/vs/kahoot", "/salon"])
      expect(universOf(p)).toBe("soiree");
  });

  it("le reste, préfixes trompeurs compris, est côté jeu", () => {
    for (const p of [
      "/jouer",
      "/rooms",
      "/zikle",
      "/soirees",
      "/salons",
      "/profile",
      "/vs",
    ])
      expect(universOf(p)).toBe("jeu");
  });
});
