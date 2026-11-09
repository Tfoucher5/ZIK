import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetFake } from "./fakeSupabase.js";

const h = vi.hoisted(() => ({}));
vi.mock("../../config.js", async () => {
  const { fakeClient } = await import("./fakeSupabase.js");
  const c = fakeClient(h);
  return { supabase: c, getAdminClient: () => c };
});

const w = await import("../weeklyChallenge.js");

const ok = (data) => ({ data, error: null });
const KO = { data: null, error: { message: "panne" } };
const contrib = (name, amount, prive = false) => ({
  user_id: name,
  amount,
  profiles: { username: name, avatar_url: `${name}.png`, is_private: prive },
});
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetFake(h);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("défi courant", () => {
  it("ajoute libellé et unité du type", async () => {
    h.rpcs.pick_weekly_challenge = ok([
      { id: 1, type: "games_played", target: 300 },
    ]);
    expect(await w.getOrCreateWeeklyChallenge()).toEqual({
      id: 1,
      type: "games_played",
      target: 300,
      label: "Parties jouées",
      unit: "parties",
    });
  });
  it.each([
    ["aucune ligne", ok([])],
    ["erreur RPC", KO],
  ])("null : %s", async (_, r) => {
    h.rpcs.pick_weekly_challenge = r;
    expect(await w.getOrCreateWeeklyChallenge()).toBeNull();
  });
  it("type inconnu : ligne rendue sans libellé", async () => {
    h.rpcs.pick_weekly_challenge = ok([{ id: 1, type: "zzz" }]);
    expect(await w.getOrCreateWeeklyChallenge()).toEqual({
      id: 1,
      type: "zzz",
    });
  });

  it("état homepage : top 3 sans profils privés ni is_private exposé", async () => {
    h.rpcs.pick_weekly_challenge = ok([{ id: 7, type: "zikle_wins" }]);
    h.tables.weekly_challenge_contributions = ok([
      contrib("a", 9),
      contrib("cache", 8, true),
      contrib("b", 7),
      contrib("c", 6),
      contrib("d", 5),
    ]);
    const s = await w.getWeeklyChallengeState();
    expect(s.top.map((r) => r.profiles.username)).toEqual(["a", "b", "c"]);
    expect(s.top[0].profiles).toEqual({ username: "a", avatar_url: "a.png" });
    expect(h.calls.at(-1).has("eq", "challenge_id", 7)).toBe(true);
  });
  it("état homepage : contributions en panne → top vide", async () => {
    h.rpcs.pick_weekly_challenge = ok([{ id: 7, type: "zikle_wins" }]);
    h.tables.weekly_challenge_contributions = () => {
      throw new Error("x");
    };
    expect((await w.getWeeklyChallengeState()).top).toEqual([]);
  });
  it("état homepage : pas de défi → null", async () => {
    h.rpcs.pick_weekly_challenge = ok([]);
    expect(await w.getWeeklyChallengeState()).toBeNull();
  });
});

describe("classements et archives", () => {
  it("classement complet : profils privés retirés, profil absent gardé à null", async () => {
    h.tables.weekly_challenge_contributions = ok([
      contrib("a", 3),
      contrib("x", 2, true),
      { user_id: "sans", amount: 1, profiles: null },
    ]);
    expect(await w.getWeeklyChallengeFullRanking(1)).toEqual([
      {
        user_id: "a",
        amount: 3,
        profiles: { username: "a", avatar_url: "a.png" },
      },
      { user_id: "sans", amount: 1, profiles: null },
    ]);
  });
  it("classement en panne : []", async () => {
    h.tables.weekly_challenge_contributions = () => {
      throw new Error("x");
    };
    expect(await w.getWeeklyChallengeFullRanking(1)).toEqual([]);
  });

  it("archives : semaines closes, meilleur contributeur privé masqué", async () => {
    h.tables.weekly_challenges = ok([
      {
        id: 1,
        type: "correct_answers",
        top_contributor: { username: "p", is_private: true },
      },
      {
        id: 2,
        type: "games_played",
        top_contributor: { username: "q", is_private: false },
      },
    ]);
    const a = await w.getWeeklyChallengeArchives(10);
    expect(a.map((r) => r.top_contributor)).toEqual([
      null,
      { username: "q", is_private: false },
    ]);
    expect(a[0].label).toBe("Bonnes réponses");
    const q = h.calls[0];
    expect(q.has("neq", "status", "active") && q.has("limit", 10)).toBe(true);
  });
  it("archives en panne : []", async () => {
    h.tables.weekly_challenges = () => {
      throw new Error("x");
    };
    expect(await w.getWeeklyChallengeArchives()).toEqual([]);
  });

  it("semaine précise : défi et classement", async () => {
    h.tables.weekly_challenges = ok({
      id: 4,
      type: "games_played",
      week_start: "2026-11-02",
    });
    h.tables.weekly_challenge_contributions = ok([contrib("a", 1)]);
    const r = await w.getWeeklyChallengeByWeekStart("2026-11-02");
    expect(r).toMatchObject({
      id: 4,
      unit: "parties",
      ranking: [{ user_id: "a" }],
    });
  });
  it.each([
    ["introuvable", KO],
    [
      "exception",
      () => {
        throw new Error("x");
      },
    ],
  ])("semaine précise %s : null", async (_, r) => {
    h.tables.weekly_challenges = r;
    expect(await w.getWeeklyChallengeByWeekStart("2026-11-02")).toBeNull();
  });
});

describe("bumpWeeklyChallenge : fire-and-forget", () => {
  it("envoie l'incrément sans renvoyer de promesse", async () => {
    h.rpcs.increment_weekly_challenge = ok(null);
    expect(w.bumpWeeklyChallenge("games_played", "u1", 2)).toBeUndefined();
    await flush();
    expect(h.calls).toEqual([
      {
        rpc: "increment_weekly_challenge",
        args: { p_type: "games_played", p_user_id: "u1", p_amount: 2 },
      },
    ]);
  });
  it.each([
    [null, 1],
    ["u1", 0],
    ["u1", -3],
  ])("ignoré : user %s, montant %i", (user, amount) => {
    w.bumpWeeklyChallenge("games_played", user, amount);
    expect(h.calls).toEqual([]);
  });
  it("erreur et rejet absorbés, journalisés", async () => {
    h.rpcs.increment_weekly_challenge = KO;
    w.bumpWeeklyChallenge("games_played", "u1");
    await flush();
    h.rpcs.increment_weekly_challenge = () => {
      throw new Error("réseau");
    };
    w.bumpWeeklyChallenge("games_played", "u1");
    await flush();
    expect(console.error).toHaveBeenCalledWith("bumpWeeklyChallenge:", "panne");
    expect(console.error).toHaveBeenCalledWith(
      "bumpWeeklyChallenge:",
      "réseau",
    );
  });
});
