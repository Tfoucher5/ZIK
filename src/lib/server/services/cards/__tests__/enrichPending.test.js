import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeSupabase, arg, has } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({ sb: null, found: new Set(), fail: new Set() }));

vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));
// Une carte par titre trouvé, une erreur pour les titres en échec
vi.mock("../versions.js", () => ({
  findVersions: async (t) => {
    if (m.fail.has(t.id)) throw new Error("deezer down");
    return {
      start: null,
      candidates: m.found.has(t.id)
        ? [{ id: t.id, title: t.title, rank: 1, artist: { id: t.id } }]
        : [],
    };
  },
}));
vi.mock("../deezerApi.js", () => ({
  albumCache: null,
  artistCache: null,
  cached: async () => null,
  firstReleaseFromIsrc: async () => null,
}));

const { enrichPending, enrichOne, TRACK_FIELDS } = await import("../enrich.js");

const tracks = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    artist: "A",
    title: `T${i + 1}`,
  }));

function db(rows) {
  return fakeSupabase((q) => {
    if (q.table === "tracks" && arg(q, "select")?.[1]?.head)
      return { count: rows.length };
    if (q.table === "tracks" && arg(q, "select")?.[0] === TRACK_FIELDS) {
      const after = arg(q, "gt")?.[1] ?? 0;
      const limit = arg(q, "limit")[0];
      return { data: rows.filter((r) => r.id > after).slice(0, limit) };
    }
    if (q.table === "cards" && has(q, "insert"))
      return { data: { id: `card-${arg(q, "insert")[0].deezer_track_id}` } };
  });
}

beforeEach(() => {
  m.found = new Set();
  m.fail = new Set();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("enrichOne", () => {
  const marked = (sb) =>
    sb.calls.filter((q) => q.table === "tracks" && has(q, "update"));

  it("marque le titre vérifié avec sa carte", async () => {
    m.sb = db([]);
    m.found = new Set([7]);
    expect(await enrichOne(m.sb, { id: 7, artist: "A", title: "T" })).toBe(
      "card-7",
    );
    const [up] = marked(m.sb);
    expect(arg(up, "update")[0]).toMatchObject({ card_id: "card-7" });
    expect(arg(up, "update")[0].card_checked_at).toMatch(/^\d{4}-/);
    expect(arg(up, "eq")).toEqual(["id", 7]);
  });

  it("erreur pendant l'enrichissement : journalisée, titre marqué sans carte", async () => {
    m.sb = db([]);
    m.fail = new Set([7]);
    expect(await enrichOne(m.sb, { id: 7, artist: "A", title: "T" })).toBe(
      null,
    );
    expect(console.error).toHaveBeenCalled();
    expect(arg(marked(m.sb)[0], "update")[0].card_id).toBeNull();
  });
});

describe("enrichPending", () => {
  it("parcourt tous les titres par paquets, avec un curseur sur l'id", async () => {
    const rows = tracks(45);
    m.sb = db(rows);
    m.found = new Set([1, 2, 44]);
    m.fail = new Set([3]);
    const progress = [];
    const res = await enrichPending({
      concurrency: 2,
      onProgress: (p) => progress.push(p),
    });
    expect(res).toEqual({ done: 45, found: 3, total: 45 });
    expect(progress.at(-1)).toEqual(res);
    expect(progress[0]).toEqual({ done: 2, found: 2, total: 45 });

    const reads = m.sb.calls.filter(
      (q) => q.table === "tracks" && arg(q, "select")?.[0] === TRACK_FIELDS,
    );
    // 20 + 20 + 5, puis un paquet vide qui arrête la boucle
    expect(reads.map((q) => arg(q, "gt")?.[1] ?? null)).toEqual([
      null,
      20,
      40,
      45,
    ]);
    // Chaque titre est marqué vérifié, même en échec
    const marked = m.sb.calls.filter(
      (q) => q.table === "tracks" && has(q, "update"),
    );
    expect(marked).toHaveLength(45);
  });

  it("par défaut, ne reprend un échec qu'après 30 jours", async () => {
    m.sb = db([]);
    await enrichPending();
    const filter = arg(m.sb.calls[0], "or")[0];
    expect(filter).toMatch(
      /^card_checked_at\.is\.null,and\(card_id\.is\.null,card_checked_at\.lt\.\d{4}-/,
    );
    const since = new Date(filter.match(/lt\.(.+)\)$/)[1]);
    const days = (Date.now() - since) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it("retryMissing : reprend tous les titres sans carte", async () => {
    m.sb = db([]);
    const res = await enrichPending({ retryMissing: true });
    expect(arg(m.sb.calls[0], "or")[0]).toBe(
      "card_checked_at.is.null,card_id.is.null",
    );
    expect(res).toEqual({ done: 0, found: 0, total: 0 });
  });

  it("erreur de lecture : levée", async () => {
    m.sb = fakeSupabase((q) =>
      arg(q, "select")?.[1]?.head
        ? { count: 1 }
        : { data: null, error: { message: "db down" } },
    );
    await expect(enrichPending()).rejects.toMatchObject({ message: "db down" });
  });
});
