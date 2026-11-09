import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ sb: null }));
vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));

const { cardsLeaderboardPage } = await import("../leaderboard.js");
const { getCardByNumber } = await import("../page.js");

const card = (id, number) => ({
  id,
  number,
  title: `T${id}`,
  rarity: "mythic",
  deezer_rank: 990_000,
  card_albums: null,
});

describe("cardsLeaderboardPage", () => {
  let rpc;
  beforeEach(() => {
    rpc = {
      cards_leaderboard: {
        data: [
          { username: "alice", total: 10 },
          { username: "prive", total: 4 },
        ],
      },
      cards_showcase: {
        data: [
          {
            user_id: "ua",
            by_rarity: { mythic: 2 },
            best: ["c2", "c1", "gone"],
          },
        ],
      },
    };
    m.sb = fakeSupabase((q) => {
      if (q.rpc) return rpc[q.rpc];
      if (q.table === "profiles")
        return {
          data: [
            { id: "ua", username: "alice" },
            { id: "up", username: "prive" },
          ],
        };
      if (q.table === "cards") return { data: [card("c1", 1), card("c2", 2)] };
    });
  });

  it("joint ses raretés et ses 3 meilleures cartes à chaque joueur", async () => {
    const rows = await cardsLeaderboardPage(40);
    expect(m.sb.calls[0]).toMatchObject({
      rpc: "cards_leaderboard",
      args: { p_offset: 40, p_limit: 20 },
    });
    expect(rows[0]).toMatchObject({
      username: "alice",
      total: 10,
      byRarity: { mythic: 2 },
    });
    // Ordre de la vitrine gardé, carte disparue ignorée
    expect(rows[0].best.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("profil privé (absent de la vitrine) : aucune carte montrée", async () => {
    const rows = await cardsLeaderboardPage(0);
    expect(rows[1]).toEqual({
      username: "prive",
      total: 4,
      byRarity: {},
      best: [],
    });
  });

  it("vitrine vide : pas de requête de cartes", async () => {
    rpc.cards_showcase = { data: [] };
    const rows = await cardsLeaderboardPage(0);
    expect(rows.every((r) => r.best.length === 0)).toBe(true);
    expect(m.sb.calls.some((q) => q.table === "cards")).toBe(false);
  });

  it("page au-delà de la fin : liste vide, sans autre requête", async () => {
    rpc.cards_leaderboard = { data: [] };
    expect(await cardsLeaderboardPage(9_999)).toEqual([]);
    expect(m.sb.calls).toHaveLength(1);
  });

  it("erreur d'une fonction SQL : levée", async () => {
    rpc.cards_leaderboard = { data: null, error: { message: "a" } };
    await expect(cardsLeaderboardPage(0)).rejects.toMatchObject({
      message: "a",
    });
    rpc.cards_leaderboard = { data: [{ username: "alice" }] };
    rpc.cards_showcase = { data: null, error: { message: "b" } };
    await expect(cardsLeaderboardPage(0)).rejects.toMatchObject({
      message: "b",
    });
  });
});

describe("getCardByNumber", () => {
  let row;
  let stats;
  beforeEach(() => {
    row = {
      ...card("c1", 42),
      first_owned_at: "2026-01-01",
      first_owner: { username: "theo" },
    };
    stats = [
      { track_stats: { players_exposed: 15, found_full: 5 } },
      { track_stats: { players_exposed: 10, found_full: 4 } },
      { track_stats: null },
    ];
    m.sb = fakeSupabase((q) => {
      if (q.table === "cards") return { data: row };
      if (q.table === "user_cards") return { count: 3 };
      if (q.table === "tracks") return { data: stats };
    });
  });

  it.each([["abc"], ["-1"], ["1.5"], ["12345678"], [""], [null], ["1 or 1=1"]])(
    "numéro %p : null sans requête",
    async (n) => {
      expect(await getCardByNumber(n)).toBeNull();
      expect(m.sb.calls).toEqual([]);
    },
  );

  it("carte inconnue : null", async () => {
    row = null;
    expect(await getCardByNumber("7")).toBeNull();
  });

  it("carte, possesseurs visibles et taux de réussite sur tous ses titres", async () => {
    const res = await getCardByNumber("42");
    expect(eqOf(m.sb.calls[0], "number")).toBe(42);
    expect(res).toMatchObject({
      rarityLabel: "Mythique",
      owners: 3,
      firstOwnedAt: "2026-01-01",
      card: {
        number: 42,
        firstOwner: "theo",
        successRate: 9 / 25,
        obtainedAt: null,
      },
    });
    const owners = m.sb.calls.find((q) => q.table === "user_cards");
    expect(arg(owners, "lte")[0]).toBe("visible_at");
  });

  it("moins de 20 joueurs exposés : pas de taux affiché", async () => {
    stats = [{ track_stats: { players_exposed: 19, found_full: 19 } }];
    const res = await getCardByNumber(42);
    expect(res.card.successRate).toBeNull();
  });

  it("sans premier possesseur ni stats : valeurs neutres", async () => {
    row.first_owner = null;
    stats = null;
    m.sb = fakeSupabase((q) => (q.table === "cards" ? { data: row } : {}));
    const res = await getCardByNumber(42);
    expect(res.card.firstOwner).toBeNull();
    expect(res.owners).toBe(0);
    expect(res.card.successRate).toBeNull();
  });
});
