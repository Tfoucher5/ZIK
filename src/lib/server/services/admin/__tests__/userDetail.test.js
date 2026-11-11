import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeQuery } from "../../__tests__/fakeQuery.js";

const m = vi.hoisted(() => ({ db: null }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => m.db.client,
}));

const { getAdminUserDetail } = await import("../userDetail.js");

const ID = "user-1";
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
let rows;

beforeEach(() => {
  rows = { profiles: () => ({ data: { id: ID, username: "lea" } }) };
  m.db = fakeQuery((q) => rows[q.table]?.(q));
});

describe("fiche joueur de l'admin", () => {
  it("joueur inconnu ou erreur de lecture : null", async () => {
    rows.profiles = () => ({ data: null, error: { message: "0 rows" } });
    expect(await getAdminUserDetail(ID, "admin")).toBeNull();
  });

  it("compte vide : fiche complète sans planter", async () => {
    const d = await getAdminUserDetail(ID, "admin");
    expect(d.isSelf).toBe(false);
    expect(d.isBanned).toBe(false);
    expect(d.account).toEqual({
      email: null,
      provider: null,
      lastSignIn: null,
      bannedUntil: null,
    });
    expect(d.stats).toEqual({ games: 0, wins: 0, podiums: 0, month: 0 });
    expect(d.pro).toBeNull();
    expect(m.db.of("rooms")).toHaveLength(0);
  });

  it("sa propre fiche est repérée (l'admin ne se rétrograde pas)", async () => {
    expect((await getAdminUserDetail(ID, ID)).isSelf).toBe(true);
  });

  it("ban en cours ou passé", async () => {
    const until = new Date(Date.now() + 3600_000).toISOString();
    m.db.client.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { email: "a@b.fr", banned_until: until } },
    });
    let d = await getAdminUserDetail(ID, "admin");
    expect(d.isBanned).toBe(true);
    expect(d.account.bannedUntil).toBe(until);

    m.db.client.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { banned_until: daysAgo(1) } },
    });
    d = await getAdminUserDetail(ID, "admin");
    expect(d.isBanned).toBe(false);
    expect(d.account.bannedUntil).toBeNull();
  });

  it("parties : tri, stats, 15 dernières avec leur room", async () => {
    const game = (i, rank, age) => ({
      id: `gp${i}`,
      score: i,
      rank,
      games: { started_at: daysAgo(age), room_id: i < 2 ? "ROCK" : null },
    });
    rows.game_players = () => ({
      data: [
        game(0, 1, 40),
        game(1, 3, 1),
        { id: "orpheline", rank: 1, games: null },
        ...Array.from({ length: 16 }, (_, i) => game(i + 2, 5, 50 + i)),
      ],
    });
    rows.rooms = () => ({ data: [{ code: "ROCK", name: "Rock" }] });
    const d = await getAdminUserDetail(ID, "admin");
    expect(d.stats).toEqual({ games: 18, wins: 1, podiums: 2, month: 1 });
    expect(d.games).toHaveLength(15);
    expect(d.games[0]).toMatchObject({ id: "gp1", room: { name: "Rock" } });
    expect(d.games[2].room).toBeNull();
    expect(m.db.of("rooms")[0].args("in")).toEqual(["code", ["ROCK"]]);
  });

  it("journal admin, succès, amitiés et abonnements mis en forme", async () => {
    rows.admin_audit_log = () => ({
      data: [
        { id: 1, admin_id: "a1", action: "ban_user" },
        { id: 2, admin_id: "inconnu", action: "x" },
      ],
    });
    rows.profiles = (q) =>
      q.has("in")
        ? {
            data: [
              { id: "a1", username: "theo" },
              { id: "b", username: "B" },
              { id: "x", username: "X" },
              { id: "u", username: "U" },
            ],
          }
        : { data: { id: ID } };
    rows.user_achievements = () => ({
      data: [
        { id: 1, achievement_id: "win" },
        { id: 2, achievement_id: "retire" },
      ],
    });
    rows.achievements = () => ({
      data: [{ id: "win", name: "Gagner", icon: "W" }],
    });
    rows.friendships = () => ({
      data: [
        {
          id: 1,
          requester_id: ID,
          addressee_id: "b",
          created_at: "c",
        },
        {
          id: 2,
          requester_id: "x",
          addressee_id: ID,
          accepted_at: "a",
        },
      ],
    });
    rows.follows = () => ({
      data: [{ id: 9, created_at: "t", following_id: "u", follower_id: "u" }],
    });
    rows.pro_subscriptions = () => ({ data: { plan: "monthly" } });
    rows.salon_players = () => ({
      data: [
        { id: 1, games: {} },
        { id: 2, games: null },
      ],
    });

    const d = await getAdminUserDetail(ID, "admin");
    expect(d.audit.map((a) => a.admin)).toEqual(["theo", null]);
    expect(d.achievements.map((a) => [a.name, a.icon])).toEqual([
      ["Gagner", "W"],
      ["retire", "🏅"],
    ]);
    expect(d.friendships).toEqual([
      { id: 1, status: undefined, at: "c", user: { id: "b", username: "B" } },
      { id: 2, status: undefined, at: "a", user: { id: "x", username: "X" } },
    ]);
    expect(d.following).toEqual([
      { id: 9, at: "t", user: { id: "u", username: "U" } },
    ]);
    expect(m.db.of("profiles").filter((q) => q.has("in"))).toHaveLength(1);
    expect(d.followers).toHaveLength(1);
    expect(d.pro).toEqual({ plan: "monthly" });
    expect(d.salon.played).toHaveLength(1);
  });

  it("filtres construits sur l'id", async () => {
    await getAdminUserDetail(ID, "admin");
    const reports = m.db.of("reports")[0];
    expect(reports.args("or")).toEqual([
      `reporter_id.eq.${ID},reported_user_id.eq.${ID}`,
    ]);
    expect(m.db.of("games")[0].args("eq")).toEqual(["source", "salon"]);
  });
});
