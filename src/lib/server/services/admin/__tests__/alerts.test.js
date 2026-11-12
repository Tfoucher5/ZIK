import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null, ready: true, deliver: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../notify/push.js", () => ({
  ready: () => m.ready,
  deliver: (...a) => m.deliver(...a),
}));

const { alertAdmins, alertAdminsSafe, ADMIN_ALERTS } =
  await import("../alerts.js");

const SUBS = [{ id: 1, endpoint: "https://push/1" }];
let subs;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
  m.ready = true;
  subs = SUBS;
  m.deliver = vi.fn(async (list) => list.length);
  m.db = fakeQuery(() => ({ data: subs }));
});
afterEach(() => vi.useRealTimers());

describe("alertes aux admins", () => {
  it("ne vise que les super admins qui ont activé ce type", async () => {
    expect(
      await alertAdmins("admin_money", { title: "Paiement", tag: "t1" }),
    ).toBe(1);
    const [q] = m.db.of("push_subscriptions");
    expect(q.ops.filter(([n]) => n === "eq").map(([, a]) => a)).toEqual([
      ["profile.role", "super_admin"],
      ["profile.notif_prefs->>admin_money", "true"],
    ]);
    expect(m.deliver).toHaveBeenCalledWith(SUBS, {
      title: "Paiement",
      tag: "t1",
    });
  });

  it("le type sert d'étiquette par défaut", async () => {
    await alertAdmins("admin_reports", { title: "x" });
    expect(m.deliver.mock.calls[0][1].tag).toBe("admin_reports");
  });

  it("sans clés VAPID : rien n'est lu ni envoyé", async () => {
    m.ready = false;
    expect(await alertAdmins("admin_errors", { tag: "t2" })).toBe(0);
    expect(m.db.queries).toHaveLength(0);
  });

  it("aucun admin abonné : pas d'envoi", async () => {
    subs = [];
    expect(await alertAdmins("admin_salons", { tag: "t3" })).toBe(0);
    subs = null;
    expect(await alertAdmins("admin_salons", { tag: "t3b" })).toBe(0);
    expect(m.deliver).not.toHaveBeenCalled();
  });

  it("anti-rafale : un même tag reste muet pendant throttleMs", async () => {
    const opts = { throttleMs: 60_000 };
    expect(await alertAdmins("admin_errors", { tag: "panne" }, opts)).toBe(1);
    vi.setSystemTime(Date.now() + 59_000);
    expect(await alertAdmins("admin_errors", { tag: "panne" }, opts)).toBe(0);
    expect(await alertAdmins("admin_errors", { tag: "autre" }, opts)).toBe(1);
    vi.setSystemTime(Date.now() + 2_000);
    expect(await alertAdmins("admin_errors", { tag: "panne" }, opts)).toBe(1);
    expect(m.deliver).toHaveBeenCalledTimes(3);
  });

  it("version sûre : une panne d'envoi ne casse pas l'appelant", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    m.deliver = vi.fn(async () => {
      throw new Error("push KO");
    });
    expect(() => alertAdminsSafe("admin_money", { tag: "t4" })).not.toThrow();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith("[alerte admin]", "push KO"),
    );
    warn.mockRestore();
  });

  it("chaque type d'alerte a un libellé", () => {
    for (const label of Object.values(ADMIN_ALERTS)) expect(label).toBeTruthy();
  });
});
