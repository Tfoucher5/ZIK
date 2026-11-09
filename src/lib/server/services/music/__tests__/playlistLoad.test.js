import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetFake } from "../../__tests__/fakeSupabase.js";

const h = vi.hoisted(() => ({ deezer: vi.fn(), itunes: vi.fn() }));
vi.mock("../../../config.js", async () => {
  const { fakeClient } = await import("../../__tests__/fakeSupabase.js");
  const c = fakeClient(h);
  return { supabase: c, getAdminClient: () => c };
});
vi.mock("../deezer.js", async (orig) => ({
  ...(await orig()),
  fetchDeezerTrackPreview: h.deezer,
  iTunesPreviewSearch: h.itunes,
}));

const { refreshExpiredPreviews, loadPlaylist, calcSpeedBonus } =
  await import("../playlist.js");
const { playlistCache, customRooms, dbRooms } =
  await import("../../../state.js");

const NOW = Date.parse("2026-11-09T12:00:00Z");
const DAY = 86_400_000;
const sec = (ms) => Math.floor(ms / 1000);
const dzUrl = (expMs) => `https://cdn/p.mp3?hdnea=exp=${sec(expMs)}~acl=x`;
const updates = () =>
  h.calls
    .filter((q) => q.table === "tracks" && q.has("update"))
    .map((q) => ({ id: q.ops.find(([o]) => o === "eq")[2], ...q.ops[0][1] }));
const meta = (id, o = {}) => ({
  id,
  artist: "A",
  title: "T",
  external_id: `dz${id}`,
  preview_url: dzUrl(NOW + DAY),
  preview_expires_at: null,
  ...o,
});

beforeEach(() => {
  resetFake(h);
  h.deezer.mockReset().mockResolvedValue(null);
  h.itunes.mockReset().mockResolvedValue(null);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

describe("calcSpeedBonus", () => {
  it.each([
    [0, 2],
    [9.99, 2],
    [10, 1],
    [19.99, 1],
    [20, 0],
    [60, 0],
  ])("%s s → %i", (t, bonus) => expect(calcSpeedBonus(t)).toBe(bonus));
});

describe("refreshExpiredPreviews : extraits Deezer expirés", () => {
  it("expire dans plus de 7 jours : rien", async () => {
    await refreshExpiredPreviews([
      {
        tracks: meta(1, {
          preview_expires_at: new Date(NOW + 7 * DAY).toISOString(),
        }),
      },
      { tracks: meta(2, { preview_url: dzUrl(NOW + 8 * DAY) }) },
      { tracks: meta(3, { preview_url: null }) },
    ]);
    expect(h.deezer).not.toHaveBeenCalled();
    expect(updates()).toEqual([]);
  });

  it("expire dans moins de 7 jours : nouveau lien Deezer écrit et propagé", async () => {
    const fresh = dzUrl(NOW + 30 * DAY);
    h.deezer.mockResolvedValue(fresh);
    const a = { tracks: meta(1) };
    const b = { tracks: meta(1) }; // même titre dans une autre playlist
    await refreshExpiredPreviews([a, b]);
    expect(h.deezer).toHaveBeenCalledTimes(1);
    expect(h.deezer).toHaveBeenCalledWith("dz1");
    expect(updates()).toEqual([
      {
        id: 1,
        preview_url: fresh,
        preview_expires_at: new Date(sec(NOW + 30 * DAY) * 1000).toISOString(),
      },
    ]);
    expect(a.tracks.preview_url).toBe(fresh);
    expect(b.tracks.preview_url).toBe(fresh);
  });

  it("lien sans jeton ni date : traité comme expiré", async () => {
    h.deezer.mockResolvedValue("https://cdn/sans-jeton.mp3");
    await refreshExpiredPreviews([
      { tracks: meta(1, { preview_url: "https://cdn/x.mp3" }) },
    ]);
    expect(updates()[0].preview_expires_at).toBe("2099-01-01T00:00:00.000Z");
  });

  it("Deezer muet : repli iTunes avec les noms corrigés", async () => {
    h.itunes.mockResolvedValue("https://itunes/p.m4a");
    await refreshExpiredPreviews([
      { custom_artist: "Vrai A", custom_title: null, tracks: meta(1) },
    ]);
    expect(h.itunes).toHaveBeenCalledWith("Vrai A", "T");
    expect(updates()[0].preview_url).toBe("https://itunes/p.m4a");
  });

  it("sans id Deezer : iTunes directement", async () => {
    h.itunes.mockResolvedValue("https://itunes/p.m4a");
    await refreshExpiredPreviews([{ tracks: meta(1, { external_id: null }) }]);
    expect(h.deezer).not.toHaveBeenCalled();
  });

  it("aucune source : lien inchangé, rien écrit", async () => {
    const r = { tracks: meta(1) };
    const avant = r.tracks.preview_url;
    await refreshExpiredPreviews([r]);
    expect(updates()).toEqual([]);
    expect(r.tracks.preview_url).toBe(avant);
  });

  it("un échec n'empêche pas les autres titres, par paquets de 8", async () => {
    h.deezer.mockImplementation(async (id) => {
      if (id === "dz3") throw new Error("down");
      return dzUrl(NOW + 30 * DAY);
    });
    await refreshExpiredPreviews(
      Array.from({ length: 10 }, (_, i) => ({ tracks: meta(i + 1) })),
    );
    expect(h.deezer).toHaveBeenCalledTimes(10);
    expect(
      updates()
        .map((u) => u.id)
        .sort((x, y) => x - y),
    ).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10]);
  });
});

