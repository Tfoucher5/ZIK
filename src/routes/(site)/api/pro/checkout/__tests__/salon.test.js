import { describe, it, expect, beforeEach, vi } from "vitest";
import { error } from "@sveltejs/kit";

// Stripe, base et compte simulés : rien ne sort
vi.mock("$lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: () => ({ rpc: async () => ({ data: null, error: null }) }),
  }),
}));
const create = vi.hoisted(() => vi.fn(async () => ({ url: "https://pay" })));
vi.mock("$lib/server/stripe.js", async (orig) => ({
  ...(await orig()),
  getStripe: () => ({ checkout: { sessions: { create } } }),
}));
vi.mock("$lib/server/middleware/auth.js", async (orig) => ({
  ...(await orig()),
  checkRateLimit: () => {},
  requireAuth: async (request) => {
    if (!request.headers.get("authorization")) error(401, "Non authentifie");
    return { user: { id: "u1", email: "a@b.fr" } };
  },
}));
const getProRow = vi.hoisted(() => vi.fn());
vi.mock("$lib/server/services/pro.js", async (orig) => ({
  ...(await orig()),
  getProRow,
}));

const { POST } = await import("../+server.js");
const { salonRooms, setIO } = await import("$lib/server/state.js");

const ACTIF = {
  status: "active",
  plan: "night",
  current_period_end: "2099-01-01T00:00:00Z",
};

function salon(code, hostUserId = null) {
  salonRooms[code] = {
    code,
    adminKey: "cle",
    hostUserId,
    pro: false,
    players: {},
    banned: new Set(),
    settings: {},
    game: {
      fullPlaylist: [],
      sessionPlaylist: [],
      played: [],
      currentTrack: null,
    },
  };
  return salonRooms[code];
}

async function post(body, auth = true) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  try {
    return await POST({
      request: new Request("http://x/api/pro/checkout", {
        method: "POST",
        body: raw,
        headers: auth ? { authorization: "Bearer t" } : {},
      }),
      url: new URL("http://x/api/pro/checkout"),
      getClientAddress: () => "1.2.3.4",
    });
  } catch (e) {
    // error() de SvelteKit : relevée comme le ferait le routeur
    return { status: e.status, json: async () => e.body };
  }
}

beforeEach(() => {
  vi.stubEnv("STRIPE_PRICE_NIGHT", "price_night");
  vi.stubEnv("STRIPE_PRICE_MONTHLY", "price_m");
  create.mockClear();
  getProRow.mockReset();
  getProRow.mockResolvedValue(null);
  setIO({ to: () => ({ emit: () => {} }) });
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
});

