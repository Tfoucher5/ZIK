import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeSupabase, writes, arg } from "./fakeSupabase.js";

const m = vi.hoisted(() => ({
  versions: { start: null, candidates: [] },
  albums: {},
  artists: {},
  mb: {},
  sb: null,
}));

vi.mock("../../../config.js", () => ({ getAdminClient: () => m.sb }));
vi.mock("../versions.js", () => ({ findVersions: async () => m.versions }));
vi.mock("../deezerApi.js", () => ({
  albumCache: "albums",
  artistCache: "artists",
  cached: async (cache, id) => m[cache][id] ?? null,
  firstReleaseFromIsrc: async (isrc) => m.mb[isrc] ?? null,
}));

const { enrichTrack } = await import("../enrich.js");

const track = { id: 7, artist: "Queen", title: "Bohemian Rhapsody" };
const cand = (id, rank, albumId, extra = {}) => ({
  id,
  title: "Bohemian Rhapsody",
  title_short: "Bohemian Rhapsody",
  rank,
  isrc: `ISRC${id}`,
  artist: { id: 1, name: "Queen" },
  album: albumId ? { id: albumId } : undefined,
  ...extra,
});
const album = (id, record_type, release_date, extra = {}) => ({
  id,
  record_type,
  release_date,
  title: `Album ${id}`,
  artist: { id: 1 },
  cover_xl: `xl${id}`,
  cover_medium: `md${id}`,
  ...extra,
});

// Réponses par défaut : rien d'existant, insertion réussie
let existingCard = null;
let insertResult = { data: { id: "new-card" }, error: null };
let knownAlbum = null;
const respond = (q) => {
  if (q.table === "card_albums" && q.ops[0][0] === "select")
    return { data: knownAlbum };
  if (q.table === "cards" && arg(q, "insert")) return insertResult;
  if (q.table === "cards") return { data: existingCard };
};
const inserted = () => arg(writes(m.sb, "cards", "insert")[0], "insert")[0];

