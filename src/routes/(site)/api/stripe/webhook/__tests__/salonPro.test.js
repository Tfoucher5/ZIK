import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Stripe, base et mails simulés : rien ne sort
vi.mock("#lib/server/config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: () => ({ rpc: async () => ({ data: null, error: null }) }),
  }),
}));
vi.mock("#lib/server/stripe.js", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: (body) => JSON.parse(body) },
    subscriptions: { retrieve: async (id) => ({ id }) },
  }),
}));
const pro = vi.hoisted(() => ({
  getProRow: vi.fn(),
  activateNight: vi.fn(),
  syncSubscription: vi.fn(),
  isPro: vi.fn(),
}));
vi.mock("#lib/server/services/pro.js", async (orig) => ({
  ...(await orig()),
  ...pro,
}));
vi.mock("#lib/server/mail/send.js", () => ({
  sendMail: vi.fn(async () => {}),
  ADMIN_EMAIL: "admin@test",
}));
vi.mock("#lib/server/services/admin/alerts.js", () => ({
  alertAdminsSafe: vi.fn(),
}));

const { POST } = await import("../+server.js");
const { salonRooms, setIO } = await import("#lib/server/state.js");
const { sendMail } = await import("#lib/server/mail/send.js");

const ACTIF = { status: "active", current_period_end: "2099-01-01T00:00:00Z" };

const emissions = [];
const io = {
  to: (cible) => ({
    emit: (event, payload) =>
      emissions.push({ cibles: [].concat(cible), event, payload }),
  }),
};

function salon(code, hostUserId) {
  salonRooms[code] = {
    code,
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

const session = (extra = {}) => ({
  id: "cs_1",
  client_reference_id: "u1",
  payment_status: "paid",
  mode: "payment",
  customer: "cus_1",
  metadata: { plan: "night" },
  amount_total: 990,
  currency: "eur",
  ...extra,
});

const webhook = (object) =>
  POST({
    request: new Request("http://x/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({
        type: "checkout.session.completed",
        data: { object },
      }),
      headers: { "stripe-signature": "simulée" },
    }),
  });

const salonPro = () => emissions.filter((e) => e.event === "salon_pro");

beforeEach(() => {
  emissions.length = 0;
  for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  for (const f of Object.values(pro)) f.mockReset();
  pro.getProRow.mockResolvedValue(ACTIF);
  sendMail.mockClear();
  setIO(io);
});
afterEach(() => setIO(null));

describe("webhook Stripe : le salon en cours passe Pro", () => {
  it("passe Soirée payé : le salon de l'acheteur bascule et la régie le voit", async () => {
    const s = salon("SOIR01", "u1");
    const res = await webhook(session());
    expect(res.status).toBe(200);
    expect(pro.activateNight).toHaveBeenCalledOnce();
    expect(s.pro).toBe(true);
    expect(salonPro()).toHaveLength(1);
    expect(salonPro()[0].cibles).toEqual([
      "salon:screens:SOIR01",
      "salon:ctrl:SOIR01",
    ]);
  });

  it("webhook rejoué : rien n'est refait", async () => {
    const s = salon("SOIR01", "u1");
    await webhook(session());
    pro.getProRow.mockResolvedValue({ ...ACTIF, stripe_last_session: "cs_1" });
    await webhook(session());
    expect(pro.activateNight).toHaveBeenCalledOnce();
    expect(salonPro()).toHaveLength(1);
    expect(s.pro).toBe(true);
  });

  it("rejeu après un premier passage coupé : le salon bascule", async () => {
    const s = salon("SOIR01", "u1");
    pro.getProRow
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("base injoignable"));
    await expect(webhook(session())).rejects.toThrow();
    expect(s.pro).toBe(false);
    pro.getProRow.mockResolvedValue({ ...ACTIF, stripe_last_session: "cs_1" });
    expect((await webhook(session())).status).toBe(200);
    expect(pro.activateNight).toHaveBeenCalledOnce();
    expect(s.pro).toBe(true);
  });

  it("aucune ligne active en base : le salon ne bascule pas", async () => {
    const s = salon("ABON01", "u1");
    pro.getProRow.mockResolvedValue({
      status: "canceled",
      current_period_end: "2099-01-01T00:00:00Z",
    });
    await webhook(session({ mode: "subscription", subscription: "sub_1" }));
    expect(s.pro).toBe(false);
    expect(emissions).toHaveLength(0);
  });

  it("panne côté salon : 200 et mails partis quand même", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    salon("SOIR01", "u1");
    setIO({
      to: () => {
        throw new Error("socket en panne");
      },
    });
    const res = await webhook(session());
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("non payé ou sans compte : rien ne bouge", async () => {
    const s = salon("SOIR01", "u1");
    await webhook(session({ payment_status: "unpaid" }));
    await webhook(session({ client_reference_id: null }));
    expect(s.pro).toBe(false);
    expect(pro.activateNight).not.toHaveBeenCalled();
    expect(emissions).toHaveLength(0);
  });

  it("le salon d'un autre compte ou d'un invité reste gratuit", async () => {
    const autre = salon("AUTR01", "u2");
    const invite = salon("INVI01", null);
    await webhook(session());
    expect(autre.pro).toBe(false);
    expect(invite.pro).toBe(false);
  });

  it("abonnement : le salon bascule aussi", async () => {
    const s = salon("ABON01", "u1");
    const res = await webhook(
      session({ mode: "subscription", subscription: "sub_1" }),
    );
    expect(res.status).toBe(200);
    expect(pro.syncSubscription).toHaveBeenCalledWith({ id: "sub_1" }, "cs_1");
    expect(s.pro).toBe(true);
  });

  it("acheteur sans salon en cours : 200", async () => {
    const res = await webhook(session());
    expect(res.status).toBe(200);
    expect(pro.activateNight).toHaveBeenCalledOnce();
  });
});
