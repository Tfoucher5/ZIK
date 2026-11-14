import { describe, it, expect } from "vitest";
import { FAQ } from "../faq.js";
import { gameJsonLd, gameFaqJsonLd, siteJsonLd } from "../seo.js";

describe("/jouer ne parle que du jeu en ligne", () => {
  it("la FAQ du jeu n'a aucune question de soirée", () => {
    expect(FAQ.some((f) => /salon|soirée/i.test(f.q + f.a))).toBe(false);
  });

  it("données structurées propres à /jouer, sans le mode soirée", () => {
    const app = JSON.parse(gameJsonLd);
    expect(app.url).toBe("https://www.zik-music.fr/jouer");
    expect(app.featureList.some((f) => /salon/i.test(f))).toBe(false);
    expect(JSON.parse(gameFaqJsonLd).mainEntity).toHaveLength(FAQ.length);
  });

  it("l'aiguillage / garde le site et l'organisation, sans jeu ni FAQ", () => {
    const types = JSON.parse(siteJsonLd).map((x) => x["@type"]);
    expect(types).toEqual(["WebSite", "Organization"]);
  });
});