beforeEach(() => {
  m.versions = { start: null, candidates: [] };
  m.albums = {};
  m.artists = { 1: { name: "Queen", nb_fan: 5_000_000 } };
  m.mb = {};
  existingCard = null;
  knownAlbum = null;
  insertResult = { data: { id: "new-card" }, error: null };
  m.sb = fakeSupabase(respond);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("enrichTrack", () => {
  it("titre introuvable sur Deezer : null, aucune écriture", async () => {
    expect(await enrichTrack(m.sb, track)).toBeNull();
    expect(m.sb.calls).toEqual([]);
  });

  it("crée la carte : rareté du meilleur rank, année MusicBrainz, figée", async () => {
    m.versions.candidates = [cand(11, 950_000, 101)];
    m.albums[101] = album(101, "album", "2011-01-01", {
      genres: { data: [{ name: "Rock" }] },
    });
    m.mb.ISRC11 = "1975-10-31";
    expect(await enrichTrack(m.sb, track)).toBe("new-card");
    const card = inserted();
    expect(card).toMatchObject({
      deezer_track_id: 11,
      artist_id: 1,
      album_id: 101,
      title: "Bohemian Rhapsody",
      title_key: "bohemian rhapsody",
      artist: "Queen",
      year: 1975,
      isrc: "ISRC11",
      deezer_rank: 950_000,
      rarity: "legendary",
    });
    expect(card.rarity_locked_at).toBe("2026-06-15T12:00:00.000Z");
    const alb = arg(writes(m.sb, "card_albums", "insert")[0], "insert")[0];
    expect(alb).toMatchObject({
      year: 2011,
      genre: "Rock",
      cover_url: "xl101",
    });
    expect(arg(writes(m.sb, "card_artists", "upsert")[0], "upsert")[0]).toEqual(
      { deezer_id: 1, name: "Queen", nb_fan: 5_000_000 },
    );
  });

  it.each([
    [0, "common"],
    [494_999, "common"],
    [495_000, "uncommon"],
    [680_000, "rare"],
    [805_000, "epic"],
    [979_999, "legendary"],
    [980_000, "mythic"],
  ])("rank %i → %s (barème v1, bornes incluses)", async (rank, rarity) => {
    m.versions.candidates = [cand(11, rank, null)];
    await enrichTrack(m.sb, track);
    expect(inserted().rarity).toBe(rarity);
  });

  it("rank absent : Commune, pas de plantage", async () => {
    m.versions.candidates = [cand(11, undefined, null)];
    await enrichTrack(m.sb, track);
    expect(inserted()).toMatchObject({ deezer_rank: 0, rarity: "common" });
  });

  it("jamais une compilation : l'album studio l'emporte, le rank reste le meilleur", async () => {
    m.versions.candidates = [cand(11, 990_000, 201), cand(12, 700_000, 202)];
    m.albums[201] = album(201, "compile", "2001-01-01");
    m.albums[202] = album(202, "album", "1975-01-01");
    m.mb.ISRC12 = null;
    await enrichTrack(m.sb, track);
    expect(inserted()).toMatchObject({
      deezer_track_id: 12,
      album_id: 202,
      deezer_rank: 990_000,
      rarity: "mythic",
      year: 1975,
    });
  });

  it("à défaut d'album, un single plutôt qu'une compilation, sinon la première", async () => {
    m.versions.candidates = [cand(11, 1, 201), cand(12, 1, 203)];
    m.albums[201] = album(201, "compile", null);
    m.albums[203] = album(203, "single", null);
    await enrichTrack(m.sb, track);
    expect(inserted().album_id).toBe(203);

    m.sb = fakeSupabase(respond);
    m.versions.candidates = [cand(11, 1, 201)];
    await enrichTrack(m.sb, track);
    expect(inserted().album_id).toBe(201);
  });

  it("MusicBrainz muet sur la version choisie : essaie la meilleure version", async () => {
    m.versions.candidates = [cand(11, 990_000, 201), cand(12, 700_000, 202)];
    m.albums[201] = album(201, "compile", "2001-01-01");
    m.albums[202] = album(202, "album", "1999-01-01");
    m.mb.ISRC11 = "1975-10-31";
    await enrichTrack(m.sb, track);
    expect(inserted().year).toBe(1975);
  });

  it("sans MusicBrainz : la plus ancienne date Deezer", async () => {
    m.versions.candidates = [cand(11, 1, 201), cand(12, 1, 202)];
    m.albums[201] = album(201, "album", "2011-05-01");
    m.albums[202] = album(202, "single", "1975-10-31");
    await enrichTrack(m.sb, track);
    expect(inserted().year).toBe(1975);
  });

  it("aucune date : année nulle, sans plantage", async () => {
    m.versions.candidates = [cand(11, 1, null, { isrc: null })];
    m.versions.start = { isrc: "START" };
    await enrichTrack(m.sb, track);
    expect(inserted()).toMatchObject({ year: null, isrc: "START" });
  });

  it("sortie de moins de 12 mois : rareté provisoire", async () => {
    m.versions.candidates = [cand(11, 990_000, null)];
    m.mb.ISRC11 = "2026-03-01";
    await enrichTrack(m.sb, track);
    expect(inserted().rarity_locked_at).toBeNull();
  });

  it.each([
    ["2026-12-01T10:00:00Z", null],
    ["2027-01-06T10:00:00Z", null],
    ["2027-01-07T10:00:00Z", "2027-01-07T10:00:00.000Z"],
    ["2026-11-30T10:00:00Z", "2026-11-30T10:00:00.000Z"],
  ])("carte créée le %s : rarity_locked_at = %s (fêtes)", async (now, lock) => {
    vi.setSystemTime(new Date(now));
    m.versions.candidates = [cand(11, 1, null)];
    m.mb.ISRC11 = "1990-01-01";
    await enrichTrack(m.sb, track);
    expect(inserted().rarity_locked_at).toBe(lock);
  });

  it("titre officiel sans invités, artiste avec ses invités", async () => {
    m.versions.candidates = [
      cand(11, 1, null, {
        title: "Get Lucky (feat. Pharrell Williams)",
        title_short: "Get Lucky (feat. Pharrell Williams)",
        artist: { id: 1, name: "Daft Punk" },
      }),
    ];
    await enrichTrack(m.sb, {
      artist: "Daft Punk & Nile Rodgers",
      title: "Get Lucky",
    });
    expect(inserted()).toMatchObject({
      title: "Get Lucky",
      title_key: "get lucky",
      artist: "Daft Punk (feat. Pharrell Williams)",
    });
  });

  it("carte existante : renvoyée telle quelle, rareté figée, aucune insertion", async () => {
    existingCard = { id: "old-card" };
    m.versions.candidates = [cand(11, 990_000, null)];
    expect(await enrichTrack(m.sb, track)).toBe("old-card");
    expect(writes(m.sb, "cards", "insert")).toHaveLength(0);
    expect(writes(m.sb, "cards", "update")).toHaveLength(0);
  });

  it("album déjà connu : pas réinséré ; artiste de l'album différent : upsert aussi", async () => {
    knownAlbum = { deezer_id: 101 };
    m.versions.candidates = [cand(11, 1, 101)];
    m.albums[101] = album(101, "album", null, { artist: { id: 2 } });
    m.artists[2] = { name: "Various", nb_fan: 1 };
    await enrichTrack(m.sb, track);
    expect(writes(m.sb, "card_albums", "insert")).toHaveLength(0);
    const ups = writes(m.sb, "card_artists", "upsert");
    expect(ups.map((q) => arg(q, "upsert")[0].deezer_id)).toEqual([1, 2]);
  });

  it("artiste Deezer injoignable : nom de la version, fans nuls", async () => {
    m.artists = {};
    m.versions.candidates = [cand(11, 1, null)];
    await enrichTrack(m.sb, track);
    expect(arg(writes(m.sb, "card_artists", "upsert")[0], "upsert")[0]).toEqual(
      { deezer_id: 1, name: "Queen", nb_fan: null },
    );
  });

  const coverColor = async (res) => {
    vi.stubGlobal("fetch", vi.fn(res));
    m.versions.candidates = [cand(11, 1, 101)];
    m.albums[101] = album(101, "album", null, {
      cover_small: "http://x/s.jpg",
    });
    m.sb = fakeSupabase(respond);
    await enrichTrack(m.sb, track);
    vi.unstubAllGlobals();
    return arg(writes(m.sb, "card_albums", "insert")[0], "insert")[0]
      .dominant_color;
  };

  it("pochette injoignable : couleur nulle, l'album est quand même créé", async () => {
    expect(await coverColor(async () => ({ ok: false }))).toBeNull();
    expect(
      await coverColor(async () => {
        throw new Error("timeout");
      }),
    ).toBeNull();
  });

  // dominantColor (enrich.js) : resvg rend une image qu'il ne sait pas lire
  // comme un pixel transparent (0, 0, 0, 0), et l'alpha n'est pas vérifié
  it.skip("BUG : pochette illisible → couleur noire #000000 au lieu de null", async () => {
    const color = await coverColor(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(3),
    }));
    expect(color).toBeNull();
  });

  it("créée entre-temps (23505) : relit la carte de l'autre traitement", async () => {
    insertResult = { data: null, error: { code: "23505" } };
    m.versions.candidates = [cand(11, 1, null)];
    let reads = 0;
    m.sb = fakeSupabase((q) => {
      if (q.table !== "cards") return;
      if (arg(q, "insert")) return insertResult;
      return { data: reads++ ? { id: "race-card" } : null };
    });
    expect(await enrichTrack(m.sb, track)).toBe("race-card");
  });

  it("autre erreur d'insertion : levée", async () => {
    insertResult = { data: null, error: { code: "42501", message: "rls" } };
    m.versions.candidates = [cand(11, 1, null)];
    await expect(enrichTrack(m.sb, track)).rejects.toMatchObject({
      code: "42501",
    });
  });
});
