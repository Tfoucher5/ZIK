import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({
  db: null,
  keys: null,
  sent: null,
  challenge: null,
  archives: [],
  news: [],
  played: [],
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));
vi.mock("../push.js", () => ({
  firstTime: async (key) => (m.keys.has(key) ? false : !!m.keys.add(key)),
  pushToAll: async (category, payload, opts) => {
    m.sent.push({ category, payload, skip: opts?.skip });
    return 7;
  },
}));
vi.mock("../../weeklyChallenge.js", () => ({
  getOrCreateWeeklyChallenge: async () => m.challenge,
  getWeeklyChallengeArchives: async () => m.archives,
}));
vi.mock("../../../../data/news.js", () => ({
  get NEWS() {
    return m.news;
  },
}));

const { startPushSchedule } = await import("../pushSchedule.js");

// Novembre : Paris = UTC+1. Le 09/11/2026 est un lundi, le 15 un dimanche.
const paris = (day, hour) =>
  new Date(`2026-11-${day}T${String(hour - 1).padStart(2, "0")}:00:00Z`);
const tags = () => m.sent.map((s) => s.payload.tag);

async function runAt(day, hour) {
  vi.setSystemTime(paris(day, hour));
  startPushSchedule();
  await vi.advanceTimersByTimeAsync(90_000);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  m.keys = new Set();
  m.sent = [];
  m.archives = [];
  m.played = [];
  m.challenge = {
    week_start: "2026-11-09",
    target: 5000,
    current_value: 1200,
    unit: "bonnes réponses",
  };
  m.news = [{ version: "3.26.0", tag: "Correctif", title: "x" }];
  m.db = fakeQuery(() => ({ data: m.played }));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("envois planifiés (heure de Paris)", () => {
  it("lundi 10 h : défi de la semaine, une seule fois malgré les passages suivants", async () => {
    await runAt("09", 10);
    expect(tags()).toEqual(["challenge:2026-11-09"]);
    expect(m.sent[0].payload.body).toBe(
      "Cette semaine : 5 000 bonnes réponses à atteindre ensemble.",
    );
    await vi.advanceTimersByTimeAsync(5 * 60_000 * 3);
    expect(m.sent).toHaveLength(1);
  });

  it("défi : rappel du résultat de la semaine passée", async () => {
    m.archives = [{ status: "success" }];
    await runAt("09", 9);
    expect(m.sent[0].payload.body).toMatch(
      /^Défi de la semaine dernière réussi/,
    );
    m.keys.clear();
    m.sent = [];
    m.archives = [{ status: "failed" }];
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(m.sent[0].payload.body).toMatch(/^Défi de la semaine dernière raté/);
  });

  it("lundi 8 h ou 12 h : hors fenêtre, pas de défi", async () => {
    await runAt("09", 8);
    vi.clearAllTimers();
    await runAt("09", 12);
    expect(tags()).not.toContain("challenge:2026-11-09");
  });

  it("pas de défi cette semaine : rien", async () => {
    m.challenge = null;
    await runAt("09", 10);
    vi.clearAllTimers();
    await runAt("15", 18);
    expect(tags().filter((t) => t.startsWith("challenge"))).toEqual([]);
  });

  it("dimanche 19 h : dernier jour du défi et Zikle, sauf pour qui a joué", async () => {
    m.played = [{ user_id: "u1" }, { user_id: "u2" }];
    await runAt("15", 19);
    expect(tags().sort()).toEqual(["challenge:2026-11-09", "zikle:2026-11-15"]);
    const last = m.sent.find((s) => s.category === "challenge").payload;
    expect(last.title).toBe("Dernier jour du défi");
    expect(last.body).toContain("3 800");
    const zikle = m.sent.find((s) => s.category === "zikle");
    expect([...zikle.skip]).toEqual(["u1", "u2"]);
    expect(m.db.of("daily_results")[0].args("eq")).toEqual([
      "date",
      "2026-11-15",
    ]);
  });

  it("dimanche, défi déjà atteint : message de victoire", async () => {
    m.challenge.current_value = 6000;
    await runAt("15", 18);
    const last = m.sent.find((s) => s.category === "challenge").payload;
    expect(last.title).toBe("Défi réussi 🎉");
  });

  it("nuit : aucun envoi, même après un redémarrage tardif", async () => {
    m.news = [
      { version: "3.26.0", tag: "Nouveauté", title: "x", items: ["a"] },
    ];
    await runAt("09", 3);
    vi.clearAllTimers();
    await runAt("09", 21);
    expect(m.sent).toEqual([]);
  });

  it("nouvelle version en journée : annoncée une fois ; correctif : jamais", async () => {
    await runAt("10", 14);
    expect(m.sent).toEqual([]);
    m.news = [
      { version: "3.27.0", tag: "Nouveauté", title: "Cartes", items: ["a"] },
    ];
    await vi.advanceTimersByTimeAsync(5 * 60_000 * 2);
    expect(m.sent).toHaveLength(1);
    expect(m.sent[0]).toMatchObject({
      category: "updates",
      payload: { tag: "release" },
    });
  });

  it("un envoi en panne n'empêche pas les autres", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    m.challenge = {
      get week_start() {
        throw new Error("défi KO");
      },
    };
    await runAt("15", 19);
    expect(tags()).toEqual(["zikle:2026-11-15"]);
    expect(err).toHaveBeenCalledWith("[push] envoi planifié :", "défi KO");
  });

  it("Zikle lu sans résultat (base vide) : envoi sans exclusion", async () => {
    m.played = null;
    await runAt("10", 18);
    expect(m.sent[0].skip.size).toBe(0);
  });
});
