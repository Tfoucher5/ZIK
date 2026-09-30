import { describe, it, expect } from "vitest";
import { proWelcome, proSaleAlert } from "../mail/proPurchase.js";

const TRAP = '<img src=x onerror="alert(1)">@bar.fr';
const END = "2026-10-03T20:00:00.000Z";

describe("mails d'achat ZIK Pro", () => {
  it("rappelle la formule et la date de fin du passe Soirée", () => {
    const { html, text } = proWelcome({ plan: "night", periodEnd: END });
    expect(html).toContain("7,90 €");
    expect(html).toContain("Actif jusqu'au");
    expect(text).toContain("Soirée");
  });

  it("parle de renouvellement pour un abonnement", () => {
    const { html } = proWelcome({ plan: "monthly", periodEnd: END });
    expect(html).toContain("Prochain renouvellement");
    expect(html).toContain("Gérer mon abonnement");
  });

  it("échappe l'e-mail du client dans l'alerte admin", () => {
    const { html } = proSaleAlert({ email: TRAP, plan: "yearly" });
    expect(html).not.toContain("<img src=x");
  });

  it("répond directement au client depuis l'alerte admin", () => {
    const mail = proSaleAlert({ email: "gerant@bar.fr", plan: "monthly" });
    expect(mail.replyTo).toBe("gerant@bar.fr");
    expect(mail.subject).toContain("Mensuel");
  });
});
