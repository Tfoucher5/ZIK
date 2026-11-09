import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf, kind, writes } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ deezer: null, newCard: null, enrichedWith: [] }));
vi.mock("../../music/deezerClient.js", () => ({
  deezerFetch: async () => {
    if (m.deezer instanceof Error) throw m.deezer;
    return m.deezer;
  },
}));
vi.mock("../enrich.js", () => ({
  enrichTrack: async (sb, t) => (m.enrichedWith.push(t), m.newCard),
}));

const { auditCatalog, deleteCards, revokeGrants, correctCard } =
  await import("../admin.js");

beforeEach(() => {
  m.deezer = null;
  m.newCard = null;
  m.enrichedWith = [];
});

describe("auditCatalog", () => {
  it("compte les titres sans carte, les cartes orphelines et celles supprimables", async () => {
    const tables = {
      tracks: [
        { id: 1, card_id: "c1", card_checked_at: "x" },
        { id: 2, card_id: null, card_checked_at: "x", artist: "A", title: "T" },
        { id: 3, card_id: null, card_checked_at: null },
      ],
      cards: [{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }],
      user_cards: [{ card_id: "c2" }],
      card_grants: [{ card_id: "c3" }],
    };
    const sb = fakeSupabase((q) => ({
      data: arg(q, "range")[0] === 0 ? tables[q.table] : [],
    }));
    const res = await auditCatalog(sb);
    expect(res).toEqual({
      tracks: 3,
      cards: 4,
      unchecked: 1,
      withoutCard: [tables.tracks[1]],
      orphanCards: ["c2", "c3", "c4"],
      removableCards: ["c4"],
    });
    // Tri sur la première colonne pour une pagination stable
    expect(arg(sb.calls[0], "order")).toEqual(["id"]);
  });

  it("pagine au-delà de 1000 lignes", async () => {
    const big = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}` }));
    const sb = fakeSupabase((q) => ({
      data:
        q.table === "cards" && arg(q, "range")[0] === 0 ? big : [{ id: "z" }],
    }));
    const res = await auditCatalog(sb);
    expect(res.cards).toBe(1001);
  });

  it("erreur de lecture : levée", async () => {
    const sb = fakeSupabase(() => ({ data: null, error: { message: "rls" } }));
    await expect(auditCatalog(sb)).rejects.toMatchObject({ message: "rls" });
  });
});

describe("deleteCards", () => {
  it("supprime par paquets de 200 et recompte les sets touchés", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    const counts = { s1: 4, s2: 0, s3: 0 };
    // 1er paquet : cartes de s1 (deux fois) et s2 ; 2e paquet : carte de s3
    const sb = fakeSupabase((q) => {
      if (q.table === "card_set_items" && arg(q, "in"))
        return arg(q, "in")[1].includes("c0")
          ? { data: [{ set_id: "s1" }, { set_id: "s2" }, { set_id: "s1" }] }
          : { data: [{ set_id: "s3" }] };
      if (q.table === "card_set_items")
        return { count: counts[eqOf(q, "set_id")] };
    });
    expect(await deleteCards(sb, ids)).toBe(250);
    const dels = writes(sb, "cards", "delete").map(
      (q) => arg(q, "in")[1].length,
    );
    expect(dels).toEqual([200, 50]);
    // Set encore rempli : recompté ; set vidé : supprimé
    const ups = writes(sb, "card_sets", "update");
    expect(ups).toHaveLength(1);
    expect(arg(ups[0], "update")[0]).toEqual({ card_count: 4 });
    expect(eqOf(ups[0], "id")).toBe("s1");
    expect(writes(sb, "card_sets", "delete").map((q) => eqOf(q, "id"))).toEqual(
      ["s2", "s3"],
    );
  });

  it("liste vide : rien ; erreur de suppression : levée", async () => {
    expect(await deleteCards(fakeSupabase(), [])).toBe(0);
    const sb = fakeSupabase((q) =>
      kind(q) === "delete" ? { error: { message: "fk" } } : { data: [] },
    );
    await expect(deleteCards(sb, ["c1"])).rejects.toMatchObject({
      message: "fk",
    });
  });
});

describe("revokeGrants", () => {
  it("gain en attente : seulement marqué « revoked »", async () => {
    const sb = fakeSupabase((q) =>
      q.table === "card_grants" && kind(q) === "select"
        ? {
            data: [
              { id: "g1", user_id: "u1", card_id: "c1", status: "pending" },
            ],
          }
        : null,
    );
    expect(await revokeGrants(sb, ["g1"])).toBe(1);
    const up = writes(sb, "card_grants", "update")[0];
    expect(arg(up, "update")[0].status).toBe("revoked");
    expect(eqOf(up, "id")).toBe("g1");
    expect(writes(sb, "user_cards", "delete")).toEqual([]);
    // Seuls les gains encore actifs sont visés
    expect(sb.calls[0].ops.filter(([o]) => o === "in")[1]).toEqual([
      "in",
      "status",
      ["pending", "granted"],
    ]);
  });

  it("gain donné : carte retirée et sets qu'elle complétait rouverts", async () => {
    const sb = fakeSupabase((q) => {
      if (q.table === "card_grants" && kind(q) === "select")
        return {
          data: [{ id: "g1", user_id: "u1", card_id: "c1", status: "granted" }],
        };
      if (q.table === "card_set_items")
        return { data: [{ set_id: "s1" }, { set_id: "s2" }] };
    });
    await revokeGrants(sb, ["g1"]);
    const del = writes(sb, "user_cards", "delete")[0];
    expect([eqOf(del, "user_id"), eqOf(del, "card_id")]).toEqual(["u1", "c1"]);
    const sets = writes(sb, "user_card_sets", "delete")[0];
    expect(eqOf(sets, "user_id")).toBe("u1");
    expect(arg(sets, "in")).toEqual(["set_id", ["s1", "s2"]]);
  });

  it("carte hors de tout set : pas de requête sur les sets terminés", async () => {
    const sb = fakeSupabase((q) =>
      q.table === "card_grants" && kind(q) === "select"
        ? {
            data: [
              { id: "g1", user_id: "u1", card_id: "c1", status: "granted" },
            ],
          }
        : { data: [] },
    );
    await revokeGrants(sb, ["g1"]);
    expect(writes(sb, "user_card_sets", "delete")).toEqual([]);
  });

  it("gain inconnu ou déjà révoqué : 0", async () => {
    expect(await revokeGrants(fakeSupabase(), ["x"])).toBe(0);
  });
});

describe("correctCard", () => {
  it.each([["pas un id"], [""], [null]])(
    "référence %p : refusée sans appel",
    async (ref) => {
      expect(await correctCard(fakeSupabase(), "c1", ref)).toEqual({
        error: "Titre Deezer introuvable",
      });
    },
  );

  it("titre Deezer en erreur ou en panne : refusé", async () => {
    m.deezer = { error: { code: 800 } };
    expect((await correctCard(fakeSupabase(), "c1", "42")).error).toBeTruthy();
    m.deezer = new Error("down");
    expect((await correctCard(fakeSupabase(), "c1", "42")).error).toBeTruthy();
  });

  it("lit l'id dans un lien Deezer", async () => {
    m.deezer = { id: 3135556, title: "Harder", artist: { name: "Daft Punk" } };
    m.newCard = null;
    const res = await correctCard(
      fakeSupabase(),
      "c1",
      "https://www.deezer.com/fr/track/3135556?utm=x",
    );
    expect(res).toEqual({ error: "Carte impossible à créer" });
    expect(m.enrichedWith[0]).toEqual({
      artist: "Daft Punk",
      title: "Harder",
      source: "deezer",
      external_id: "3135556",
    });
  });

  it("même carte : rien à faire", async () => {
    m.deezer = { id: 1, title: "T", artist: { name: "A" } };
    m.newCard = "c1";
    const sb = fakeSupabase();
    expect(await correctCard(sb, "c1", 1)).toEqual({ cardId: "c1" });
    expect(sb.calls).toEqual([]);
  });
});