const row = (i, o = {}) => ({
  created_at: "2026-01-01",
  track_answers: [],
  tracks: { id: `t${i}`, artist: `Artiste ${i}`, title: `Titre ${i}`, ...o },
});

describe("loadPlaylist", () => {
  const ROOM = "test-room";
  beforeEach(() => {
    delete customRooms[ROOM];
    delete playlistCache[ROOM];
    delete dbRooms[ROOM];
  });

  it("room personnalisée : ses titres, sans base", async () => {
    customRooms[ROOM] = { tracks: ["x"] };
    expect(await loadPlaylist(ROOM)).toEqual(["x"]);
    expect(h.calls).toEqual([]);
  });

  it("cache utilisé, sauf en lancement de partie", async () => {
    playlistCache[ROOM] = [{ title: "cache" }];
    expect(await loadPlaylist(ROOM)).toEqual([{ title: "cache" }]);
    expect(h.calls).toEqual([]);
    // Room inconnue en base : la dernière version connue plutôt que rien
    expect(await loadPlaylist(ROOM, { fresh: true })).toEqual([
      { title: "cache" },
    ]);
  });

  it("room inconnue et pas de cache : []", async () => {
    expect(await loadPlaylist(ROOM)).toEqual([]);
  });

  it("plusieurs playlists : titres dédoublonnés et mis en cache", async () => {
    dbRooms[ROOM] = { id: 9 };
    h.tables.room_playlists = {
      data: [{ playlist_id: "p1" }, { playlist_id: "p2" }],
    };
    h.tables.custom_playlist_tracks = {
      data: [row(1), row(2), row(1, { id: "autre" }), row(3)],
    };
    const tracks = await loadPlaylist(ROOM);
    expect(tracks.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(playlistCache[ROOM]).toBe(tracks);
    const q = h.calls.find((c) => c.table === "custom_playlist_tracks");
    expect(q.ops.find(([o]) => o === "in")).toEqual([
      "in",
      "playlist_id",
      ["p1", "p2"],
    ]);
  });

  it("moins de 3 titres via room_playlists : repli sur playlist_id", async () => {
    dbRooms[ROOM] = { id: 9, playlist_id: "legacy" };
    h.tables.room_playlists = { data: [{ playlist_id: "p1" }] };
    h.tables.custom_playlist_tracks = (q) =>
      q.has("eq", "playlist_id", "legacy")
        ? { data: [row(1), row(2), row(3)] }
        : { data: [row(1)] };
    expect((await loadPlaylist(ROOM)).map((t) => t.id)).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
  });

  it("room_playlists en panne : repli sur playlist_id", async () => {
    dbRooms[ROOM] = { id: 9, playlist_id: "legacy" };
    h.tables.room_playlists = () => {
      throw new Error("down");
    };
    h.tables.custom_playlist_tracks = { data: [row(1), row(2), row(3)] };
    expect(await loadPlaylist(ROOM)).toHaveLength(3);
  });

  it("playlist legacy trop courte ou en panne : [] ou cache", async () => {
    dbRooms[ROOM] = { id: 9, playlist_id: "legacy" };
    h.tables.custom_playlist_tracks = { data: [row(1), row(2)] };
    expect(await loadPlaylist(ROOM)).toEqual([]);
    h.tables.custom_playlist_tracks = () => {
      throw new Error("down");
    };
    playlistCache[ROOM] = [{ title: "ancien" }];
    expect(await loadPlaylist(ROOM, { fresh: true })).toEqual([
      { title: "ancien" },
    ]);
  });

  it("room sans aucune playlist : []", async () => {
    dbRooms[ROOM] = { id: 9 };
    h.tables.room_playlists = { data: [] };
    expect(await loadPlaylist(ROOM)).toEqual([]);
  });
});
