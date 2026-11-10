import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf, kind, writes } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ newCard: "new" }));
vi.mock("../../music/deezerClient.js", () => ({
  deezerFetch: async () => ({
    id: 9,
    title: "Bon titre",
    artist: { name: "A" },
  }),
}));
vi.mock("../enrich.js", () => ({ enrichTrack: async () => m.newCard }));

const { correctCard, suspiciousPairs } = await import("../admin.js");

describe("correctCard : la bonne version remplace la mauvaise", () => {
  // s1 : 3 cartes (old, b, c) ; s2 : 2 cartes seulement
  const sets = { s1: ["new", "b", "c"], s2: ["new", "d"] };
  const owned = { u1: ["new", "b", "c"], u2: ["new", "b"] };
  let sb;

  beforeEach(async () => {
    sb = fakeSupabase((q) => {
      const k = kind(q);
      if (q.table === "user_cards" && k === "select" && eqOf(q, "card_id"))
        return {
          data: [
            {
              user_id: "u1",
              card_id: "old",
              copies: 1,
              first_obtained_at: "t1",
            },
            {
              user_id: "u2",
              card_id: "old",
              copies: 1,
              first_obtained_at: "t2",
            },
          ],
        };
      if (q.table === "user_cards" && k === "select") {
        const ids = arg(q, "in")[1];
        return {
          count: owned[eqOf(q, "user_id")].filter((c) => ids.includes(c))
            .length,
        };
      }
      if (q.table === "card_set_items" && k === "select" && arg(q, "in"))
        return { data: [{ set_id: "s1" }, { set_id: "s2" }, { set_id: "s1" }] };
      if (q.table === "card_set_items" && eqOf(q, "set_id")) {
        const ids = sets[eqOf(q, "set_id")];
        return arg(q, "select")[1]?.head
          ? { count: ids.length }
          : { data: ids.map((card_id) => ({ card_id })) };
      }
      if (q.table === "card_sets" && k === "select")
        return { data: { card_count: sets[eqOf(q, "id")].length } };
    });
    expect(await correctCard(sb, "old", "9")).toEqual({ cardId: "new" });
  });

  it("titres du catalogue et journal des gains basculent sur la nouvelle carte", () => {
    for (const table of ["tracks", "card_grants"]) {
      const up = writes(sb, table, "update")[0];
      expect(arg(up, "update")[0]).toEqual({ card_id: "new" });
      expect(eqOf(up, "card_id")).toBe("old");
    }
  });

  it("chaque possesseur garde la carte, sans doublon ni perte de sa date", () => {
    const ups = writes(sb, "user_cards", "upsert").map((q) => arg(q, "upsert"));
    expect(ups).toEqual(
      ["u1", "u2"].map((u, i) => [
        {
          user_id: u,
          card_id: "new",
          copies: 1,
          first_obtained_at: `t${i + 1}`,
        },
        { onConflict: "user_id,card_id", ignoreDuplicates: true },
      ]),
    );
  });

  it("l'ancienne carte est supprimée", () => {
    const del = writes(sb, "cards", "delete")[0];
    expect(arg(del, "in")).toEqual(["id", ["old"]]);
  });

  it("sets revus : terminé s'il a 3 cartes toutes possédées, sinon rouvert", () => {
    const done = writes(sb, "user_card_sets", "upsert").map(
      (q) => arg(q, "upsert")[0],
    );
    expect(done).toEqual([{ user_id: "u1", set_id: "s1" }]);
    const reopened = writes(sb, "user_card_sets", "delete").map((q) => [
      eqOf(q, "user_id"),
      eqOf(q, "set_id"),
    ]);
    // s2 n'a que 2 cartes : jamais terminé, même entièrement possédé
    expect(reopened).toEqual([
      ["u1", "s2"],
      ["u2", "s1"],
      ["u2", "s2"],
    ]);
  });
});

describe("suspiciousPairs", () => {
  const grant = (user_id, game_id) => ({
    id: `${user_id}-${game_id}`,
    user_id,
    game_id,
  });
  let grants;
  let players;
  const sb = () =>
    fakeSupabase((q) => {
      if (q.table === "card_grants")
        return { data: arg(q, "range")[0] === 0 ? grants : [] };
      const ids = arg(q, "in")[1];
      return { data: players.filter((p) => ids.includes(p.game_id)) };
    });
  const games = (n, prefix = "g") =>
    Array.from({ length: n }, (_, i) => `${prefix}${i}`);

  beforeEach(() => {
    grants = [];
    players = [];
  });

  it("repère un joueur qui gagne presque toujours avec le même partenaire", async () => {
    for (const g of games(5)) {
      grants.push(grant("u1", g));
      players.push(
        { game_id: g, user_id: "u1" },
        { game_id: g, user_id: "u3" },
      );
    }
    // u2 n'est là que dans 4 parties sur 5 : 0,8 pile, compté
    for (const g of games(4)) players.push({ game_id: g, user_id: "u2" });
    const pairs = await suspiciousPairs(sb());
    expect(pairs).toEqual([
      { userId: "u1", partnerId: "u3", games: 5, together: 5, cards: 5 },
      { userId: "u1", partnerId: "u2", games: 5, together: 4, cards: 5 },
    ]);
  });

  it("sous le seuil de parties ou de part commune : rien", async () => {
    for (const g of games(4)) {
      grants.push(grant("u1", g));
      players.push(
        { game_id: g, user_id: "u1" },
        { game_id: g, user_id: "u2" },
      );
    }
    expect(await suspiciousPairs(sb())).toEqual([]);

    grants.push(grant("u1", "g4"));
    players.push({ game_id: "g4", user_id: "u1" });
    for (const g of games(3)) grants.push(grant("u1", `x${g}`));
    // 4 parties communes sur 8 : 50 %
    expect(await suspiciousPairs(sb())).toEqual([]);
  });

  it("filtre les gains donnés récents liés à une partie, trie par cartes", async () => {
    for (const g of games(5, "a")) {
      grants.push(grant("u1", g));
      players.push(
        { game_id: g, user_id: "u1" },
        { game_id: g, user_id: "u2" },
      );
    }
    for (const g of games(6, "b")) {
      grants.push(grant("u3", g), grant("u3", g));
      players.push(
        { game_id: g, user_id: "u3" },
        { game_id: g, user_id: "u4" },
      );
    }
    const client = sb();
    const pairs = await suspiciousPairs(client, { days: 7 });
    expect(pairs.map((p) => [p.userId, p.cards])).toEqual([
      ["u3", 12],
      ["u1", 5],
    ]);
    const q = client.calls[0];
    expect(eqOf(q, "status")).toBe("granted");
    expect(arg(q, "not")).toEqual(["game_id", "is", null]);
    const since = new Date(arg(q, "gte")[1]);
    expect(Math.round((Date.now() - since) / 86_400_000)).toBe(7);
  });

  it("aucun gain : liste vide, sans requête sur les joueurs", async () => {
    const client = sb();
    expect(await suspiciousPairs(client)).toEqual([]);
    expect(client.calls.some((q) => q.table === "game_players")).toBe(false);
  });
});
