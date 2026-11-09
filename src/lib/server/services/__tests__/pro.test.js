import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({}));
vi.mock("../../config.js", async () =>
  (await import("./fakeQuery.js")).fakeClients(h),
);
vi.mock("../../stripe.js", () => ({
  planForPrice: (id) => ({ p_m: "monthly", p_y: "yearly" })[id] ?? null,
}));

const { isProActive, isPro, getProRow, activateNight, syncSubscription } =
  await import("../pro.js");

const NOW = Date.parse("2026-11-09T20:00:00Z");
const H = 3600_000;
const iso = (ms) => new Date(ms).toISOString();
// Accès Pro : écrit par le client admin seulement, jamais par l'anonyme
const upserts = () => {
  expect(h.writes(h.anon)).toEqual([]);
  return h.admin
    .of("pro_subscriptions")
    .filter((q) => q.has("upsert"))
    .map((q) => q.args("upsert")[0]);
};
const row = (r) => (h.tables.pro_subscriptions = { data: r, error: null });

beforeEach(() => {
  h.reset();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("isProActive", () => {
  it("actif si statut active et fin dans le futur", () => {
    expect(
      isProActive({ status: "active", current_period_end: iso(NOW + 1000) }),
    ).toBe(true);
  });
  it.each([
    ["expiré", { status: "active", current_period_end: iso(NOW - 1) }],
    ["fin pile maintenant", { status: "active", current_period_end: iso(NOW) }],
    ["impayé", { status: "past_due", current_period_end: iso(NOW + H) }],
    ["résilié", { status: "canceled", current_period_end: iso(NOW + H) }],
    ["date absente", { status: "active", current_period_end: null }],
    ["ligne absente", null],
    ["ligne indéfinie", undefined],
  ])("inactif : %s", (_, r) => {
    expect(isProActive(r)).toBe(false);
  });
});

describe("isPro", () => {
  it("faux sans userId, sans requête", async () => {
    expect(await isPro(null)).toBe(false);
    expect(await isPro("")).toBe(false);
    expect(h.all()).toHaveLength(0);
  });
  it("lit la ligne du compte", async () => {
    row({ status: "active", current_period_end: iso(NOW + H) });
    expect(await isPro("u1")).toBe(true);
    const [q] = h.admin.of("pro_subscriptions");
    expect(q.has("eq", "user_id", "u1")).toBe(true);
    expect(h.anon.queries).toEqual([]);
  });
  it("faux sans abonnement", async () => {
    row(null);
    expect(await isPro("u1")).toBe(false);
  });
  it("faux si abonnement expiré d'une milliseconde", async () => {
    row({ status: "active", current_period_end: iso(NOW - 1) });
    expect(await isPro("u1")).toBe(false);
  });
  it("getProRow rend la ligne telle quelle", async () => {
    row({ plan: "monthly" });
    expect(await getProRow("u1")).toEqual({ plan: "monthly" });
  });
});

describe("activateNight : passe Soirée de 24 h", () => {
  it("sans accès : 24 h à partir de maintenant", async () => {
    row(null);
    await activateNight("u1", "cus_1", "cs_1");
    expect(upserts()).toEqual([
      {
        user_id: "u1",
        plan: "night",
        status: "active",
        current_period_end: iso(NOW + 24 * H),
        stripe_customer_id: "cus_1",
        stripe_subscription_id: null,
        stripe_last_session: "cs_1",
        updated_at: iso(NOW),
      },
    ]);
  });
  it("passe en cours : 24 h ajoutées à la suite", async () => {
    row({
      plan: "night",
      status: "active",
      current_period_end: iso(NOW + 5 * H),
    });
    await activateNight("u1", "cus_1", "cs_2");
    expect(upserts()[0].current_period_end).toBe(iso(NOW + 29 * H));
  });
  it("passe expiré : repart de maintenant", async () => {
    row({ plan: "night", status: "active", current_period_end: iso(NOW - H) });
    await activateNight("u1", "cus_1", "cs_2");
    expect(upserts()[0].current_period_end).toBe(iso(NOW + 24 * H));
  });
  it("passe qui expire pile maintenant : repart de maintenant", async () => {
    row({ plan: "night", status: "active", current_period_end: iso(NOW) });
    await activateNight("u1", "cus_1", "cs_2");
    expect(upserts()[0].current_period_end).toBe(iso(NOW + 24 * H));
  });

  // grantPro (admin/userActions.js) écrit plan « manual » sans abonnement
  // Stripe : /api/pro/checkout laisse alors acheter un passe après
  // confirmation, et activateNight remplace la date de fin par maintenant + 24 h.
  it.fails(
    "BUG : un passe acheté pendant un accès offert de 30 jours le raccourcit à 24 h",
    async () => {
      row({
        plan: "manual",
        status: "active",
        current_period_end: iso(NOW + 30 * 24 * H),
      });
      await activateNight("u1", "cus_1", "cs_3");
      expect(
        Date.parse(upserts()[0].current_period_end),
      ).toBeGreaterThanOrEqual(NOW + 30 * 24 * H);
    },
  );
});

const sub = (over = {}) => ({
  id: "sub_1",
  status: "active",
  customer: "cus_1",
  metadata: { user_id: "u1" },
  cancel_at: null,
  items: {
    data: [
      { price: { id: "p_m" }, current_period_end: (NOW + 30 * 24 * H) / 1000 },
    ],
  },
  ...over,
});

describe("syncSubscription : abonnement Stripe recopié", () => {
  it("ignoré sans user_id dans les métadonnées", async () => {
    expect(await syncSubscription(sub({ metadata: {} }))).toBeNull();
    expect(await syncSubscription(sub({ metadata: undefined }))).toBeNull();
    expect(h.all()).toHaveLength(0);
  });
  it("ignoré si le prix ne correspond à aucune formule", async () => {
    const s = sub();
    s.items.data[0].price.id = "p_autre";
    expect(await syncSubscription(s)).toBeNull();
    expect(upserts()).toEqual([]);
  });
  it("mensuel actif : ligne écrite avec la fin de période", async () => {
    const r = await syncSubscription(sub(), "cs_9");
    expect(r).toEqual({
      user_id: "u1",
      plan: "monthly",
      status: "active",
      current_period_end: iso(NOW + 30 * 24 * H),
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      updated_at: iso(NOW),
      stripe_last_session: "cs_9",
    });
    expect(upserts()).toEqual([r]);
  });
  it("sans session : pas de stripe_last_session", async () => {
    const r = await syncSubscription(sub());
    expect(r).not.toHaveProperty("stripe_last_session");
  });
  it("annuel en essai : actif", async () => {
    const s = sub({ status: "trialing" });
    s.items.data[0].price.id = "p_y";
    expect(await syncSubscription(s)).toMatchObject({
      plan: "yearly",
      status: "active",
    });
  });
  it("résiliation programmée : la date de fin est cancel_at", async () => {
    const cancelAt = (NOW + 3 * 24 * H) / 1000;
    const r = await syncSubscription(sub({ cancel_at: cancelAt }));
    expect(r.current_period_end).toBe(iso(NOW + 3 * 24 * H));
  });
  it.each([
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["canceled", "canceled"],
    ["incomplete_expired", "canceled"],
  ])("statut Stripe %s → %s pour l'abonnement courant", async (st, attendu) => {
    row({ stripe_subscription_id: "sub_1" });
    expect((await syncSubscription(sub({ status: st }))).status).toBe(attendu);
  });
  it("un vieil abonnement résilié n'écrase pas un accès plus récent", async () => {
    row({ plan: "yearly", stripe_subscription_id: "sub_2" });
    expect(await syncSubscription(sub({ status: "canceled" }))).toBeNull();
    expect(upserts()).toEqual([]);
  });
  it("une résiliation n'écrase pas un passe Soirée", async () => {
    row({ plan: "night", stripe_subscription_id: null });
    expect(await syncSubscription(sub({ status: "canceled" }))).toBeNull();
  });
  it("résiliation sans ligne existante : écrite", async () => {
    row(null);
    expect((await syncSubscription(sub({ status: "canceled" }))).status).toBe(
      "canceled",
    );
  });
  it("actif : ne relit pas la ligne courante", async () => {
    await syncSubscription(sub());
    expect(h.all().filter((q) => q.has("select", "*"))).toHaveLength(0);
  });
});