describe("paiement depuis la régie", () => {
  it("sans salon : Stripe reçoit exactement les mêmes paramètres qu'avant", async () => {
    const res = await post({ plan: "night" });
    expect(await res.json()).toEqual({ url: "https://pay" });
    const args = create.mock.calls[0][0];
    expect(args).toMatchObject({
      mode: "payment",
      client_reference_id: "u1",
      metadata: { user_id: "u1", plan: "night" },
      customer_email: "a@b.fr",
    });
    expect(Object.keys(args).sort()).toEqual([
      "allow_promotion_codes",
      "cancel_url",
      "client_reference_id",
      "custom_text",
      "customer_creation",
      "customer_email",
      "invoice_creation",
      "line_items",
      "locale",
      "metadata",
      "mode",
      "success_url",
      "tax_id_collection",
    ]);
  });

  it("salon invité et clé valides : rattaché au compte puis page de paiement", async () => {
    const s = salon("SOIR01");
    const res = await post({ plan: "night", salon: "SOIR01", key: "cle" });
    expect(await res.json()).toEqual({ url: "https://pay" });
    expect(s.hostUserId).toBe("u1");
    expect(s.pro).toBe(false);
  });

  it("compte déjà Pro : bascule tout de suite, sans Stripe", async () => {
    const s = salon("SOIR01", "u1");
    getProRow.mockResolvedValue(ACTIF);
    const res = await post({ plan: "monthly", salon: "SOIR01", key: "cle" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ activated: true });
    expect(s.pro).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("déjà Pro sans salon : 409 comme avant", async () => {
    getProRow.mockResolvedValue(ACTIF);
    expect((await post({ plan: "night" })).status).toBe(409);
  });

  it("refus : non connecté, mauvaise clé, salon d'un autre, salon fini", async () => {
    salon("SOIR01");
    salon("AUTR01", "u2");
    expect(
      (await post({ plan: "night", salon: "SOIR01", key: "cle" }, false))
        .status,
    ).toBe(401);
    expect(
      (await post({ plan: "night", salon: "SOIR01", key: "x" })).status,
    ).toBe(403);
    expect(
      (await post({ plan: "night", salon: "AUTR01", key: "cle" })).status,
    ).toBe(403);
    expect(
      (await post({ plan: "night", salon: "FINI01", key: "cle" })).status,
    ).toBe(404);
    expect(salonRooms.SOIR01.hostUserId).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("formules héritées de l'objet : refusées, aucun rattachement", async () => {
    salon("ABC123");
    for (const plan of ["constructor", "toString", "__proto__"])
      expect(
        (await post({ plan, salon: "ABC123", key: "cle" })).status,
        plan,
      ).toBe(400);
    expect(salonRooms.ABC123.hostUserId).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("attach différent de true : chemin de paiement habituel", async () => {
    for (const attach of ["oui", 42, {}, [], 1, "true"]) {
      create.mockClear();
      const res = await post({ plan: "night", attach });
      expect(await res.json(), JSON.stringify(attach)).toEqual({
        url: "https://pay",
      });
      expect(create).toHaveBeenCalledTimes(1);
    }
  });
});

describe("rattachement à la connexion (attach: true) : jamais de Stripe", () => {
  it("salon valide, compte gratuit : rattaché, rien d'activé", async () => {
    const s = salon("SOIR01");
    const res = await post({ salon: "SOIR01", key: "cle", attach: true });
    expect(await res.json()).toEqual({ activated: false });
    expect(s.hostUserId).toBe("u1");
    expect(s.pro).toBe(false);
  });

  it("formule facultative, même inconnue ou présente", async () => {
    for (const plan of [undefined, "night", "monthly", "__proto__", 42]) {
      salon("SOIR01");
      const res = await post({
        plan,
        salon: "SOIR01",
        key: "cle",
        attach: true,
      });
      expect(res.status, String(plan)).toBe(200);
    }
  });

  it("compte déjà Pro : la soirée passe Pro tout de suite", async () => {
    const s = salon("SOIR01");
    getProRow.mockResolvedValue(ACTIF);
    const res = await post({ salon: "SOIR01", key: "cle", attach: true });
    expect(await res.json()).toEqual({ activated: true });
    expect(s.pro).toBe(true);
  });

  it("refus 403 et 404 avant tout, aucun rattachement", async () => {
    salon("SOIR01");
    salon("AUTR01", "u2");
    const cas = [
      [{ salon: "SOIR01", key: "x" }, 403],
      [{ salon: "AUTR01", key: "cle" }, 403],
      [{ salon: "FINI01", key: "cle" }, 404],
      [{ key: "cle" }, 400],
    ];
    for (const [body, status] of cas)
      expect((await post({ ...body, attach: true })).status).toBe(status);
    expect(salonRooms.SOIR01.hostUserId).toBeNull();
    expect(salonRooms.AUTR01.hostUserId).toBe("u2");
  });

  it("corps hostiles : 4xx, jamais 500", async () => {
    salon("ABC123");
    const corps = [
      { attach: true },
      { attach: true, salon: {} },
      { attach: true, salon: "__proto__", key: "cle" },
      { attach: true, salon: "ABC123", key: 42 },
      { attach: true, salon: "ABC123", key: "k".repeat(1_000_000) },
      { attach: true, salon: ["ABC123"], key: "cle" },
      { attach: true, salon: "abc123", key: "cle" },
    ];
    for (const body of corps) {
      const { status } = await post(body);
      expect(status, JSON.stringify(body).slice(0, 60)).toBeGreaterThanOrEqual(
        400,
      );
      expect(status).toBeLessThan(500);
    }
    expect(salonRooms.ABC123.hostUserId).toBeNull();
  });

  it("aucune session Stripe, dans tous les cas", async () => {
    salon("SOIR01");
    salon("AUTR01", "u2");
    const bodies = [
      { salon: "SOIR01", key: "cle" },
      { plan: "night", salon: "SOIR01", key: "cle" },
      { plan: "monthly", salon: "SOIR01", key: "cle", confirm: true },
      { plan: "yearly", salon: "AUTR01", key: "cle" },
      { plan: "night", salon: "FINI01", key: "cle" },
      { plan: "night", salon: "SOIR01", key: "x" },
      { plan: "night" },
      {},
    ];
    for (const row of [null, ACTIF, { ...ACTIF, status: "canceled" }])
      for (const body of bodies) {
        getProRow.mockResolvedValue(row);
        await post({ ...body, attach: true });
      }
    expect(create).not.toHaveBeenCalled();
  });
});

describe("corps hostiles", () => {
  it("toujours une réponse 4xx, jamais 500", async () => {
    salon("ABC123");
    const corps = [
      "null",
      "[]",
      '"x"',
      "42",
      "pas du json",
      { plan: "night", salon: {} },
      { plan: "night", salon: "__proto__" },
      { plan: "night", salon: "ABC123", key: 42 },
      { plan: "night", salon: "ABC123", key: "k".repeat(1_000_000) },
      { plan: "night", salon: "" },
    ];
    for (const body of corps) {
      const { status } = await post(body);
      expect(status, JSON.stringify(body).slice(0, 60)).toBeGreaterThanOrEqual(
        400,
      );
      expect(status).toBeLessThan(500);
    }
    expect(salonRooms.ABC123.hostUserId).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
