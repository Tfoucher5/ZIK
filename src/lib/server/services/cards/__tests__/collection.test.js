import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf, has } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ sb: null }));
vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));

// Module rechargé à chaque test : le cache des totaux repart vide
let getCollection, getSetCards, catalogTotals;
beforeEach(async () => {
  vi.resetModules();
  ({ getCollection, getSetCards, catalogTotals } =
    await import("../collection.js"));
});

const NOW = new Date("2026-06-15T12:00:00Z");
const card = (id, number, extra = {}) => ({
  id,
  number,
  title: `Titre ${id}`,
  artist: `Artiste ${id}`,
  rarity: "epic",
  deezer_rank: 850_000,
  rarity_locked_at: "x",
  card_albums: {
    title: "Album",
    cover_md_url: `md-${id}`,
    cover_url: `xl-${id}`,
  },
  ...extra,
});

let owned;
let setItems;
let sets;
let completed;
const db = () =>
  fakeSupabase((q) => {
    if (q.table === "cards") return { count: 2 };
    if (q.table === "user_cards") {
      const [from, to] = arg(q, "range");
      const now = arg(q, "lte")?.[1];
      const rows = owned.filter((r) => !now || r.visible_at <= now);
      return { data: rows.slice(from, to + 1) };
    }
    if (q.table === "card_set_items") {
      const ids = arg(q, "in")[1];
      return { data: setItems.filter((i) => ids.includes(i.card_id)) };
    }
    if (q.table === "card_sets") {
      const ids = arg(q, "in")[1];
      const min = arg(q, "gte")[1];
      return {
        data: sets.filter((s) => ids.includes(s.id) && s.card_count >= min),
      };
    }
    if (q.table === "user_card_sets") return { data: completed };
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  owned = [
    {
      first_obtained_at: "2026-06-01",
      visible_at: "2026-06-02T00:00:00.000Z",
      cards: { ...card("a", 1), first_owner: { username: "theo" } },
    },
    {
      first_obtained_at: "2026-06-15",
      visible_at: "2026-06-16T00:00:00.000Z",
      cards: card("b", 2),
    },
    { first_obtained_at: "2026-06-15", visible_at: "2026-06-01", cards: null },
  ];
  setItems = [
    { set_id: "s1", card_id: "a" },
    { set_id: "s1", card_id: "b" },
    { set_id: "s2", card_id: "a" },
  ];
  sets = [
    {
      id: "s1",
      kind: "album",
      key: "k1",
      name: "Album 1",
      cover_url: "c1",
      card_count: 5,
    },
    {
      id: "s2",
      kind: "artist",
      key: "k2",
      name: "Duo",
      cover_url: "c2",
      card_count: 2,
    },
  ];
  completed = [{ set_id: "s1", completed_at: "2026-06-10" }];
  m.sb = db();
});
afterEach(() => vi.useRealTimers());

describe("getCollection", () => {
  it("vue publique : seulement les cartes visibles, sets de 3 cartes et plus", async () => {
    const { cards, sets: s, catalog } = await getCollection("u1");
    expect(cards.map((c) => c.id)).toEqual(["a"]);
    expect(cards[0]).toMatchObject({
      number: 1,
      firstOwner: "theo",
      pending: false,
      obtainedAt: "2026-06-01",
    });
    expect(s).toEqual([
      {
        id: "s1",
        kind: "album",
        key: "k1",
        name: "Album 1",
        cover: "c1",
        total: 5,
        owned: 1,
        completedAt: "2026-06-10",
      },
    ]);
    expect(catalog.total).toBeGreaterThan(0);
    const q = m.sb.calls.find((c) => c.table === "user_cards");
    expect(eqOf(q, "user_id")).toBe("u1");
    expect(arg(q, "lte")).toEqual(["visible_at", NOW.toISOString()]);
  });

  it("propriétaire : inclut les cartes en attente, marquées comme telles", async () => {
    const { cards, sets: s } = await getCollection("u1", { withPending: true });
    expect(cards.map((c) => [c.id, c.pending])).toEqual([
      ["a", false],
      ["b", true],
    ]);
    expect(cards[1].firstOwner).toBeNull();
    expect(s[0]).toMatchObject({ owned: 2 });
    const q = m.sb.calls.find((c) => c.table === "user_cards");
    expect(has(q, "lte")).toBe(false);
  });

  it("collection vide : aucun set, aucune requête par paquets", async () => {
    owned = [];
    completed = null;
    const res = await getCollection("u1");
    expect(res.cards).toEqual([]);
    expect(res.sets).toEqual([]);
    expect(m.sb.calls.some((q) => q.table === "card_set_items")).toBe(false);
  });

  it("grosse collection : pages de 1000, ids par paquets de 150", async () => {
    owned = Array.from({ length: 1200 }, (_, i) => ({
      first_obtained_at: "x",
      visible_at: "2026-01-01",
      cards: card(`c${i}`, i),
    }));
    setItems = [];
    const res = await getCollection("u1");
    expect(res.cards).toHaveLength(1200);
    const ranges = m.sb.calls
      .filter((q) => q.table === "user_cards")
      .map((q) => arg(q, "range"));
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    const chunks = m.sb.calls
      .filter((q) => q.table === "card_set_items")
      .map((q) => arg(q, "in")[1].length);
    expect(chunks).toEqual([150, 150, 150, 150, 150, 150, 150, 150]);
  });

  it("erreur de lecture : levée", async () => {
    m.sb = fakeSupabase(() => ({ data: null, error: { message: "down" } }));
    await expect(getCollection("u1")).rejects.toMatchObject({
      message: "down",
    });
  });
});

