import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null, send: null, vapid: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...a) => m.vapid(...a),
    sendNotification: (...a) => m.send(...a),
  },
}));

const ENV = { PUBLIC_VAPID_KEY: "pub", VAPID_PRIVATE_KEY: "priv" };
let push, rows;
const sub = (id, user_id = "u1") => ({
  id,
  user_id,
  endpoint: `https://push/${id}`,
  p256dh: "k",
  auth: "a",
});
const fail = (statusCode) => Object.assign(new Error("ko"), { statusCode });

beforeEach(async () => {
  vi.resetModules();
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  vi.stubEnv("VAPID_SUBJECT", "");
  m.vapid = vi.fn();
  m.send = vi.fn(async () => {});
  rows = {};
  m.db = fakeQuery((q) => rows[q.table]?.(q));
  push = await import("../push.js");
});
afterEach(() => vi.unstubAllEnvs());

describe("clés VAPID", () => {
  it("sans clé : rien n'est configuré ni envoyé", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(push.ready()).toBe(false);
    expect(await push.pushToUser("u1", "social", {})).toBe(0);
    expect(await push.pushToAll("social", {})).toBe(0);
    expect(m.vapid).not.toHaveBeenCalled();
    expect(m.db.queries).toHaveLength(0);
  });

  it("avec clés : configuré une seule fois, avec le sujet fourni", () => {
    vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
    expect(push.ready()).toBe(true);
    expect(push.ready()).toBe(true);
    expect(m.vapid).toHaveBeenCalledTimes(1);
    expect(m.vapid).toHaveBeenCalledWith(
      "mailto:test@example.com",
      "pub",
      "priv",
    );
  });

  it("sans sujet : un mailto par défaut", () => {
    expect(push.ready()).toBe(true);
    expect(m.vapid).toHaveBeenCalledWith(
      expect.stringMatching(/^mailto:/),
      "pub",
      "priv",
    );
  });
});

describe("livraison", () => {
  it("abonnements expirés (404, 410) supprimés, les autres erreurs gardées", async () => {
    m.send = vi.fn(async ({ endpoint }) => {
      if (endpoint.endsWith("/2")) throw fail(410);
      if (endpoint.endsWith("/3")) throw fail(404);
      if (endpoint.endsWith("/4")) throw fail(500);
    });
    const n = await push.deliver([sub(1), sub(2), sub(3), sub(4)], {
      title: "t",
    });
    expect(n).toBe(1);
    const [del, upd] = m.db.of("push_subscriptions");
    expect(del.has("delete")).toBe(true);
    expect(del.args("in")).toEqual(["id", [2, 3]]);
    expect(upd.args("in")).toEqual(["id", [1]]);
    expect(upd.args("update")[0].last_success_at).toBeTruthy();
  });

  it("contenu et durée de vie de la notification", async () => {
    await push.deliver([sub(1)], { title: "Salut" });
    expect(m.send).toHaveBeenCalledWith(
      { endpoint: "https://push/1", keys: { p256dh: "k", auth: "a" } },
      '{"title":"Salut"}',
      { TTL: 43200 },
    );
  });

  it("par paquets de 20, sans requête si rien à noter", async () => {
    let live = 0;
    let peak = 0;
    m.send = vi.fn(async () => {
      peak = Math.max(peak, ++live);
      await Promise.resolve();
      live--;
      throw fail(500);
    });
    const subs = Array.from({ length: 45 }, (_, i) => sub(i));
    expect(await push.deliver(subs, {})).toBe(0);
    expect(m.send).toHaveBeenCalledTimes(45);
    expect(peak).toBe(20);
    expect(m.db.queries).toHaveLength(0);
  });
});

