import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../config.js", () => ({ getAdminClient: () => ({}) }));

const { makeProbes } = await import("../probes.js");
const { noteEvent, resetOpsEvents, countSince } =
  await import("../opsEvents.js");

const NOW = Date.now();
const loop = { enable() {}, reset() {}, percentile: () => 0 };
const sondes = (extra) =>
  makeProbes({
    loop,
    log: [],
    env: {
      SUPABASE_URL: "http://sb.test",
      SUPABASE_ANON_KEY: "cle",
      PORT: "1234",
    },
    ...extra,
  });
const reponse = (status, body = {}) => ({
  status,
  ok: status < 400,
  json: async () => body,
  text: async () => body,
});

beforeEach(resetOpsEvents);

describe("site et comptes", () => {
  it("site : vraie page du serveur, le mode maintenance n'est pas une panne", async () => {
    const urls = [];
    const p = sondes({
      fetchFn: async (u) => {
        urls.push(u);
        return reponse(503);
      },
    });
    expect((await p.site()).result).toBe("ok");
    expect(urls).toEqual(["http://127.0.0.1:1234/"]);
    const panne = sondes({ fetchFn: async () => reponse(500) });
    expect(await panne.site()).toMatchObject({
      result: "fail",
      detail: "HTTP 500",
    });
  });

  it("connexion aux comptes : santé de Supabase Auth avec la clé publique", async () => {
    let vu;
    const p = sondes({
      fetchFn: async (u, o) => {
        vu = [u, o.headers.apikey];
        return reponse(200);
      },
    });
    expect((await p.auth()).result).toBe("ok");
    expect(vu).toEqual(["http://sb.test/auth/v1/health", "cle"]);
  });

  it.each([
    [{ size_bytes: 5e7, connections: 11, max_connections: 60 }, "ok"],
    [
      { size_bytes: 6.5 * 1024 ** 3, connections: 1, max_connections: 60 },
      "warn",
    ],
    [
      { size_bytes: 8 * 1024 ** 3, connections: 1, max_connections: 60 },
      "fail",
    ],
    [{ size_bytes: 5e7, connections: 45, max_connections: 60 }, "warn"],
    [{ size_bytes: 5e7, connections: 55, max_connections: 60 }, "fail"],
  ])("capacité de la base %#", async (row, attendu) => {
    const p = sondes({
      db: () => ({ rpc: async () => ({ data: [row], error: null }) }),
    });
    expect((await p.database()).result).toBe(attendu);
  });

  it.each([
    [300, "ok"],
    [3500, "warn"],
    [5000, "fail"],
  ])("base qui répond en %i ms : %s", async (ms, attendu) => {
    vi.useFakeTimers();
    try {
      const p = sondes({
        db: () => ({
          from: () => ({
            select: () => ({
              limit: () => ({
                abortSignal: () =>
                  new Promise((r) => setTimeout(() => r({ error: null }), ms)),
              }),
            }),
          }),
        }),
      });
      const mesure = p.db();
      await vi.advanceTimersByTimeAsync(ms);
      expect((await mesure).result).toBe(attendu);
    } finally {
      vi.useRealTimers();
    }
  });

  it("capacité de la base : fonction absente ou réponse vide = échec", async () => {
    const absente = sondes({
      db: () => ({ rpc: async () => ({ error: { message: "introuvable" } }) }),
    });
    expect(await absente.database()).toMatchObject({
      result: "fail",
      detail: "introuvable",
    });
    const vide = sondes({ db: () => ({ rpc: async () => ({ data: [] }) }) });
    expect((await vide.database()).result).toBe("fail");
  });
});

describe("temps réel", () => {
  it("fait la poignée de main puis referme la session", async () => {
    const appels = [];
    const p = sondes({
      fetchFn: async (u, o) => {
        appels.push([o.method ?? "GET", u]);
        return reponse(200, '0{"sid":"abc","pingInterval":25000}');
      },
    });
    expect((await p.realtime()).result).toBe("ok");
    expect(appels[0][0]).toBe("GET");
    expect(appels[1][0]).toBe("POST");
    expect(appels[1][1]).toContain("sid=abc");
  });

  it.each([
    ["réponse illisible", reponse(200, "pas du json")],
    ["sans session", reponse(200, "0{}")],
    ["serveur en erreur", reponse(500)],
  ])("%s : échec", async (_, res) => {
    const p = sondes({ fetchFn: async () => res });
    expect((await p.realtime()).result).toBe("fail");
  });
});

describe("Deezer", () => {
  it.each([
    ["quota atteint : lent, pas en panne", { error: { code: 4 } }, "warn"],
    ["autre refus", { error: { code: 800, message: "x" } }, "fail"],
    ["titre rendu", { id: 3135556 }, "ok"],
  ])("%s", async (_, body, attendu) => {
    const p = sondes({ fetchFn: async () => reponse(200, body) });
    expect((await p.deezer()).result).toBe(attendu);
  });
});

describe("Wikidata", () => {
  it("répond : ok, en se présentant ; en erreur : échec", async () => {
    const appels = [];
    const ok = sondes({
      fetchFn: async (url, opts) => {
        appels.push(opts.headers);
        return reponse(200);
      },
    });
    expect((await ok.wikidata()).result).toBe("ok");
    expect(appels[0]["User-Agent"]).toMatch(/ZIK/);
    const ko = sondes({ fetchFn: async () => reponse(503) });
    expect((await ko.wikidata()).result).toBe("fail");
  });
});