describe("catalogTotals", () => {
  it("compte par rareté, puis garde le résultat 10 minutes", async () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const sb = fakeSupabase((q) => ({
      count: eqOf(q, "rarity") === "common" ? 7 : null,
    }));
    const t = await catalogTotals(sb);
    expect(t.byRarity).toEqual({
      common: 7,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0,
    });
    expect(t.total).toBe(7);
    const n = sb.calls.length;
    vi.setSystemTime(new Date("2030-01-01T00:09:00Z"));
    expect(await catalogTotals(sb)).toBe(t);
    expect(sb.calls).toHaveLength(n);
    vi.setSystemTime(new Date("2030-01-01T00:11:00Z"));
    await catalogTotals(sb);
    expect(sb.calls).toHaveLength(2 * n);
  });
});

describe("getSetCards", () => {
  const all = [card("a", 3), card("b", 1), card("c", 2)];
  const setDb = (mine) =>
    fakeSupabase((q) => {
      if (q.table === "card_sets")
        return {
          data: eqOf(q, "id") === "s1" ? { id: "s1", name: "Set" } : null,
        };
      if (q.table === "card_set_items")
        return {
          data: arg(q, "range")[0] === 0 ? all.map((cards) => ({ cards })) : [],
        };
      if (q.table === "user_cards") return { data: mine };
    });

  it("set inconnu : null", async () => {
    m.sb = setDb([]);
    expect(await getSetCards("nope", "u1")).toBeNull();
  });

  it("cartes possédées d'abord, puis silhouettes par numéro", async () => {
    m.sb = setDb([{ card_id: "a", first_obtained_at: "t" }]);
    const { set, cards } = await getSetCards("s1", "u1");
    expect(set.name).toBe("Set");
    expect(cards.map((c) => [c.number, c.owned])).toEqual([
      [3, true],
      [1, false],
      [2, false],
    ]);
    expect(cards[0]).toMatchObject({ title: "Titre a", obtainedAt: "t" });
    const q = m.sb.calls.find((c) => c.table === "user_cards");
    expect(eqOf(q, "user_id")).toBe("u1");
    expect(arg(q, "lte")[0]).toBe("visible_at");
  });

  it("silhouette : ni titre, ni artiste, ni album, ni vraie rareté", async () => {
    m.sb = setDb([]);
    const { cards } = await getSetCards("s1", "u1");
    for (const c of cards) {
      expect(c).toMatchObject({
        owned: false,
        title: "",
        artist: "",
        album: "",
        rarity: "common",
        rank: 0,
        fans: 0,
      });
      expect(JSON.stringify(c)).not.toMatch(/Titre|Artiste|epic|850000/);
    }
  });

  it("visiteur non connecté : tout en silhouette, sans requête de possession", async () => {
    m.sb = setDb([{ card_id: "a" }]);
    const { cards } = await getSetCards("s1", null);
    expect(cards.every((c) => !c.owned)).toBe(true);
    expect(m.sb.calls.some((q) => q.table === "user_cards")).toBe(false);
  });
});
