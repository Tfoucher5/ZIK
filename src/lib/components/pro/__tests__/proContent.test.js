import { describe, it, expect, vi } from "vitest";
import { render } from "svelte/server";
import ProFaq from "../ProFaq.svelte";
import ProOffers from "../ProOffers.svelte";
import ProHero from "../ProHero.svelte";
import { FAQ, FAQ_JSON_LD, COMPARE } from "../proContent.js";
import { PLANS, PRO_PERKS } from "../../../data/proPlans.js";

vi.mock("$env/dynamic/public", () => ({ env: {} }));

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

  it("sans régie : pas de bloc, le Mensuel mis en avant", () => {
    const { body } = render(ProOffers, { props: { checkout } });
    expect(body).not.toContain("Depuis votre régie");
    expect(body).not.toContain("Votre choix");
    expect(body.match(/plan card[^"]*top/g)).toHaveLength(1);
  });

  describe("arrivée par la régie", () => {
    const regie = (over) =>
      decode(
        render(ProOffers, {
          props: {
            checkout: {
              ...checkout,
              regie: "KZ4P2M",
              intent: { plan: "night", salon: "KZ4P2M" },
              chosen: PLANS[0],
              step: "compte",
              zik: { user: null },
              ...over,
            },
          },
        }).body,
      );

    it("le bloc, la soirée et la formule choisie mise en avant", () => {
      const body = regie();
      expect(body).toContain("Depuis votre régie");
      expect(body).toContain('aria-label="Code KZ4P2M"');
      expect(body).toContain("Créer mon compte");
      expect(body.match(/>Votre choix</g)).toHaveLength(1);
      const top = body.match(
        /<article class="plan card[^"]*top[\s\S]*?<\/h3>/g,
      );
      expect(top).toHaveLength(1);
      expect(top[0]).toContain("Soirée 24 h");
    });

    it("chaque étape a son texte", () => {
      const u = { user: { email: "bar@exemple.fr" } };
      expect(regie({ step: "mail", pendingEmail: "bar@exemple.fr" })).toContain(
        "Renvoyer l'e-mail",
      );
      expect(
        regie({ step: "payer", zik: u, attached: true, nightEnd: "demain" }),
      ).toContain("Payer 7,90 €");
      // Pas de paiement tant que la soirée n'est pas rattachée
      const verif = regie({ step: "payer", zik: u, attached: false });
      expect(verif).not.toContain("Payer 7,90 €");
      expect(verif).toContain("Vérification de la soirée");
      const refus = regie({
        step: "payer",
        zik: u,
        attachError: "Cette soirée n'est plus en cours.",
      });
      expect(refus).toContain("Cette soirée n'est plus en cours.");
      expect(refus).not.toContain("Payer 7,90 €");
      expect(refus).toContain("Continuer sans cette soirée");
      expect(regie({ step: "actif", activated: true })).toContain(
        "Rien à payer",
      );
      expect(
        regie({ step: "formule", intent: { plan: null, salon: "KZ4P2M" } }),
      ).toContain("Choisissez votre formule");
    });
  });

  it("rappelle la TVA et les CGV sous les offres", () => {
    const { body } = render(ProOffers, { props: { checkout } });
    expect(body).toContain("TVA non applicable");
    expect(body).toContain('href="/cgv"');
  });

  it("le hero mène à l'accès ZIK Pro quand il est actif", () => {
    const off = render(ProHero, { props: { checkout } }).body;
    expect(off).toContain("Voir les offres");
    const on = render(ProHero, {
      props: { checkout: { ...checkout, activePro: true } },
    }).body;
    expect(on).toContain("Mon accès ZIK Pro");
    expect(on).not.toContain("Créer une soirée gratuite");
  });
});
