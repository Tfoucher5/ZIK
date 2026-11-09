import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf, has } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ sb: null }));
vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));

const { cardsAdminBoard } = await import("../adminBoard.js");

let found;
let pairGrants;
const respond = (q) => {
  const head = arg(q, "select")?.[1]?.head;
  switch (q.table) {
    case "profiles":
      if (has(q, "ilike")) return { data: found };
      return {
        data: arg(q, "in")[1].map((id) => ({ id, username: `name-${id}` })),
      };
    case "card_grants":
      if (head) return { count: eqOf(q, "status") === "granted" ? 12 : 0 };
      if (has(q, "range"))
        return { data: arg(q, "range")[0] === 0 ? pairGrants : [] };
      return {
        data: [{ id: "g1", user_id: "u1", cards: { number: 5 } }],
      };
    case "cards":
      if (head) return { count: 3 };
      if (has(q, "in"))
        return { data: [{ id: "c9", number: 9, title: "Signalée" }] };
      if (has(q, "maybeSingle"))
        return { data: { id: "c1", number: 1, first_owner_id: "u7" } };
      return { data: [{ id: "c1", number: 1 }] };
    case "user_cards":
      if (head) return { count: 2 };
      return { data: [{ user_id: "u8", copies: 1 }] };
    case "card_signals":
      return { data: [{ id: "sg", user_id: "u2" }], count: 1 };
    case "reports":
      return {
        data: [
          { id: "r1", metadata: { card: 9 } },
          { id: "r2", metadata: {} },
        ],
        count: null,
      };
    case "game_players":
      return {
        data: arg(q, "in")[1].flatMap((game_id) => [
          { game_id, user_id: "u1" },
          { game_id, user_id: "u9" },
        ]),
      };
    case "tracks":
      return { count: 4 };
    case "card_set_items":
      return { data: [{ card_sets: { id: "s1" } }, { card_sets: null }] };
    default:
      return head ? { count: 1 } : { data: [] };
  }
};

beforeEach(() => {
  found = null;
  pairGrants = [];
  m.sb = fakeSupabase(respond);
});

const queries = (table) => m.sb.calls.filter((q) => q.table === table);

describe("cardsAdminBoard", () => {
  it("sans filtre : chiffres, à traiter, noms des joueurs", async () => {
    const b = await cardsAdminBoard({});
    expect(b.stats).toMatchObject({
      grants: { pending: 0, granted: 12, lost: 0, revoked: 0 },
      owned: 2,
      provisional: 3,
      sets: 1,
      signals: 1,
      reports: 2,
    });
    expect(b.stats.rarity).toHaveLength(6);
    expect(b.stats.rarity[0]).toEqual({ key: "common", catalog: 3, owned: 2 });
    expect(b.signals[0].username).toBe("name-u2");
    expect(b.grants[0].username).toBe("name-u1");
    expect(b.reports[0].card).toMatchObject({ number: 9 });
    expect(b.reports[1].card).toBeUndefined();
    expect(b.search.results).toBeNull();
    expect(b.card).toBeNull();
    expect(b.filters).toMatchObject({
      user: undefined,
      username: "",
      whoMissing: false,
    });
  });

  it("filtre par pseudo : les jokers LIKE sont échappés", async () => {
    found = { id: "u5" };
    const b = await cardsAdminBoard({ who: "a_b%c\\" });
    const q = queries("profiles").find((p) => has(p, "ilike"));
    expect(arg(q, "ilike")).toEqual(["username", "a\\_b\\%c\\\\"]);
    expect(b.filters).toMatchObject({
      user: "u5",
      username: "name-u5",
      whoMissing: false,
    });
    const grants = queries("card_grants").find((g) => has(g, "limit"));
    expect(eqOf(grants, "user_id")).toBe("u5");
  });

  it("pseudo inconnu : signalé, journal non filtré", async () => {
    const b = await cardsAdminBoard({ who: "fantome", status: "revoked" });
    expect(b.filters.whoMissing).toBe(true);
    const grants = queries("card_grants").find((g) => has(g, "limit"));
    expect(eqOf(grants, "user_id")).toBeUndefined();
    expect(eqOf(grants, "status")).toBe("revoked");
  });

  it("recherche par numéro, par texte nettoyé, ou par rareté seule", async () => {
    let b = await cardsAdminBoard({ q: "n°42" });
    let q = queries("cards").find(
      (c) => has(c, "limit") && arg(c, "limit")[0] === 40,
    );
    expect(eqOf(q, "number")).toBe(42);
    expect(b.search.results).toEqual([{ id: "c1", number: 1 }]);

    m.sb = fakeSupabase(respond);
    await cardsAdminBoard({ q: 'daft),"punk%', rarity: "epic" });
    q = queries("cards").find(
      (c) => has(c, "limit") && arg(c, "limit")[0] === 40,
    );
    const filter = arg(q, "or")[0];
    // Aucun caractère qui casse le filtre PostgREST ne passe
    expect(filter.replace(/\.ilike\."%|%"/g, "")).not.toMatch(/[()%"\\]/);
    expect(eqOf(q, "rarity")).toBe("epic");

    m.sb = fakeSupabase(respond);
    await cardsAdminBoard({ rarity: "mythic" });
    q = queries("cards").find(
      (c) => has(c, "limit") && arg(c, "limit")[0] === 40,
    );
    expect(has(q, "or")).toBe(false);
    expect(arg(q, "order")).toEqual(["number", { ascending: false }]);
  });

  it("fiche d'une carte : possesseurs, titres, sets, gains par statut", async () => {
    const b = await cardsAdminBoard({ cardNumber: 1 });
    expect(b.card).toMatchObject({
      id: "c1",
      firstOwner: { id: "u7", username: "name-u7" },
      owners: [{ user_id: "u8", username: "name-u8" }],
      ownersCount: 2,
      tracks: 4,
      sets: [{ id: "s1" }],
      grants: { granted: 12, pending: 0 },
    });
  });

  it("duo suspect : pseudos du joueur et de son partenaire", async () => {
    pairGrants = ["g0", "g1", "g2", "g3", "g4"].map((game_id) => ({
      id: game_id,
      user_id: "u1",
      game_id,
    }));
    const b = await cardsAdminBoard({});
    expect(b.pairs).toEqual([
      {
        userId: "u1",
        partnerId: "u9",
        games: 5,
        together: 5,
        cards: 5,
        username: "name-u1",
        partner: "name-u9",
      },
    ]);
  });

  it("fiche d'une carte inconnue : null", async () => {
    m.sb = fakeSupabase((q) =>
      q.table === "cards" && has(q, "maybeSingle")
        ? { data: null }
        : respond(q),
    );
    expect((await cardsAdminBoard({ cardNumber: 404 })).card).toBeNull();
  });
});
