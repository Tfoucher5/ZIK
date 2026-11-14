import { describe, it, expect } from "vitest";
import { FAQ, soireeJsonLd, PRIX_SOIREE } from "../soireeContent.js";
import { FREE_MAX_PLAYERS, PLANS } from "../../../data/proPlans.js";

describe("vitrine /soiree", () => {
  it("la FAQ envoyée à Google est celle affichée", () => {
    const faq = JSON.parse(soireeJsonLd)["@graph"].find(
      (g) => g["@type"] === "FAQPage",
    );
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      FAQ.map((f) => [f.q, f.a]),
    );
  });

  it("limite gratuite et prix viennent des offres, jamais en dur", () => {
    const prix = FAQ.find((f) => f.q === "C'est payant ?").a;
    expect(prix).toContain(`${FREE_MAX_PLAYERS} joueurs`);
    expect(PRIX_SOIREE).toBe(PLANS.find((p) => p.id === "night").price);
  });
});
