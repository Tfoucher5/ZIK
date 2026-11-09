import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({}));
vi.mock("../../config.js", async () =>
  (await import("./fakeQuery.js")).fakeClients(h),
);

const w = await import("../weeklyChallenge.js");

const ok = (data) => ({ data, error: null });
const KO = { data: null, error: { message: "panne" } };
const contrib = (name, amount, prive = false) => ({
  user_id: name,
  amount,
  profiles: { username: name, avatar_url: `${name}.png`, is_private: prive },
});

beforeEach(() => {
  h.reset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
// Défi et contributions : tout passe par le client admin, jamais l'anonyme
afterEach(() => {
  expect(h.anon.queries).toEqual([]);
  expect(h.anon.client.rpc).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("outils admin purs", () => {
  it("rotation automatique", () => {
    expect(w.nextAutoType("correct_answers")).toBe("games_played");
    expect(w.nextAutoType("zikle_wins")).toBe("correct_answers");
    expect(w.nextAutoType("cards_won")).toBe("correct_answers");
    expect(w.nextAutoType(undefined)).toBe("correct_answers");
  });
  it.each([
    ["2026-11-09", 0, "2026-11-09"], // lundi
    ["2026-11-15", 0, "2026-11-09"], // dimanche
    ["2026-11-11", 1, "2026-11-16"],
    ["2026-01-01", 0, "2025-12-29"], // changement d'année
    ["2026-03-29", 0, "2026-03-23"], // passage à l'heure d'été
    ["2026-11-10", -2, "2026-10-26"],
  ])("mondayOf(%s, %i) = %s", (d, n, attendu) => {
    expect(w.mondayOf(d, n)).toBe(attendu);
  });
  it("objectif suggéré : moyenne des 3 dernières semaines closes non nulles + 20 %", () => {
    const weeks = [
      { type: "games_played", status: "active", current_value: 999 },
      { type: "games_played", status: "success", current_value: 200 },
      { type: "games_played", status: "failed", current_value: 0 },
      { type: "zikle_wins", status: "success", current_value: 50 },
      { type: "games_played", status: "failed", current_value: 250 },
      { type: "games_played", status: "success", current_value: 300 },
      { type: "games_played", status: "success", current_value: 1 },
    ];
    expect(w.suggestTarget(weeks, "games_played")).toEqual({
      target: 300,
      basedOn: [200, 250, 300],
    });
  });
  it.each([
    [10, 10], // 12 → pas de 5
    [3, 5], // 3.6 → plancher d'un pas
    [100, 120], // pas de 10
    [1000, 1200], // pas de 50
    [5000, 6000], // pas de 100
  ])("objectif arrondi : valeur %i → %i", (v, attendu) => {
    expect(
      w.suggestTarget([{ type: "t", status: "success", current_value: v }], "t")
        .target,
    ).toBe(attendu);
  });
  it("pas d'historique : null", () => {
    expect(w.suggestTarget([], "games_played")).toBeNull();
  });
});

describe("actions admin", () => {
  it("liste admin : erreur remontée", async () => {
    h.tables.weekly_challenges = KO;
    await expect(w.getWeeklyChallengesForAdmin()).rejects.toEqual(KO.error);
    h.tables.weekly_challenges = ok(null);
    expect(await w.getWeeklyChallengesForAdmin()).toEqual([]);
  });
  it("contributeurs admin : profils privés compris, total", async () => {
    h.tables.weekly_challenge_contributions = {
      data: [contrib("x", 1, true)],
      count: 12,
      error: null,
    };
    expect(await w.getWeeklyContributorsForAdmin(3)).toEqual({
      top: [contrib("x", 1, true)],
      total: 12,
    });
    h.tables.weekly_challenge_contributions = {
      data: null,
      count: null,
      error: null,
    };
    expect(await w.getWeeklyContributorsForAdmin(3)).toEqual({
      top: [],
      total: 0,
    });
    h.tables.weekly_challenge_contributions = KO;
    await expect(w.getWeeklyContributorsForAdmin(3)).rejects.toEqual(KO.error);
  });

  const writes = (table, op) => h.admin.of(table).filter((q) => q.has(op));
  it("même type : seul l'objectif change", async () => {
    h.tables.weekly_challenges = (q) =>
      q.has("single")
        ? ok({ type: "games_played", status: "active" })
        : ok(null);
    expect(await w.updateActiveWeeklyChallenge(1, "games_played", 400)).toEqual(
      { reset: false },
    );
    expect(writes("weekly_challenge_contributions", "delete")).toHaveLength(0);
    expect(writes("weekly_challenges", "update")[0].args("update")).toEqual([
      { target: 400 },
    ]);
  });
  it("autre type : compteur et contributions remis à zéro", async () => {
    h.tables.weekly_challenges = (q) =>
      q.has("single")
        ? ok({ type: "games_played", status: "active" })
        : ok(null);
    h.tables.weekly_challenge_contributions = ok(null);
    expect(await w.updateActiveWeeklyChallenge(1, "zikle_wins", 100)).toEqual({
      reset: true,
    });
    expect(
      writes("weekly_challenge_contributions", "delete")[0].has(
        "eq",
        "challenge_id",
        1,
      ),
    ).toBe(true);
    expect(writes("weekly_challenges", "update")[0].args("update")).toEqual([
      { type: "zikle_wins", target: 100, current_value: 0 },
    ]);
  });
  it("défi terminé : refus", async () => {
    h.tables.weekly_challenges = ok({
      type: "games_played",
      status: "success",
    });
    await expect(
      w.updateActiveWeeklyChallenge(1, "games_played", 1),
    ).rejects.toThrow("déjà terminé");
  });
  it("suppression des contributions en échec : rien n'est mis à jour", async () => {
    h.tables.weekly_challenges = (q) =>
      q.has("single")
        ? ok({ type: "games_played", status: "active" })
        : ok(null);
    h.tables.weekly_challenge_contributions = KO;
    await expect(
      w.updateActiveWeeklyChallenge(1, "zikle_wins", 1),
    ).rejects.toEqual(KO.error);
    expect(writes("weekly_challenges", "update")).toHaveLength(0);
  });
  it("lecture ou mise à jour en échec : remontée", async () => {
    h.tables.weekly_challenges = KO;
    await expect(w.updateActiveWeeklyChallenge(1, "x", 1)).rejects.toEqual(
      KO.error,
    );
    h.tables.weekly_challenges = (q) =>
      q.has("single") ? ok({ type: "t", status: "active" }) : KO;
    await expect(w.updateActiveWeeklyChallenge(1, "t", 1)).rejects.toEqual(
      KO.error,
    );
  });

  it("programmation : RPC et erreur remontée", async () => {
    h.rpcs.admin_schedule_weekly_challenge = ok(null);
    await w.scheduleWeeklyChallenge("2026-11-16", "games_played", 300);
    expect(h.admin.client.rpc.mock.calls[0][1]).toEqual({
      p_week_start: "2026-11-16",
      p_type: "games_played",
      p_target: 300,
    });
    h.rpcs.admin_schedule_weekly_challenge = KO;
    await expect(
      w.scheduleWeeklyChallenge("2026-11-16", "x", 1),
    ).rejects.toEqual(KO.error);
  });

  it.each([
    ["2026-11-09", "2026-11-12"], // semaine en cours
    ["2026-11-02", "2026-11-12"], // passée
  ])("annulation refusée : semaine %s vue le %s", async (ws, today) => {
    await expect(w.cancelScheduledWeeklyChallenge(ws, today)).rejects.toThrow(
      "à venir",
    );
    expect(h.admin.queries).toEqual([]);
  });
  it("annulation d'une semaine future : seulement un défi vierge", async () => {
    h.tables.weekly_challenges = ok(null);
    await w.cancelScheduledWeeklyChallenge("2026-11-16", "2026-11-15");
    const [q] = h.admin.queries;
    expect(q.has("delete")).toBe(true);
    expect(
      q.has("eq", "status", "active") && q.has("eq", "current_value", 0),
    ).toBe(true);
    h.tables.weekly_challenges = KO;
    await expect(
      w.cancelScheduledWeeklyChallenge("2026-11-16", "2026-11-15"),
    ).rejects.toEqual(KO.error);
  });
});
