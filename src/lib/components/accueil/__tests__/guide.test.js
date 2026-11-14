import { describe, it, expect } from "vitest";
import { FAQ, UNIVERS, faqJsonLd } from "../guide.js";
import { FAQ as JEU } from "../../home/faq.js";
import { FAQ as SOIREE } from "../../soiree/soireeContent.js";
import { FREE_MAX_PLAYERS } from "../../../data/proPlans.js";

describe("contenu de l'aiguillage pour les moteurs", () => {
  it("FAQ propre à /, sans question reprise de /jouer ou /soiree", () => {
    const ailleurs = new Set([...JEU, ...SOIREE].map((f) => f.q));
    expect(FAQ.some((f) => ailleurs.has(f.q))).toBe(false);
    expect(JSON.parse(faqJsonLd).mainEntity).toHaveLength(FAQ.length);
  });

  it("chiffres lus dans l'offre, liens vers les deux univers", () => {
    expect(UNIVERS[1].texte).toContain(`${FREE_MAX_PLAYERS} joueurs`);
    const hrefs = UNIVERS.flatMap((u) => u.liens.map(([h]) => h));
    expect(hrefs).toEqual(expect.arrayContaining(["/rooms", "/soiree"]));
  });
});
