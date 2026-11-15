import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import ProThanks from "../ProThanks.svelte";
import { thanksPhase, planLabel, endTitle } from "../thanks.js";

const page = (zik) =>
  render(ProThanks, { context: new Map([["zik", zik]]) }).body;

describe("état de /pro/merci", () => {
  const base = { active: false, waitedTooLong: false, authReady: true };
  it("décide de la phase", () => {
    expect(thanksPhase({ ...base, active: true, user: {} })).toBe("on");
    expect(thanksPhase({ ...base, waitedTooLong: true, user: {} })).toBe(
      "late",
    );
    expect(thanksPhase({ ...base, user: null })).toBe("out");
    expect(thanksPhase({ ...base, authReady: false, user: null })).toBe("wait");
    expect(thanksPhase({ ...base, user: {} })).toBe("wait");
    // Actif l'emporte même sans compte chargé
    expect(thanksPhase({ ...base, active: true, user: null })).toBe("on");
  });

  it("nomme la formule et sa fin sans parler d'échéance pour la Soirée 24 h", () => {
    expect(planLabel("monthly")).toBe("Abonnement mensuel · 19 €");
    expect(planLabel("night")).toBe("Soirée 24 h · 7,90 €");
    expect(planLabel("manual")).toBe("Accès offert");
    expect(endTitle("night")).toBe("Actif jusqu'au");
    expect(endTitle("manual")).toBe("Actif jusqu'au");
    expect(endTitle("yearly")).toBe("Prochaine échéance");
  });
});

describe("page /pro/merci", () => {
  it("sans compte : demande de se connecter, aucun récapitulatif", () => {
    const body = page({ authReady: true, user: null });
    expect(body).toMatch(/role="status"[^>]*>.*Connexion nécessaire/s);
    expect(body).toContain("Me connecter");
    expect(body).not.toContain("<dl");
    expect(body).not.toContain("paiement reçu");
  });

  it("en attente : formule en attente de Stripe, titre neutre, pas de bouton Pro", () => {
    const body = page({
      authReady: true,
      user: { id: "u1", email: "bar@exemple.fr" },
    });
    expect(body).toContain("Paiement en cours de confirmation");
    expect(body).toContain("En attente de Stripe…");
    expect(body).toContain("bar@exemple.fr");
    expect(body).not.toContain("Prochaine échéance");
    expect(body).not.toContain("paiement reçu");
    expect(body).toContain("Créer une soirée");
    expect(body).not.toContain("Créer ma soirée Pro");
  });
});