describe("envoi à un joueur", () => {
  it("catégorie désactivée ou profil absent : rien", async () => {
    rows.profiles = () => ({ data: { notif_prefs: { social: false } } });
    expect(await push.pushToUser("u1", "social", {})).toBe(0);
    rows.profiles = () => ({ data: null });
    expect(await push.pushToUser("u1", "social", {})).toBe(0);
    expect(await push.pushToUser("u1", undefined, {})).toBe(0);
    expect(m.send).not.toHaveBeenCalled();
  });

  it("catégorie activée : tous ses appareils", async () => {
    rows.profiles = () => ({ data: { notif_prefs: { cards: true } } });
    rows.push_subscriptions = (q) =>
      q.has("select") ? { data: [sub(1), sub(2)] } : undefined;
    expect(await push.pushToUser("u1", "cards", { title: "x" })).toBe(2);
  });

  it("aucun appareil : rien", async () => {
    rows.profiles = () => ({ data: { notif_prefs: { cards: true } } });
    expect(await push.pushToUser("u1", "cards", {})).toBe(0);
  });
});

describe("envoi à tous", () => {
  it("lit par pages de 1000, saute les joueurs exclus", async () => {
    const page = (from, n) =>
      Array.from({ length: n }, (_, i) => sub(from + i, `u${from + i}`));
    rows.push_subscriptions = (q) => {
      if (!q.has("range")) return undefined;
      return { data: q.args("range")[0] === 0 ? page(0, 1000) : page(1000, 2) };
    };
    // u5 a coupé la catégorie, u6 a un autre réglage seulement
    rows.profiles = (q) => ({
      data: q.args("in")[1].map((id) => ({
        id,
        notif_prefs:
          id === "u5" ? { zikle: false } : id === "u6" ? {} : { zikle: true },
      })),
    });
    const n = await push.pushToAll(
      "zikle",
      {},
      { skip: new Set(["u0", "u1001"]) },
    );
    expect(n).toBe(998);
    const reads = m.db.of("push_subscriptions").filter((q) => q.has("range"));
    expect(reads.map((q) => q.args("range"))).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(reads[0].schema).toBe("social");
    expect(m.db.of("profiles").map((q) => q.args("in")[1].length)).toEqual([
      300, 300, 300, 100,
    ]);
  });

  it("erreur de lecture : remontée, rien envoyé", async () => {
    rows.push_subscriptions = () => ({ error: new Error("panne") });
    await expect(push.pushToAll("zikle", {})).rejects.toThrow("panne");
    expect(m.send).not.toHaveBeenCalled();
  });
});

describe("envoi unique et abonnements", () => {
  it("firstTime : vrai seulement si la clé est neuve", async () => {
    rows.notification_once = () => ({ data: [{ key: "k" }] });
    expect(await push.firstTime("k")).toBe(true);
    const [q] = m.db.of("notification_once");
    expect(q.args("upsert")).toEqual([
      { key: "k" },
      { onConflict: "key", ignoreDuplicates: true },
    ]);
    rows.notification_once = () => ({ data: [] });
    expect(await push.firstTime("k")).toBe(false);
  });

  it("firstTime : erreur de base, on n'envoie pas (pas de doublon)", async () => {
    rows.notification_once = () => ({
      data: null,
      error: { message: "panne" },
    });
    expect(await push.firstTime("k")).toBe(false);
  });

  it("abonnement enregistré par endpoint, user agent borné", async () => {
    await push.saveSubscription(
      "u1",
      { endpoint: "https://e", keys: { p256dh: "p", auth: "a" } },
      "x".repeat(1_000_000),
    );
    const [row, opts] = m.db.of("push_subscriptions")[0].args("upsert");
    expect(row.user_agent).toHaveLength(300);
    expect(opts).toEqual({ onConflict: "endpoint" });
    await push.saveSubscription("u1", {
      endpoint: "e",
      keys: { p256dh: "p", auth: "a" },
    });
    expect(
      m.db.of("push_subscriptions")[1].args("upsert")[0].user_agent,
    ).toBeNull();
  });

  it("abonnement refusé par la base : erreur remontée", async () => {
    rows.push_subscriptions = () => ({ error: new Error("rls") });
    await expect(
      push.saveSubscription("u1", {
        endpoint: "e",
        keys: { p256dh: "p", auth: "a" },
      }),
    ).rejects.toThrow("rls");
  });

  it("désabonnement par endpoint", async () => {
    await push.deleteSubscription("https://e");
    const [q] = m.db.of("push_subscriptions");
    expect(q.has("delete")).toBe(true);
    expect(q.args("eq")).toEqual(["endpoint", "https://e"]);
  });
});
