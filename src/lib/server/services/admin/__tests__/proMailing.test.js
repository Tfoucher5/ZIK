import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({
  db: null,
  seen: null,
  sendMail: null,
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../../mail/send.js", () => ({
  ADMIN_EMAIL: "admin@test.fr",
  sendMail: (...a) => m.sendMail(...a),
}));
vi.mock("../../notify/push.js", () => ({
  firstTime: async (key) => (m.seen.has(key) ? false : !!m.seen.add(key)),
}));

const {
  CAMPAIGNS,
  campaign,
  proMailingStatus,
  sendProMailing,
  sendProMailingTest,
} = await import("../proMailing.js");

const USERS = {
  u1: { id: "u1", email: "bar@a.fr" },
  u2: { id: "u2", email: "camping@b.fr" },
  u3: { id: "u3" },
};
let subs, sent;

beforeEach(() => {
  m.seen = new Set();
  m.sendMail = vi.fn(async () => true);
  subs = [
    { user_id: "u1" },
    { user_id: "u1" },
    { user_id: "u2" },
    { user_id: "u3" },
  ];
  sent = [];
  m.db = fakeQuery((q) =>
    q.table === "pro_subscriptions" ? { data: subs } : { data: sent },
  );
  m.db.client.auth.admin.getUserById.mockImplementation(async (id) => ({
    data: { user: USERS[id] ?? null },
  }));
});

describe("mails aux clients Pro", () => {
  it("campagne inconnue : null", () => {
    expect(campaign("pro-soiree")).toBe(CAMPAIGNS[0]);
    expect(campaign("x")).toBeNull();
    expect(campaign(undefined)).toBeNull();
  });

  it("un mail par client avec e-mail, même avec plusieurs abonnements", async () => {
    expect(await sendProMailing(campaign("pro-soiree"), "all")).toBe(2);
    expect(m.sendMail.mock.calls.map(([a]) => a.to)).toEqual([
      "bar@a.fr",
      "camping@b.fr",
    ]);
    expect(m.sendMail.mock.calls[0][0].subject).toBeTruthy();
  });

  it("relancer l'envoi ne renvoie rien à personne", async () => {
    const c = campaign("pro-support");
    await sendProMailing(c, "all");
    await sendProMailing(c, "all");
    expect(m.sendMail).toHaveBeenCalledTimes(2);
  });

  it("déjà noté envoyé en base : sauté", async () => {
    sent = [{ key: "mail:pro-soiree:u1" }];
    expect(await sendProMailing(campaign("pro-soiree"), "all")).toBe(1);
    expect(m.sendMail.mock.calls[0][0].to).toBe("camping@b.fr");
  });

  it("actifs seulement : filtre sur le statut et la date de fin", async () => {
    await sendProMailing(campaign("pro-soiree"), "active");
    const [q] = m.db.of("pro_subscriptions");
    expect(q.args("eq")).toEqual(["status", "active"]);
    expect(q.args("gt")[0]).toBe("current_period_end");
    await sendProMailing(campaign("pro-soiree"), "all");
    expect(m.db.of("pro_subscriptions")[1].has("eq")).toBe(false);
  });

  it("mail refusé par Resend : non compté", async () => {
    m.sendMail = vi.fn(async (mail) => mail.to !== "bar@a.fr");
    expect(await sendProMailing(campaign("pro-soiree"), "all")).toBe(1);
  });

  it("aucun abonné : pas de requête des envois passés", async () => {
    subs = null;
    expect(await sendProMailing(campaign("pro-soiree"), "all")).toBe(0);
    expect(m.db.of("notification_once")).toHaveLength(0);
  });

  it("état des campagnes : total et restants par périmètre", async () => {
    sent = [{ key: "mail:pro-soiree:u2" }];
    const status = await proMailingStatus();
    expect(status.map((s) => s.id)).toEqual(CAMPAIGNS.map((c) => c.id));
    expect(status[0].all).toEqual({ total: 2, pending: 1 });
    expect(status[0].subject).toBeTruthy();
  });

  it("envoi test : à l'admin seulement", async () => {
    await sendProMailingTest(campaign("pro-soiree"));
    expect(m.sendMail).toHaveBeenCalledTimes(1);
    expect(m.sendMail.mock.calls[0][0].to).toBe("admin@test.fr");
  });
});
