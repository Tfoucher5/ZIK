import { describe, it, expect, beforeEach, vi } from "vitest";

const rpcCalls = [];
const pushes = [];
const mails = [];
let rpcError = null;
vi.mock("../../../config.js", () => ({
  getAdminClient: () => ({
    rpc: async (fn, args) => {
      rpcCalls.push([fn, args]);
      return { error: rpcError };
    },
  }),
}));
vi.mock("../../admin/alerts.js", () => ({
  alertAdminsSafe: (kind, payload, opts) =>
    pushes.push({ kind, ...payload, ...opts }),
}));
vi.mock("../../../mail/send.js", () => ({
  ADMIN_EMAIL: "admin@test",
  sendMail: async (m) => mails.push(m),
}));

const {
  runChecks,
  healthState,
  alertChange,
  flushErrors,
  resetHealth,
  healthz,
} = await import("../monitor.js");
const { makeProbes } = await import("../probes.js");

const sonde = (...results) => {
  let i = 0;
  return async () => ({ result: results[Math.min(i++, results.length - 1)] });
};

describe("moniteur de santé", () => {
  beforeEach(() => {
    resetHealth();
    rpcCalls.length = pushes.length = mails.length = 0;
    rpcError = null;
  });

  it("enregistre tout au premier passage, puis seulement les changements", async () => {
    const recorded = [];
    const probes = { db: sonde("ok"), deezer: sonde("ok", "fail") };
    const record = async (rows) => recorded.push(rows);
    await runChecks({ probes, record, alert: () => {}, now: 1_000_000 });
    expect(recorded[0].map((r) => r.probe)).toEqual(["db", "deezer"]);
    await runChecks({ probes, record, alert: () => {}, now: 1_060_000 });
    expect(recorded[1]).toEqual([
      { probe: "deezer", level: "suspect", value: null, detail: null },
    ]);
    // 5 minutes après : un point pour chaque sonde
    await runChecks({ probes, record, alert: () => {}, now: 1_300_000 });
    expect(recorded[2]).toHaveLength(2);
  });

  it("trois échecs de suite : incident, l'état global le montre", async () => {
    const probes = { youtube: sonde("fail") };
    const changes = [];
    for (let i = 0; i < 3; i++)
      changes.push(
        ...(await runChecks({
          probes,
          record: async () => {},
          alert: () => {},
        })),
      );
    expect(changes.map((c) => c.to)).toEqual(["suspect", "incident"]);
    expect(healthState().level).toBe("incident");
  });

  it("une sonde qui plante compte comme un échec, sans casser les autres", async () => {
    const probes = {
      casse: async () => {
        throw new Error("boum");
      },
      db: sonde("ok"),
    };
    await runChecks({ probes, record: async () => {}, alert: () => {} });
    expect(healthState().probes.casse).toMatchObject({
      level: "suspect",
      detail: "boum",
    });
    expect(healthState().probes.db.level).toBe("ok");
  });

  it("alertes : push à chaque aggravation, mail pour un incident et son rétablissement", () => {
    alertChange({ name: "db", from: "ok", to: "suspect", detail: "lent" });
    alertChange({ name: "db", from: "suspect", to: "incident", detail: "HS" });
    alertChange({ name: "db", from: "incident", to: "ok" });
    alertChange({ name: "deezer", from: "suspect", to: "ok" });
    expect(pushes.map((p) => p.title)).toEqual([
      "À surveiller : Base de données",
      "Incident : Base de données",
      "Rétabli : Base de données",
    ]);
    expect(mails.map((m) => m.subject)).toEqual([
      "[ZIK] Incident : Base de données",
      "[ZIK] Rétabli : Base de données",
    ]);
  });

  it("une sonde qui oscille n'envoie pas un mail à chaque incident", () => {
    alertChange({ name: "youtube", from: "suspect", to: "incident" });
    alertChange({ name: "youtube", from: "incident", to: "ok" });
    alertChange({ name: "youtube", from: "suspect", to: "incident" });
    // Incident et rétablissement envoyés, le 2e incident retenu
    expect(mails.map((m) => m.subject)).toEqual([
      "[ZIK] Incident : YouTube",
      "[ZIK] Rétabli : YouTube",
    ]);
    // Le push, lui, est limité par alertAdmins (throttleMs)
    expect(pushes.every((p) => p.throttleMs === 10 * 60 * 1000)).toBe(true);
  });

  it("base en incident : /healthz répond 503 ; YouTube en panne : 200", async () => {
    const probes = { db: sonde("fail"), youtube: sonde("fail") };
    for (let i = 0; i < 3; i++)
      await runChecks({ probes, record: async () => {}, alert: () => {} });
    let head;
    healthz({ writeHead: (s) => (head = s), end() {} });
    expect(head).toBe(503);
    resetHealth();
    for (let i = 0; i < 3; i++)
      await runChecks({
        probes: { db: sonde("ok"), youtube: sonde("fail") },
        record: async () => {},
        alert: () => {},
      });
    healthz({ writeHead: (s) => (head = s), end() {} });
    expect(head).toBe(200);
  });

  it("base en panne : l'écriture ne lève pas et n'avertit qu'une fois", async () => {
    rpcError = { message: "connexion refusée" };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = [{ ts: Date.now() + 10, level: "error", msg: "x" }];
    await flushErrors(log);
    await flushErrors([{ ts: Date.now() + 20, level: "error", msg: "y" }]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("/healthz répond l'état global", async () => {
    await runChecks({
      probes: { db: sonde("ok") },
      record: async () => {},
      alert: () => {},
    });
    let head;
    let body;
    healthz({
      writeHead: (s) => (head = s),
      end: (b) => (body = JSON.parse(b)),
    });
    expect(head).toBe(200);
    expect(body.status).toBe("ok");
  });
});

describe("sondes", () => {
  const loop = { enable() {}, reset() {}, percentile: () => 250e6 };
  const base = {
    loop,
    log: [],
    rooms: { A: {}, B: {} },
    sockets: () => 12,
    memory: () => 800 * 1048576,
    memoryLimit: () => 1000 * 1048576,
    db: () => ({
      from: () => ({
        select: () => ({ limit: async () => ({ error: null }) }),
      }),
    }),
  };

  it("Deezer qui répond 200 avec une erreur compte comme un échec", async () => {
    const p = makeProbes({
      ...base,
      fetchFn: async () => ({
        ok: true,
        json: async () => ({ error: { message: "Quota" } }),
      }),
    });
    expect(await p.deezer()).toMatchObject({ result: "fail", detail: "Quota" });
  });

  it("YouTube injoignable : échec", async () => {
    const p = makeProbes({
      ...base,
      fetchFn: async () => {
        throw new Error("fetch failed");
      },
    });
    expect(await p.youtube()).toMatchObject({
      result: "fail",
      detail: "fetch failed",
    });
  });

  it("boucle d'événements à 250 ms, mémoire à 80 %, salons comptés", async () => {
    const p = makeProbes({ ...base, fetchFn: fetch });
    expect(await p.eventLoop()).toMatchObject({ result: "warn", value: 250 });
    expect(await p.memory()).toMatchObject({ result: "warn", value: 800 });
    expect(await p.load()).toMatchObject({
      result: "ok",
      value: 2,
      detail: "12 connexions",
    });
    expect(await p.db()).toMatchObject({ result: "ok" });
  });
});
