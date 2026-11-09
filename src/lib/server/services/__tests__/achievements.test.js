import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetFake } from "./fakeSupabase.js";

const h = vi.hoisted(() => ({}));
vi.mock("../../config.js", async () => {
  const { fakeClient } = await import("./fakeSupabase.js");
  const c = fakeClient(h);
  return { supabase: c, getAdminClient: () => c };
});

const { checkAchievements, saveGameResult } =
  await import("../achievements.js");

const once = (id, rarity) => ({ id, type: "one_time", name: id, rarity });
const bronze = (id, target) => ({
  id,
  type: "tiered",
  name: id,
  tiers: [{ level: "bronze", target }],
});
const DEFS = [
  once("first_win", "common"),
  once("big_game", "rare"),
  once("perfect_game", "epic"),
  once("early_adopter", "rare"),
  {
    id: "games_played",
    type: "tiered",
    name: "Habitué",
    rarity: "common",
    tiers: [
      { level: "gold", target: 100, rarity: "legendary" },
      { level: "bronze", target: 10 },
      { level: "silver", target: 50 },
    ],
  },
  bronze("wins_count", 5),
  bronze("podium_count", 3),
  bronze("streak_days", 7),
  bronze("win_streak", 3),
  once("inconnu"), // succès en base sans logique dans le code
];

let t = Date.parse("2026-11-09T12:00:00Z");
let profile, owned, wins, podiums, streak, upsertError;

function setup() {
  h.tables.achievements = { data: DEFS, error: null };
  h.tables.profiles = () => ({ data: profile, error: null });
  h.tables.user_achievements = (q) =>
    q.has("upsert") ? { error: upsertError } : { data: owned, error: null };
  h.tables.game_players = (q) => ({
    count: q.has("eq", "rank", 1) ? wins : podiums,
  });
  h.rpcs.update_player_streaks = () => ({ data: streak ? [streak] : [] });
}

const game = (o = {}) => ({
  score: 10,
  rank: 2,
  totalPlayers: 4,
  correctRounds: 3,
  totalRounds: 10,
  ...o,
});
const saved = () =>
  h.calls
    .find((q) => q.table === "user_achievements" && q.has("upsert"))
    ?.ops.find(([o]) => o === "upsert");
const ids = (r) => r.map((u) => `${u.id}:${u.tier ?? ""}`);

beforeEach(() => {
  resetFake(h);
  vi.useFakeTimers();
  t += 11 * 60_000; // cache des définitions (10 min) expiré à chaque test
  vi.setSystemTime(t);
  profile = {
    total_score: 0,
    games_played: 1,
    created_at: "2026-09-01T00:00:00Z",
  };
  owned = [];
  wins = 0;
  podiums = 0;
  streak = null;
  upsertError = null;
  setup();
});
afterEach(() => vi.useRealTimers());

describe("checkAchievements : seuils", () => {
  it("rien à débloquer : aucune écriture", async () => {
    expect(await checkAchievements("u1", game())).toEqual([]);
    expect(saved()).toBeUndefined();
  });

  it("victoire à 2 joueurs : first_win, streak notée gagnée", async () => {
    const r = await checkAchievements("u1", game({ rank: 1, totalPlayers: 2 }));
    expect(ids(r)).toEqual(["first_win:"]);
    expect(h.calls.find((c) => c.rpc)).toEqual({
      rpc: "update_player_streaks",
      args: { p_user_id: "u1", p_won: true },
    });
  });

  it("1er seul dans la partie : pas une victoire", async () => {
    expect(
      await checkAchievements("u1", game({ rank: 1, totalPlayers: 1 })),
    ).toEqual([]);
    expect(h.calls.find((c) => c.rpc).args.p_won).toBe(false);
  });

  it.each([
    [39, []],
    [40, ["big_game:"]],
  ])("big_game : score %i", async (score, attendu) => {
    expect(ids(await checkAchievements("u1", game({ score })))).toEqual(
      attendu,
    );
  });

  it.each([
    [{ correctRounds: 5, totalRounds: 5 }, ["perfect_game:"]],
    [{ correctRounds: 4, totalRounds: 4 }, []],
    [{ correctRounds: 9, totalRounds: 10 }, []],
  ])("perfect_game : %o", async (o, attendu) => {
    expect(ids(await checkAchievements("u1", game(o)))).toEqual(attendu);
  });

  it.each([
    ["2026-05-31T21:59:59Z", ["early_adopter:"]],
    ["2026-05-31T22:00:00Z", []],
    [null, []],
  ])(
    "précurseur : compte créé %s (coupure minuit Paris)",
    async (created_at, attendu) => {
      profile.created_at = created_at;
      expect(ids(await checkAchievements("u1", game()))).toEqual(attendu);
    },
  );

  it("paliers : tous ceux atteints, triés bronze → or, rareté du palier", async () => {
    profile.games_played = 100;
    const r = await checkAchievements("u1", game());
    expect(ids(r)).toEqual([
      "games_played:bronze",
      "games_played:silver",
      "games_played:gold",
    ]);
    expect(r[0].rarity).toBe("common");
    expect(r[2].rarity).toBe("legendary");
  });

  it("palier juste sous le seuil : non débloqué", async () => {
    profile.games_played = 49;
    expect(ids(await checkAchievements("u1", game()))).toEqual([
      "games_played:bronze",
    ]);
  });

  it("victoires, podiums et séries lus en base", async () => {
    wins = 5;
    podiums = 3;
    streak = { best_streak: 7, best_win_streak: 3 };
    expect(ids(await checkAchievements("u1", game())).sort()).toEqual([
      "podium_count:bronze",
      "streak_days:bronze",
      "win_streak:bronze",
      "wins_count:bronze",
    ]);
  });
});

