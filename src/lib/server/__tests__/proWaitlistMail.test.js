import { describe, it, expect } from "vitest";
import { waitlistWelcome, waitlistAdminAlert } from "../mail/proWaitlist.js";

const TRAP = '<img src=x onerror="alert(1)">';

describe("mails de la liste d'attente ZIK Pro", () => {
  it("n'injecte pas le HTML saisi dans le nom du lieu", () => {
    const { html } = waitlistWelcome({ venue: TRAP, plan: "monthly" });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("échappe aussi le nom du lieu dans l'alerte admin", () => {
    const { html } = waitlistAdminAlert({
      email: "a@b.fr",
      venue: TRAP,
      venueType: "bar",
      plan: "night",
      total: 1,
    });
    expect(html).not.toContain("<img src=x");
  });

  it("rappelle la formule choisie", () => {
    const { html, text } = waitlistWelcome({
      venue: "Le Comptoir",
      plan: "night",
    });
    expect(html).toContain("7,90 €");
    expect(text).toContain("Soirée");
  });

  it("répond directement au lieu depuis l'alerte admin", () => {
    const mail = waitlistAdminAlert({
      email: "gerant@bar.fr",
      venue: "Le Comptoir",
      venueType: "bar",
      plan: "monthly",
      total: 2,
    });
    expect(mail.replyTo).toBe("gerant@bar.fr");
    expect(mail.subject).toContain("Le Comptoir");
  });
});