describe("Spotify", () => {
  it("un 401 sans jeton veut dire que l'API répond ; un 503 non", async () => {
    expect(
      (await sondes({ fetchFn: async () => reponse(401) }).spotify()).result,
    ).toBe("ok");
    expect(
      (await sondes({ fetchFn: async () => reponse(503) }).spotify()).result,
    ).toBe("fail");
  });
});

describe("paiements", () => {
  const env = { STRIPE_SECRET_KEY: "sk_test" };
  const vide = async () => ({ data: [] });

  it("sans clé : rien à signaler hors prod, à corriger en prod", async () => {
    expect((await sondes({ env: {} }).stripe()).result).toBe("ok");
    const prod = sondes({
      env: { RAILWAY_ENVIRONMENT_NAME: "[PROD] - Production" },
    });
    expect(await prod.stripe()).toMatchObject({
      result: "warn",
      detail: "Non configuré",
    });
  });

  it("Stripe injoignable : échec, retenté au passage suivant", async () => {
    let appels = 0;
    const p = sondes({
      env,
      undelivered: async () => {
        appels++;
        throw new Error("api down");
      },
    });
    expect(await p.stripe(NOW)).toMatchObject({
      result: "fail",
      detail: "api down",
    });
    await p.stripe(NOW + 60_000);
    expect(appels).toBe(2);
  });

  it("non livrés : un seul alerte, trois font une panne, livrés ça repart", async () => {
    const QUART = 15 * 60 * 1000;
    let data = [{ id: "a" }];
    const p = sondes({ env, undelivered: async () => ({ data }) });
    expect(await p.stripe(NOW)).toMatchObject({
      result: "warn",
      detail: "Événements Stripe non livrés (webhook) : 1",
    });
    data = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(await p.stripe(NOW + QUART)).toMatchObject({
      result: "fail",
      detail: "Événements Stripe non livrés (webhook) : 3 ou plus",
    });
    data = [];
    const fin = await p.stripe(NOW + 2 * QUART);
    expect(fin.result).toBe("ok");
    expect(fin.detail).toBeUndefined();
  });

  it("Stripe interrogé au plus toutes les 15 min", async () => {
    const dates = [];
    const p = sondes({
      env,
      undelivered: async (t) => {
        dates.push(t);
        return { data: [] };
      },
    });
    await p.stripe(NOW);
    await p.stripe(NOW + 14 * 60 * 1000);
    await p.stripe(NOW + 15 * 60 * 1000);
    expect(dates).toEqual([NOW, NOW + 15 * 60 * 1000]);
  });

  it("signature refusée : information pour l'admin, le niveau ne bouge pas", async () => {
    const p = sondes({ env, undelivered: vide });
    noteEvent("stripe_bad_signature");
    expect(await p.stripe(NOW)).toMatchObject({
      result: "ok",
      detail: "1 signature refusée en 1 h",
    });
  });

  it("l'appel réel demande les non livrés, avec un délai court", async () => {
    const list = vi.fn(async () => ({ data: [] }));
    vi.resetModules();
    vi.doMock("../../../stripe.js", () => ({
      WEBHOOK_EVENTS: ["a"],
      getStripe: () => ({ events: { list } }),
    }));
    const { makeProbes: frais } = await import("../probes.js");
    await frais({ loop, log: [], env }).stripe(NOW);
    vi.doUnmock("../../../stripe.js");
    const [params, options] = list.mock.calls[0];
    expect(params).toMatchObject({ delivery_success: false, types: ["a"] });
    expect(params.created.lte).toBeLessThan(NOW / 1000 - 14 * 60);
    expect(options).toEqual({ timeout: 5000, maxNetworkRetries: 0 });
  });
});

describe("notifications et sauvegardes", () => {
  it("notifications : clés présentes ou non", async () => {
    expect((await sondes({ env: {} }).push()).detail).toBe("Non configuré");
    const ok = sondes({
      env: { PUBLIC_VAPID_KEY: "a", VAPID_PRIVATE_KEY: "b" },
    });
    expect(await ok.push()).toEqual({ result: "ok" });
  });

  it("sauvegarde des soirées : un échec isolé passe, deux alertent, cinq font un échec franc", async () => {
    const p = sondes();
    expect((await p.snapshots()).result).toBe("ok");
    noteEvent("snapshot_failed");
    expect(await p.snapshots()).toMatchObject({ result: "ok", value: 1 });
    noteEvent("snapshot_failed");
    expect(await p.snapshots()).toMatchObject({ result: "warn", value: 2 });
    for (let i = 0; i < 3; i++) noteEvent("snapshot_failed");
    expect((await p.snapshots()).result).toBe("fail");
  });
});

describe("journal d'événements", () => {
  it("compte par fenêtre, oublie après 24 h, reste borné", () => {
    noteEvent("x", NOW - 25 * 60 * 60 * 1000);
    noteEvent("x", NOW - 2 * 60 * 60 * 1000);
    noteEvent("x", NOW);
    expect(countSince("x", 60 * 60 * 1000, NOW)).toBe(1);
    expect(countSince("x", 48 * 60 * 60 * 1000, NOW)).toBe(2);
    for (let i = 0; i < 2100; i++) noteEvent("y", NOW);
    expect(countSince("y", 1000, NOW)).toBe(2000);
  });
});
