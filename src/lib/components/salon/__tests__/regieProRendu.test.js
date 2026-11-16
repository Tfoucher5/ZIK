import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import RegiePro from "../regie/RegiePro.svelte";
import { PLANS } from "../../../data/proPlans.js";

const prix = (id) => PLANS.find((p) => p.id === id).price;
const DOUZE = Array.from({ length: 12 }, (_, i) => ({
  username: `J${i}`,
  team: i % 2,
}));
const offre = (o) => ({
  count: 0,
  names: [],
  paiement: false,
  entres: null,
  ...o,
});
const rendu = (o, props = {}) =>
  render(RegiePro, {
    props: { o: offre(o), pro: false, players: DOUZE, ...props },
  }).body;

describe("régie : rendu de l'offre ZIK Pro", () => {
  it("offre : prix de PLANS, « + N », pointillés sans couleur d'équipe", () => {
    const html = rendu({ count: 28, names: ["Hugo", "Lina", "Malo"] });
    expect(html).toContain("Fais-les entrer");
    expect(html).toContain(prix("night"));
    expect(html).toContain(`${prix("monthly")} par mois`);
    expect(html).toContain(`${prix("yearly")} par an`);
    expect(html).toContain("+\u00a025");
    expect(html).not.toMatch(/class="att[^"]*"[^>]*style=/);
    expect(html.match(/--tc:/g)).toHaveLength(12);
  });

  it("paiement en cours", () => {
    const html = rendu({ count: 1, names: ["Hugo"], paiement: true });
    expect(html).toContain("Finis dans l'autre onglet");
    expect(html).toContain("Hugo entre");
    expect(html).toContain("tu peux même lancer la partie");
    expect(html).not.toContain(prix("night"));
  });

  it("activé : les noms entrés et « + N » au-delà de trois", () => {
    const players = [
      ...DOUZE,
      ...["Hugo", "Lina", "Malo"].map((username) => ({ username })),
    ];
    const html = rendu(
      { entres: { count: 28, names: ["Hugo", "Lina", "Malo"] } },
      { pro: true, players },
    );
    expect(html).toContain("Tout le monde est dedans");
    expect(html).toContain(
      "Hugo, Lina, Malo et 25 autres ont pris leur place.",
    );
    expect(html.match(/class="neuf[^"]*"/g)).toHaveLength(4);
    expect(html).toContain("+\u00a025");
    expect(html).toContain("Compris");
  });

  it("replié : une ligne qui s'ouvre, sans jauge", () => {
    const html = rendu(
      { count: 3, names: ["Hugo", "Lina", "Malo"] },
      { replie: true },
    );
    expect(html).toContain("<details");
    expect(html).toContain("Complet · 3 attendent");
    expect(html).toContain("Faire entrer");
    expect(html).not.toContain("ro-places");
  });

  it("déjà Pro sans carte à montrer : rien", () => {
    const html = rendu({ count: 3, names: ["Hugo"] }, { pro: true });
    expect(html).not.toMatch(/<(section|details|div)/);
  });
});
