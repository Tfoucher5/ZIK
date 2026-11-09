import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, eqOf, writes } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({
  sb: null,
  deezer: {},
  notifs: [],
  pending: { done: 0, found: 0, total: 0 },
  enriched: [],
}));

vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));
vi.mock("../deezerApi.js", () => ({
  deezer: async (path) => m.deezer[path.split("/").pop()] ?? null,
}));
vi.mock("../enrich.js", () => ({
  TRACK_FIELDS: "id, artist, title, source, external_id",
  enrichPending: vi.fn(async () => m.pending),
  enrichOne: async (sb, t) => m.enriched.push(t.id),
}));
vi.mock("../../notify/notifications.js", () => ({
  createNotification: async (n) => m.notifs.push(n),
}));

const { refreshProvisional, dailyCardsMaintenance, enqueueCardEnrichment } =
  await import("../maintenance.js");
const { enrichPending } = await import("../enrich.js");

let cards;
let owners;
const db = () =>
  fakeSupabase((q) => {
    if (q.table === "cards" && arg(q, "range")) {
      const [from, to] = arg(q, "range");
      return { data: cards.slice(from, to + 1) };
    }
    if (q.table === "user_cards")
      return { data: owners[eqOf(q, "card_id")] ?? [] };
  });

const card = (id, rank, rarity, created_at = "2026-03-10T00:00:00Z") => ({
  id,
  number: id,
  title: `Titre ${id}`,
  deezer_track_id: id,
  deezer_rank: rank,
  rarity,
  created_at,
});
const updateOf = (id) =>
  writes(m.sb, "cards", "update")
    .filter((q) => eqOf(q, "id") === id)
    .map((q) => arg(q, "update")[0])[0];
const NOW = new Date("2026-06-01T03:00:00Z");

beforeEach(() => {
  cards = [];
  owners = {};
  m.deezer = {};
  m.notifs = [];
  m.enriched = [];
  m.sb = db();
});

