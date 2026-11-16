import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../auth.js";

const refus = (fn) => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
};

describe("limite de débit", () => {
  it("refuse au-delà du plafond, avec le message de la page", () => {
    checkRateLimit("t:pro", 1, 60_000, "Trop de demandes, réessayez.");
    const e = refus(() =>
      checkRateLimit("t:pro", 1, 60_000, "Trop de demandes, réessayez."),
    );
    expect(e.status).toBe(429);
    expect(e.body.message).toBe("Trop de demandes, réessayez.");
  });

  it("message par défaut inchangé", () => {
    checkRateLimit("t:def", 1, 60_000);
    expect(refus(() => checkRateLimit("t:def", 1, 60_000)).body.message).toBe(
      "Trop de requetes, reessaie dans un instant.",
    );
  });
});
