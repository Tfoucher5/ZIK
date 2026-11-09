import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ fetch: vi.fn(), enqueue: vi.fn() }));
vi.mock("../music/deezerClient.js", () => ({ deezerFetch: m.fetch }));
vi.mock("../cards/maintenance.js", () => ({
  enqueueCardEnrichment: m.enqueue,
}));

const {
  mapDeezerChartTracks,
  getDayNumber,
  getOrCreateDailySong,
  refreshZiklePool,
} = await import("../zikle.js");

describe("mapDeezerChartTracks", () => {
  it("filtre les titres sans preview et mappe les champs Deezer", () => {
    const json = {
      data: [
        {
          id: 111,
          title: "Titre A",
          artist: { name: "Artiste A" },
          preview: "https://cdn.deezer.com/a.mp3",
          album: { cover_xl: "https://cdn.deezer.com/a.jpg" },
        },
        {
          id: 222,
          title: "Sans preview",
          artist: { name: "Artiste B" },
          preview: null,
          album: {},
        },
      ],
    };
    const rows = mapDeezerChartTracks(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      artist: "Artiste A",
      title: "Titre A",
      preview_url: "https://cdn.deezer.com/a.mp3",
      cover_url: "https://cdn.deezer.com/a.jpg",
      external_id: "111",
      source: "deezer",
    });
  });
  it("tableau vide si data absent", () => {
    expect(mapDeezerChartTracks({})).toEqual([]);
  });
});

describe("getDayNumber", () => {
  it("renvoie le count exact", async () => {
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          lte: vi.fn().mockResolvedValue({ count: 47, error: null }),
        })),
      })),
    };
    expect(await getDayNumber(sb, "2026-08-04")).toBe(47);
  });
});

describe("getOrCreateDailySong", () => {
  it("renvoie null si le pool est épuisé (RPC ne renvoie aucune ligne)", async () => {
    const sb = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) };
    expect(await getOrCreateDailySong(sb)).toBeNull();
  });
  it("renvoie date/trackId depuis la RPC", async () => {
    const sb = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ date: "2026-08-04", track_id: "abc-123", is_new: true }],
        error: null,
      }),
    };
    expect(await getOrCreateDailySong(sb)).toEqual({
      date: "2026-08-04",
      trackId: "abc-123",
    });
  });
  it("erreur de la RPC : levée", async () => {
    const sb = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("x") }),
    };
    await expect(getOrCreateDailySong(sb)).rejects.toThrow("x");
  });
  it("ligne sans track_id : null", async () => {
    const sb = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ date: "2026-11-09" }],
        error: null,
      }),
    };
    expect(await getOrCreateDailySong(sb)).toBeNull();
  });
});

describe("getDayNumber : erreur", () => {
  it("levée", async () => {
    const sb = {
      from: () => ({
        select: () => ({
          lte: async () => ({ count: null, error: new Error("y") }),
        }),
      }),
    };
    await expect(getDayNumber(sb, "2026-11-09")).rejects.toThrow("y");
  });
});

describe("mapDeezerChartTracks : expiration de l'extrait", () => {
  const chart = (preview, album = {}) => ({
    data: [{ id: 1, title: "T", artist: { name: "A" }, preview, album }],
  });
  it("lit l'expiration du jeton hdnea", () => {
    const [r] = mapDeezerChartTracks(
      chart("https://cdn/x.mp3?hdnea=exp=1767225600~acl=x"),
    );
    expect(r.preview_expires_at).toBe("2026-01-01T00:00:00.000Z");
  });
  it("sans jeton : permanent ; pochette big en repli", () => {
    const [r] = mapDeezerChartTracks(
      chart("https://cdn/x.mp3", { cover_big: "big.jpg" }),
    );
    expect(r.preview_expires_at).toBe("2099-01-01T00:00:00.000Z");
    expect(r.cover_url).toBe("big.jpg");
  });
  it("sans artiste, sans titre ou entrée nulle : écarté", () => {
    expect(
      mapDeezerChartTracks({
        data: [
          null,
          { id: 1, title: "T", preview: "p" },
          { id: 2, artist: { name: "A" }, preview: "p" },
        ],
      }),
    ).toEqual([]);
    expect(mapDeezerChartTracks(null)).toEqual([]);
  });
});

describe("refreshZiklePool", () => {
  const NOW = Date.parse("2026-11-09T10:00:00Z");
  const DAY = 86_400_000;
  const chart = {
    data: [
      { id: 5, title: "T", artist: { name: "A" }, preview: "https://cdn/p" },
    ],
  };
  let latest, resolved, insert;
  const sb = () => {
    const q = {
      select: () => q,
      order: () => q,
      limit: () => q,
      maybeSingle: async () => ({ data: latest }),
      upsert: vi.fn(async (...a) => {
        insert.calls.push(a);
        return { error: insert.error };
      }),
    };
    return { from: () => q, rpc: vi.fn(async () => resolved) };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    m.fetch.mockReset().mockResolvedValue(chart);
    m.enqueue.mockReset();
    latest = null;
    resolved = { data: ["t1"], error: null };
    insert = { calls: [], error: null };
  });
  afterEach(() => vi.useRealTimers());

  it("réserve remplie il y a moins de 7 jours : rien", async () => {
    latest = { added_at: new Date(NOW - 7 * DAY + 1).toISOString() };
    expect(await refreshZiklePool(sb())).toEqual({
      refreshed: false,
      added: 0,
    });
    expect(m.fetch).not.toHaveBeenCalled();
  });
  it("7 jours pile : remplie, en appel de fond", async () => {
    latest = { added_at: new Date(NOW - 7 * DAY).toISOString() };
    const c = sb();
    expect(await refreshZiklePool(c)).toEqual({ refreshed: true, added: 1 });
    expect(m.fetch).toHaveBeenCalledWith("/chart/0/tracks?limit=100", {
      bulk: true,
    });
    expect(c.rpc).toHaveBeenCalledWith("resolve_tracks", {
      p_tracks: [
        {
          artist: "A",
          title: "T",
          preview_url: "https://cdn/p",
          preview_expires_at: "2099-01-01T00:00:00.000Z",
          cover_url: null,
          external_id: "5",
          source: "deezer",
        },
      ],
    });
    expect(m.enqueue).toHaveBeenCalledWith(["t1"]);
    expect(insert.calls).toEqual([
      [
        [{ track_id: "t1" }],
        { onConflict: "track_id", ignoreDuplicates: true },
      ],
    ]);
  });
  it("réserve vide : remplie", async () => {
    expect((await refreshZiklePool(sb())).refreshed).toBe(true);
  });
  it("forcée : ne regarde pas la date", async () => {
    latest = { added_at: new Date(NOW).toISOString() };
    expect((await refreshZiklePool(sb(), true)).refreshed).toBe(true);
  });
  it("classement Deezer vide : rien", async () => {
    m.fetch.mockResolvedValue({ data: [] });
    expect(await refreshZiklePool(sb())).toEqual({
      refreshed: false,
      added: 0,
    });
  });
  it("aucun titre résolu : rien inséré", async () => {
    resolved = { data: [], error: null };
    expect((await refreshZiklePool(sb())).refreshed).toBe(false);
    expect(insert.calls).toEqual([]);
  });
  it("erreur de résolution : levée", async () => {
    resolved = { data: null, error: new Error("rpc") };
    await expect(refreshZiklePool(sb())).rejects.toThrow("rpc");
  });
  it("erreur d'insertion : levée", async () => {
    insert.error = new Error("ins");
    await expect(refreshZiklePool(sb())).rejects.toThrow("ins");
  });
});