describe("refreshProvisional", () => {
  it("sortie récente : ne peut que monter, reste provisoire", async () => {
    cards = [card(1, 900_000, "epic"), card(2, 600_000, "uncommon")];
    m.deezer[1] = { rank: 100_000, release_date: "2026-01-01" };
    m.deezer[2] = { rank: 990_000, release_date: "2026-01-01" };
    owners[2] = [{ user_id: "u1" }, { user_id: "u2" }];
    const res = await refreshProvisional(NOW);
    expect(updateOf(1)).toEqual({
      deezer_rank: 900_000,
      rarity: "epic",
      rarity_locked_at: null,
    });
    expect(updateOf(2)).toMatchObject({
      deezer_rank: 990_000,
      rarity: "mythic",
    });
    expect(res).toEqual({ checked: 2, raised: 1 });
    expect(m.notifs).toEqual(
      ["u1", "u2"].map((u) => ({
        userId: u,
        type: "card_up",
        actorId: u,
        payload: { number: 2, title: "Titre 2", rarity: "mythic" },
      })),
    );
  });

  it("plus de 12 mois : figée au plus haut rank connu", async () => {
    cards = [card(1, 700_000, "rare")];
    m.deezer[1] = { rank: 500_000, release_date: "2025-01-01" };
    await refreshProvisional(NOW);
    expect(updateOf(1)).toEqual({
      deezer_rank: 700_000,
      rarity: "rare",
      rarity_locked_at: NOW.toISOString(),
    });
    expect(m.notifs).toEqual([]);
  });

  it("carte des fêtes, après le 15 janvier : recalculée à la baisse puis figée", async () => {
    const jan20 = new Date("2027-01-20T03:00:00Z");
    cards = [card(1, 990_000, "mythic", "2026-12-20T00:00:00Z")];
    m.deezer[1] = { rank: 300_000, release_date: "1994-11-01" };
    const res = await refreshProvisional(jan20);
    expect(updateOf(1)).toEqual({
      deezer_rank: 300_000,
      rarity: "common",
      rarity_locked_at: jan20.toISOString(),
    });
    expect(res.raised).toBe(0);
    expect(m.notifs).toEqual([]);
  });

  it.each([
    "2026-12-25T03:00:00Z",
    "2027-01-01T03:00:00Z",
    "2027-01-14T03:00:00Z",
  ])("carte des fêtes, le %s : pas encore touchée", async (now) => {
    cards = [card(1, 990_000, "mythic", "2026-12-20T00:00:00Z")];
    m.deezer[1] = { rank: 1, release_date: "1994-11-01" };
    await refreshProvisional(new Date(now));
    expect(writes(m.sb, "cards", "update")).toEqual([]);
  });

  it("carte des fêtes d'une sortie récente : ne descend pas", async () => {
    cards = [card(1, 900_000, "epic", "2026-12-20T00:00:00Z")];
    m.deezer[1] = { rank: 100_000, release_date: "2026-11-15" };
    await refreshProvisional(new Date("2027-02-01T03:00:00Z"));
    expect(updateOf(1)).toMatchObject({ deezer_rank: 900_000, rarity: "epic" });
  });

  it("titre retiré de Deezer : carte ignorée, reste provisoire", async () => {
    cards = [card(1, 900_000, "epic")];
    const res = await refreshProvisional(NOW);
    expect(writes(m.sb, "cards", "update")).toEqual([]);
    expect(res).toEqual({ checked: 1, raised: 0 });
  });

  it("rank Deezer absent et sans date : figée sans baisse", async () => {
    cards = [card(1, 600_000, "uncommon")];
    m.deezer[1] = {};
    await refreshProvisional(NOW);
    expect(updateOf(1)).toEqual({
      deezer_rank: 600_000,
      rarity: "uncommon",
      rarity_locked_at: NOW.toISOString(),
    });
  });

  it("parcourt toutes les pages de 1000 cartes", async () => {
    cards = Array.from({ length: 1500 }, (_, i) => card(i + 1, 0, "common"));
    const res = await refreshProvisional(NOW);
    expect(res.checked).toBe(1500);
    const ranges = m.sb.calls
      .filter((q) => q.table === "cards" && arg(q, "range"))
      .map((q) => arg(q, "range"));
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("base qui ne renvoie rien : aucune carte, sans plantage", async () => {
    m.sb = fakeSupabase();
    expect(await refreshProvisional(NOW)).toEqual({ checked: 0, raised: 0 });
  });
});

describe("dailyCardsMaintenance", () => {
  beforeEach(() => {
    enrichPending.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("un jour ordinaire : enrichit, ne touche pas aux raretés", async () => {
    m.pending = { done: 3, found: 2, total: 3 };
    await dailyCardsMaintenance(new Date("2026-06-10T03:00:00Z"));
    expect(enrichPending).toHaveBeenCalledOnce();
    expect(m.sb.calls).toEqual([]);
  });

  it.each(["2026-06-01T03:00:00", "2027-01-15T03:00:00"])(
    "le %s : passe aussi les raretés provisoires",
    async (day) => {
      m.pending = { done: 0, found: 0, total: 0 };
      await dailyCardsMaintenance(new Date(day));
      expect(m.sb.calls.some((q) => q.table === "cards")).toBe(true);
    },
  );

  it("une erreur est journalisée, jamais levée", async () => {
    enrichPending.mockRejectedValueOnce(new Error("db down"));
    await expect(dailyCardsMaintenance()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("enqueueCardEnrichment", () => {
  it("dédoublonne, ignore les vides, n'enrichit que les titres jamais vérifiés", async () => {
    const asked = [];
    m.sb = fakeSupabase((q) => {
      asked.push(arg(q, "in")[1]);
      return {
        data: arg(q, "in")[1]
          .filter((id) => id !== 3)
          .map((id) => ({ id })),
      };
    });
    enqueueCardEnrichment([1, 2, 2, null, 0, 3]);
    enqueueCardEnrichment(undefined);
    await vi.waitFor(() => expect(m.enriched).toEqual([1, 2]));
    expect(asked).toEqual([[1, 2, 3]]);
    expect(arg(m.sb.calls[0], "is")).toEqual(["card_checked_at", null]);
  });

  it("par paquets de 50, ajouts pendant le traitement compris", async () => {
    m.sb = fakeSupabase((q) => ({
      data: arg(q, "in")[1].map((id) => ({ id })),
    }));
    const ids = Array.from({ length: 120 }, (_, i) => i + 1);
    enqueueCardEnrichment(ids);
    enqueueCardEnrichment([500]);
    await vi.waitFor(() => expect(m.enriched).toHaveLength(121));
    expect(m.sb.calls.map((q) => arg(q, "in")[1].length)).toEqual([50, 50, 21]);
  });

  it("erreur de base : journalisée, la file repart au prochain ajout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.sb = fakeSupabase(() => {
      throw new Error("db down");
    });
    enqueueCardEnrichment([1]);
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
    m.sb = fakeSupabase(() => ({ data: [{ id: 2 }] }));
    enqueueCardEnrichment([2]);
    await vi.waitFor(() => expect(m.enriched).toEqual([2]));
  });
});