describe("checkAchievements : pas de double attribution", () => {
  it("succès unique déjà possédé : ignoré", async () => {
    owned = [{ achievement_id: "big_game", tier: null }];
    expect(await checkAchievements("u1", game({ score: 80 }))).toEqual([]);
  });

  it("palier possédé ignoré, palier suivant attribué", async () => {
    profile.games_played = 50;
    owned = [{ achievement_id: "games_played", tier: "bronze" }];
    expect(ids(await checkAchievements("u1", game()))).toEqual([
      "games_played:silver",
    ]);
  });

  it("écriture idempotente côté base (ignoreDuplicates)", async () => {
    await checkAchievements("u1", game({ score: 40 }));
    const [, rows, opts] = saved();
    expect(rows).toEqual([
      { user_id: "u1", achievement_id: "big_game", tier: null },
    ]);
    expect(opts).toEqual({
      onConflict: "user_id,achievement_id,tier",
      ignoreDuplicates: true,
    });
  });
});

describe("checkAchievements : pannes silencieuses", () => {
  it("écriture refusée : rien annoncé au joueur", async () => {
    upsertError = { message: "refus" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkAchievements("u1", game({ score: 40 }))).toEqual([]);
  });

  it("profil introuvable : rien", async () => {
    profile = null;
    expect(await checkAchievements("u1", game({ score: 40 }))).toEqual([]);
  });

  it("aucune définition en base (migration absente) : rien, sans lire le profil", async () => {
    h.tables.achievements = { data: [], error: null };
    vi.resetModules();
    const neuf = await import("../achievements.js");
    expect(await neuf.checkAchievements("u1", game({ score: 40 }))).toEqual([]);
    expect(h.calls.some((q) => q.table === "profiles")).toBe(false);
  });

  it("RPC qui lève : rien, pas d'exception", async () => {
    h.rpcs.update_player_streaks = () => {
      throw new Error("table absente");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkAchievements("u1", game({ score: 40 }))).toEqual([]);
  });

  it("gameData absent : rien, pas d'exception", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await checkAchievements("u1", undefined)).toEqual([]);
  });

  it("définitions gardées en cache 10 min, même si la base tombe", async () => {
    await checkAchievements("u1", game());
    h.tables.achievements = { data: null, error: { message: "down" } };
    vi.setSystemTime(t + 5 * 60_000);
    expect(ids(await checkAchievements("u1", game({ score: 40 })))).toEqual([
      "big_game:",
    ]);
    vi.setSystemTime(t + 11 * 60_000);
    // Expiré et base en panne : on garde l'ancienne liste plutôt que rien
    expect(ids(await checkAchievements("u1", game({ score: 40 })))).toEqual([
      "big_game:",
    ]);
    expect(h.calls.filter((q) => q.table === "achievements")).toHaveLength(2);
  });
});

describe("saveGameResult", () => {
  const result = {
    gameId: "g1",
    username: "Léa",
    score: 30,
    rank: 1,
    totalPlayers: 3,
    roomName: "Rap",
  };

  it("insère et rend l'id", async () => {
    h.tables.game_results = { data: { id: "r1" }, error: null };
    expect(await saveGameResult(result)).toBe("r1");
    const insert = h.calls[0].ops.find(([o]) => o === "insert")[1];
    expect(insert).toEqual({
      game_id: "g1",
      user_id: null,
      username: "Léa",
      score: 30,
      rank: 1,
      total_players: 3,
      room_name: "Rap",
      room_emoji: null,
      achievement_ids: [],
    });
  });
  it("erreur de base : null", async () => {
    h.tables.game_results = { data: null, error: { message: "x" } };
    expect(await saveGameResult(result)).toBeNull();
  });
  it("exception : null", async () => {
    h.tables.game_results = () => {
      throw new Error("x");
    };
    expect(await saveGameResult(result)).toBeNull();
  });
});
