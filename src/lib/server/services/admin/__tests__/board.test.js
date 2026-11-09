import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null, calls: 0, maintenance: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../../../maintenance.js", () => ({
  getMaintenance: async () => m.maintenance,
}));
vi.mock("../../../socket/salon/support.js", () => ({
  openSupportCount: () => m.calls,
}));

const { liveCounts, getTodo, getJournal } = await import("../board.js");

let rows;
const saved = {};

beforeEach(() => {
  rows = {};
  m.calls = 0;
  m.maintenance = null;
  m.db = fakeQuery((q) => rows[q.table]?.(q));
  for (const k of ["__zik_roomGames", "__zik_salonRooms", "__zik_errorLog"])
    saved[k] = globalThis[k];
});
afterEach(() => Object.assign(globalThis, saved));

describe("compteurs en direct", () => {
  it("rooms vides ignorées, joueurs des rooms et salons additionnés", () => {
    globalThis.__zik_roomGames = {
      A: { socketToName: { s1: "a", s2: "b" } },
      B: { socketToName: {} },
      C: {},
    };
    globalThis.__zik_salonRooms = { X: { players: { p: {} } }, Y: {} };
    m.calls = 2;
    expect(liveCounts()).toEqual({ rooms: 1, salons: 2, calls: 2, players: 3 });
  });

  it("aucun état en mémoire : tout à zéro", () => {
    globalThis.__zik_roomGames = undefined;
    globalThis.__zik_salonRooms = undefined;
    expect(liveCounts()).toEqual({ rooms: 0, salons: 0, calls: 0, players: 0 });
  });
});

describe("à faire", () => {
  it("rien à signaler : liste vide", async () => {
    globalThis.__zik_errorLog = [];
    expect(await getTodo()).toEqual({ items: [], issues: 0 });
  });

  it("classe les urgences et accorde les libellés au pluriel", async () => {
    m.calls = 1;
    m.maintenance = { enabled: true };
    const counts = {
      pro_subscriptions: 2,
      track_issues: 1,
      reports: 3,
      prospect_replies: 1,
    };
    for (const [t, count] of Object.entries(counts))
      rows[t] = () => ({ count });
    rows.games = () => ({ data: [{ limit_hits: 2 }, { limit_hits: 3 }] });
    const now = Date.now();
    globalThis.__zik_errorLog = [
      { ts: now, level: "error" },
      { ts: now, level: "warn" },
      { ts: now - 2 * 86400000, level: "error" },
    ];
    const { items, issues } = await getTodo();
    expect(issues).toBe(1);
    expect(items.map((i) => i.key)).toEqual([
      "calls",
      "maintenance",
      "past_due",
      "replies",
      "issues",
      "reports",
      "errors",
      "limit",
    ]);
    const label = Object.fromEntries(items.map((i) => [i.key, i.label]));
    expect(label.calls).toBe("1 salon appelle un admin");
    expect(label.past_due).toBe("2 abonnés Pro en échec de paiement");
    expect(label.replies).toBe("1 prospect intéressé attend ta réponse");
    expect(label.errors).toBe("1 erreur serveur depuis 24 h");
    expect(items.find((i) => i.key === "limit").n).toBe(5);
  });

  it("compte absent (requête en échec) : traité comme zéro", async () => {
    globalThis.__zik_errorLog = [];
    rows.reports = () => ({ count: null, error: { message: "panne" } });
    rows.games = () => ({ data: null });
    expect((await getTodo()).items).toEqual([]);
  });
});

describe("journal", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
    rows.profiles = (q) =>
      q.has("in")
        ? {
            data: [
              { id: "h1", username: "bar" },
              { id: "p1", username: "camping" },
            ],
          }
        : {
            data: [
              { id: "u1", username: "lea", created_at: "2026-11-09T10:00:00Z" },
            ],
          };
    rows.pro_subscriptions = () => ({
      data: [
        {
          user_id: "p1",
          plan: "yearly",
          status: "active",
          created_at: "2026-11-09T09:00:00Z",
          updated_at: "x",
        },
        {
          user_id: "zz",
          status: "past_due",
          updated_at: "2026-11-09T08:00:00Z",
        },
        {
          user_id: "p1",
          status: "canceled",
          updated_at: "2026-11-09T07:00:00Z",
        },
      ],
    });
    rows.games = () => ({
      data: [
        {
          host_id: "h1",
          player_count: 12,
          limit_hits: 1,
          ended_at: "2026-11-09T11:00:00Z",
        },
        { host_id: null, player_count: 1, ended_at: "2026-11-09T06:00:00Z" },
      ],
    });
    rows.reports = () => ({
      data: [
        {
          type: "bug",
          subject: "son",
          reporter_name: "max",
          created_at: "2026-11-09T05:00:00Z",
        },
      ],
    });
    rows.track_issues = () => ({
      data: [
        {
          kind: "video",
          track: { artist: "A", title: "T" },
          created_at: "2026-11-09T04:00:00Z",
        },
        { kind: "audio", track: null, created_at: "2026-11-09T04:00:00Z" },
      ],
    });
    rows.prospect_replies = () => ({
      data: [
        {
          from_email: "b@c.fr",
          summary: "ok",
          received_at: "2026-11-09T03:00:00Z",
        },
      ],
    });
  });

  it("événements datés, du plus récent au plus ancien, avec leur texte", async () => {
    const ev = await getJournal();
    expect(ev.map((e) => e.text)).toEqual([
      "Salon de bar terminé : 12 joueurs, 1 refusé par la limite",
      "lea s'est inscrit",
      "camping est passé Pro (Annuel)",
      "Paiement refusé pour un abonné",
      "camping a résilié son Pro",
      "Salon de un invité terminé : 1 joueur",
      "Bug signalé (son) par max",
      "Problème vidéo salon : A · T",
      "Réponse de prospect (b@c.fr) : ok",
    ]);
    expect(ev[5].href).toBe("/admin/salons");
    expect(m.db.of("profiles")[1].args("in")[1].sort()).toEqual([
      "h1",
      "p1",
      "zz",
    ]);
  });

  it("borne le nombre d'événements", async () => {
    expect(await getJournal(2, 3)).toHaveLength(3);
  });

  it("base vide : journal vide sans requête de profils", async () => {
    rows = {};
    expect(await getJournal()).toEqual([]);
    expect(m.db.of("profiles")).toHaveLength(1);
  });
});
