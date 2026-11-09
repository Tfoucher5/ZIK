import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetFake } from "../../__tests__/fakeSupabase.js";

const h = vi.hoisted(() => ({ refresh: vi.fn(), room: vi.fn() }));
vi.mock("$lib/server/config.js", async () => {
  const { fakeClient } = await import("../../__tests__/fakeSupabase.js");
  return { supabase: fakeClient(h) };
});
vi.mock("$lib/server/services/music/playlist.js", async () => ({
  ...(await import("../playlist.js")),
  refreshExpiredPreviews: h.refresh,
}));
vi.mock("$lib/server/services/rooms/customRoom.js", () => ({
  createCustomRoom: h.room,
}));

let ap;
const many = (name, n) => Array.from({ length: n }, () => ({ artist: name }));
const index = (tracks, fans) => {
  h.tables.tracks = (q) =>
    q.has("range") ? { data: q.has("range", 0) ? tracks : [] } : h.artistRows();
  h.tables.card_artists = (q) => ({ data: q.has("range", 0) ? fans : [] });
};

beforeEach(async () => {
  resetFake(h);
  vi.resetModules();
  ap = await import("../artistPages.js");
  h.refresh.mockReset();
  h.room.mockReset().mockImplementation((r) => r);
  h.artistRows = () => ({ data: [] });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-11-09T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("index des artistes", () => {
  it("10 titres et 50 000 fans minimum, du plus populaire au moins populaire", async () => {
    index(
      [
        ...many("Stromae", 12),
        ...many("Angèle", 10),
        ...many("Petit", 9),
        ...many("Compil", 30),
        ...many(" ", 20),
      ],
      [
        { name: "stromae", nb_fan: 2_000_000 },
        { name: "Angèle", nb_fan: 3_000_000 },
        { name: "Petit", nb_fan: 900_000 },
      ],
    );
    expect(await ap.listArtists()).toEqual([
      { slug: "angele", name: "Angèle", trackCount: 10, nbFan: 3_000_000 },
      { slug: "stromae", name: "Stromae", trackCount: 12, nbFan: 2_000_000 },
    ]);
    expect(
      h.calls
        .find((q) => q.table === "card_artists")
        .has("gte", "nb_fan", 50_000),
    ).toBe(true);
  });

  it("même slug : l'artiste le plus suivi gagne", async () => {
    index(
      [...many("Bigflo & Oli", 10), ...many("Bigflo et Oli", 10)],
      [
        { name: "Bigflo & Oli", nb_fan: 100_000 },
        { name: "Bigflo et Oli", nb_fan: 200_000 },
      ],
    );
    expect((await ap.listArtists()).map((a) => a.name)).toEqual([
      "Bigflo et Oli",
    ]);
  });

  it("lecture par pages de 1000 jusqu'à une page incomplète", async () => {
    const page1 = many("A", 1000);
    h.tables.tracks = (q) => ({
      data: q.has("range", 0)
        ? page1
        : q.has("range", 1000)
          ? many("A", 5)
          : [],
    });
    h.tables.card_artists = { data: [{ name: "A", nb_fan: 60_000 }] };
    expect((await ap.listArtists())[0].trackCount).toBe(1005);
  });

  it("index gardé 6 h, reconstruit ensuite", async () => {
    index(many("A", 10), [{ name: "A", nb_fan: 60_000 }]);
    await ap.listArtists();
    await ap.findArtist("a");
    const n = h.calls.length;
    vi.advanceTimersByTime(6 * 3600_000 + 1);
    await ap.listArtists();
    expect(h.calls.length).toBe(n + 2);
  });

  it("erreur de base : levée, puis nouvel essai au prochain appel", async () => {
    h.tables.tracks = { data: null, error: { message: "down" } };
    h.tables.card_artists = { data: [] };
    await expect(ap.listArtists()).rejects.toThrow("down");
    index(many("A", 10), [{ name: "A", nb_fan: 60_000 }]);
    expect(await ap.findArtist("a")).toMatchObject({ name: "A" });
    expect(await ap.findArtist("inconnu")).toBeNull();
  });
});

const titre = (id, o = {}) => ({
  id,
  artist: "Stromae",
  title: `T${id}`,
  cover_url: null,
  preview_url: "p",
  external_id: `dz${id}`,
  ...o,
});
const STROMAE = { slug: "stromae", name: "Stromae" };

describe("page d'un artiste", () => {
  beforeEach(() => {
    index(
      [...many("Stromae", 10), ...many("Angèle", 10), ...many("Orelsan", 10)],
      [
        { name: "Stromae", nb_fan: 1e6 },
        { name: "Angèle", nb_fan: 1e6 },
        { name: "Orelsan", nb_fan: 1e6 },
      ],
    );
    h.artistRows = () => ({
      data: [titre(1), titre(2, { cover_url: "c2" }), titre(3)],
    });
    h.tables.custom_playlist_tracks = (q) => {
      if (q.has("eq", "custom_playlists.is_official", true))
        return {
          data: [
            { track_id: 1, custom_title: "Corrigé faible", track_answers: [] },
            {
              track_id: 1,
              custom_title: "Corrigé",
              custom_artist: "S",
              track_answers: [{ value: "x" }],
            },
            { track_id: 3, track_answers: [] },
          ],
        };
      if (q.has("select", "playlist_id"))
        return { data: [{ playlist_id: "p1" }, { playlist_id: "p1" }] };
      return {
        data: [
          { tracks: { artist: "Orelsan" } },
          { tracks: { artist: "Angèle" } },
          { tracks: { artist: "Angèle" } },
          { tracks: { artist: "Stromae" } },
          { tracks: { artist: "Hors index" } },
          { tracks: null },
        ],
      };
    };
  });

  it("titres corrigés, pochette, artistes proches par fréquence", async () => {
    expect(await ap.artistPage(STROMAE)).toEqual({
      titles: ["Corrigé", "T2", "T3"],
      cover: "c2",
      related: [
        { slug: "angele", name: "Angèle" },
        { slug: "orelsan", name: "Orelsan" },
      ],
    });
  });

  it("aucune playlist commune : pas d'artistes proches", async () => {
    const avant = h.tables.custom_playlist_tracks;
    h.tables.custom_playlist_tracks = (q) =>
      q.has("select", "playlist_id") ? { data: null } : avant(q);
    expect((await ap.artistPage(STROMAE)).related).toEqual([]);
  });

  it("titres en erreur : levée", async () => {
    h.artistRows = () => ({ data: null, error: { message: "down" } });
    await expect(ap.artistPage(STROMAE)).rejects.toThrow("down");
  });

  it("room de 10 titres au plus, extraits rafraîchis, corrections appliquées", async () => {
    h.artistRows = () => ({
      data: Array.from({ length: 15 }, (_, i) => titre(i + 1)),
    });
    vi.spyOn(Math, "random").mockReturnValue(0.5); // tri stable : titres 1 à 10
    const room = await ap.startArtistRoom(STROMAE);
    vi.restoreAllMocks();
    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(h.refresh.mock.calls[0][0]).toHaveLength(10);
    expect(room).toMatchObject({ name: "Blind test Stromae", maxRounds: 10 });
    expect(room.tracks).toHaveLength(10);
    expect(room.tracks.map((t) => t.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(room.tracks[0]).toMatchObject({ title: "Corrigé", artist: "S" });
    expect(room.tracks[1]).toMatchObject({ title: "T2", artist: "Stromae" });
  });
});
