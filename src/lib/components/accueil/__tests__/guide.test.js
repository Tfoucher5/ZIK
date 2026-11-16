import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import { FAQ, UNIVERS, faqJsonLd } from "../guide.js";
import FaqSection from "../FaqSection.svelte";
import { FAQ as JEU } from "../../home/faq.js";
import { FAQ as SOIREE } from "../../soiree/soireeContent.js";
import { FREE_MAX_PLAYERS } from "../../../data/proPlans.js";
import { findTheme } from "../../../data/blindTestThemes.js";

const decode = (s) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

describe("contenu de l'accueil pour les moteurs", () => {
  it("FAQ propre à /, sans question reprise de /jouer ou /soiree", () => {
    const ailleurs = new Set([...JEU, ...SOIREE].map((f) => f.q));
    expect(FAQ.some((f) => ailleurs.has(f.q))).toBe(false);
  });

  it("les données structurées disent exactement la FAQ affichée", () => {
    const { body } = render(FaqSection);
    const affiche = [
      ...body.matchAll(/<summary[^>]*>(.*?)<\/summary>\s*<p[^>]*>(.*?)<\/p>/gs),
    ].map(([, q, a]) => ({ q: decode(q), a: decode(a) }));
    const ld = JSON.parse(faqJsonLd).mainEntity.map((m) => ({
      q: m.name,
      a: m.acceptedAnswer.text,
    }));
    expect(affiche).toHaveLength(FAQ.length);
    expect(ld).toEqual(affiche);
  });

  it("chiffres lus dans l'offre, liens vers les deux univers", () => {
    expect(UNIVERS[1].texte).toContain(`${FREE_MAX_PLAYERS} joueurs`);
    const hrefs = UNIVERS.flatMap((u) => u.liens.map(([h]) => h));
    expect(hrefs).toEqual(expect.arrayContaining(["/rooms", "/soiree"]));
  });

  it("chaque thème du bandeau est une vraie page /blind-test", () => {
    for (const u of UNIVERS)
      for (const [href] of u.themes[1].filter(([h]) => h))
        expect(findTheme(href.split("/").pop()), href).toBeTruthy();
  });
});
