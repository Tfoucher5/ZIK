import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("$lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("$lib/server/stripe.js", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: () => {
        throw new Error("signature invalide");
      },
    },
  }),
}));

const { POST } = await import("../+server.js");
const { countSince, resetOpsEvents } =
  await import("$lib/server/services/health/opsEvents.js");

describe("webhook Stripe : signature refusée", () => {
  beforeEach(resetOpsEvents);

  it("400, noté pour la sonde, sans passer pour une erreur serveur", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error");
    const res = await POST({
      request: new Request("http://x/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "fausse" },
      }),
    });
    expect(res.status).toBe(400);
    expect(countSince("stripe_bad_signature", 60_000)).toBe(1);
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});
