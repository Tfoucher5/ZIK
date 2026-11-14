import { describe, it, expect } from "vitest";
import { FAQ, GAME_FAQ } from "../faq.js";
import { gameJsonLd, gameFaqJsonLd } from "../seo.js";

describe("/jouer ne parle que du jeu en ligne", () => {
  it("la FAQ du jeu retire les questions de soirée, pas les autres", () => {
    expect(GAME_FAQ.length).toBe(
      FAQ.length - FAQ.filter((f) => f.soiree).length,
    );
    expect(GAME_FAQ.some((f) => /salon/i.test(f.q + f.a))).toBe(false);
  });

  it("données structurées propres à /jouer, sans le mode soirée", () => {
    const app = JSON.parse(gameJsonLd);
    expect(app.url).toBe("https://www.zik-music.fr/jouer");
    expect(app.featureList.some((f) => /salon/i.test(f))).toBe(false);
    expect(JSON.parse(gameFaqJsonLd).mainEntity).toHaveLength(GAME_FAQ.length);
  });
});
