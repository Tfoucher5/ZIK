import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import ProFaq from "../ProFaq.svelte";
import ProOffers from "../ProOffers.svelte";
import { FAQ, FAQ_JSON_LD, COMPARE } from "../proContent.js";
import { PLANS, PRO_PERKS } from "../../../data/proPlans.js";

const decode = (s) =>
  s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

describe("contenu de /pro", () => {
  it("le JSON-LD de la FAQ reprend mot pour mot la FAQ affichée", () => {
    const { body } = render(ProFaq);
    const shown = [
      ...body.matchAll(/<summary[^>]*>(.*?)<\/summary>\s*<p[^>]*>(.*?)<\/p>/gs),
    ].map(([, q, a]) => ({ q: decode(q), a: decode(a) }));
    const ld = JSON.parse(FAQ_JSON_LD).mainEntity.map((e) => ({
      q: e.name,
      a: e.acceptedAnswer.text,
    }));
    expect(shown).toHaveLength(FAQ.length);
    expect(ld).toEqual(shown);
  });

  it("ne promet ni « illimité » ni de futures options", () => {
    const texts = JSON.stringify([PLANS, PRO_PERKS, COMPARE, FAQ]);
    expect(texts).not.toMatch(/illimit|futures options|le plus choisi/i);
  });

  it("une seule offre mise en avant, avec un badge qui dit un fait", () => {
    const top = PLANS.filter((p) => p.featured);
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ id: "monthly", badge: "Pour les bars" });
  });
});

describe("cartes des offres", () => {
  const checkout = {
    busy: null,
    subscribed: false,
    nightActive: false,
    activePro: false,
    payError: "",
    confirmed: null,
    buy: () => {},
  };

  it("affiche les trois formules, filtre sur « Tout voir »", () => {
    const { body } = render(ProOffers, { props: { checkout } });
    expect(body.match(/<article/g)).toHaveLength(3);
    for (const p of PLANS) expect(decode(body)).toContain(p.cta);
    expect(body).toMatch(/aria-pressed="true"[^>]*>Tout voir/);
  });

  it("un abonné ne peut pas reprendre une formule", () => {
    const { body } = render(ProOffers, {
      props: { checkout: { ...checkout, subscribed: true } },
    });
    expect(body.match(/Déjà abonné/g)).toHaveLength(3);
  });
});
