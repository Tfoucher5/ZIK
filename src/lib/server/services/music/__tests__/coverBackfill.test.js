import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({ dz: vi.fn(), token: vi.fn() }));
vi.mock("$lib/server/config.js", async () =>
  (await import("../../__tests__/fakeQuery.js")).fakeClients(h),
);
vi.mock("../deezerClient.js", () => ({ deezerFetch: h.dz }));
vi.mock("../spotify.js", () => ({ getSpotifyToken: h.token }));

const { backfillCovers } = await import("../coverBackfill.js");

const sp = (i) => ({ id: `s${i}`, external_id: `sp${i}`, source: "spotify" });
const dzT = (i) => ({ id: `d${i}`, external_id: `dz${i}`, source: "deezer" });
const written = () =>
  h.admin
    .of("tracks")
    .filter((q) => q.has("update"))
    .map((q) => [q.args("eq")[1], q.args("update")[0].cover_url]);
let spotifyRes;

beforeEach(() => {
  h.reset();
  h.dz.mockReset().mockResolvedValue({});
  h.token.mockReset().mockResolvedValue("tok");
  spotifyRes = (ids) => ({
    ok: true,
    json: async () => ({
      tracks: ids.map((id) => ({
        album: { images: [{ url: `${id}-640` }, { url: `${id}-300` }] },
      })),
    }),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      spotifyRes(new URL(url).searchParams.get("ids").split(",")),
    ),
  );
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());
// Écritures et lectures du catalogue : client admin seulement
afterEach(() => {
  expect(h.anon.queries).toEqual([]);
  vi.restoreAllMocks();
});

describe("backfillCovers", () => {
  it("Spotify par paquets de 50, pochette moyenne", async () => {
    h.tables.tracks = (q) =>
      q.has("limit")
        ? { data: Array.from({ length: 51 }, (_, i) => sp(i)) }
        : {};
    await backfillCovers(["p1"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    expect(written()).toHaveLength(51);
    expect(written()[0]).toEqual(["s0", "sp0-300"]);
  });

  it("Spotify : titre sans pochette ignoré, pochette unique gardée", async () => {
    h.tables.tracks = (q) => (q.has("limit") ? { data: [sp(1), sp(2)] } : {});
    spotifyRes = () => ({
      ok: true,
      json: async () => ({
        tracks: [{ album: { images: [{ url: "seule" }] } }, null],
      }),
    });
    await backfillCovers(["p1"]);
    expect(written()).toEqual([["s1", "seule"]]);
  });

  it("Spotify : un paquet refusé n'arrête pas le suivant", async () => {
    h.tables.tracks = (q) =>
      q.has("limit")
        ? { data: Array.from({ length: 52 }, (_, i) => sp(i)) }
        : {};
    const ok = spotifyRes;
    spotifyRes = (ids) => (ids.includes("sp0") ? { ok: false } : ok(ids));
    await backfillCovers(["p1"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(written()).toEqual([
      ["s50", "sp50-300"],
      ["s51", "sp51-300"],
    ]);
  });

  it("Spotify non configuré : Deezer traité quand même", async () => {
    h.token.mockRejectedValue(new Error("Spotify non configure"));
    h.dz.mockResolvedValue({ album: { cover_big: "big.jpg" } });
    h.tables.tracks = (q) => (q.has("limit") ? { data: [sp(1), dzT(1)] } : {});
    await backfillCovers(["p1"]);
    expect(written()).toEqual([["d1", "big.jpg"]]);
  });

  it("Deezer : un échec n'empêche pas les autres", async () => {
    h.dz.mockImplementation(async (p) => {
      if (p === "/track/dz2") throw new Error("down");
      return { album: { cover_xl: `${p}.jpg` } };
    });
    h.tables.tracks = (q) =>
      q.has("limit") ? { data: [1, 2, 3].map(dzT) } : {};
    await backfillCovers(["p1"]);
    expect(
      written()
        .map(([id]) => id)
        .sort(),
    ).toEqual(["d1", "d3"]);
  });

  it("rien à compléter : aucune requête externe", async () => {
    h.tables.tracks = { data: [] };
    await backfillCovers(["p1"]);
    expect(fetch).not.toHaveBeenCalled();
    expect(h.dz).not.toHaveBeenCalled();
  });

  it("playlist déjà en cours : pas de second passage simultané", async () => {
    let lache;
    h.tables.tracks = (q) =>
      q.has("limit") ? new Promise((r) => (lache = () => r({ data: [] }))) : {};
    const premier = backfillCovers(["p9"]);
    await backfillCovers(["p9"]);
    await new Promise((r) => setTimeout(r, 0));
    expect(h.admin.queries.filter((q) => q.has("limit"))).toHaveLength(1);
    lache();
    await premier;
    h.tables.tracks = { data: [] };
    await backfillCovers(["p9"]);
    expect(h.admin.queries.filter((q) => q.has("limit"))).toHaveLength(2);
  });

  it("base en panne : journalisé, verrou libéré", async () => {
    h.tables.tracks = () => {
      throw new Error("down");
    };
    await backfillCovers(["p1"]);
    expect(console.warn).toHaveBeenCalledWith(
      "[coverBackfill] erreur :",
      "down",
    );
    h.tables.tracks = { data: [] };
    await backfillCovers(["p1"]);
    expect(h.admin.queries).toHaveLength(2);
  });
});
