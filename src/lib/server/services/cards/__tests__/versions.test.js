import { describe, it, expect, beforeEach, vi } from "vitest";

const api = vi.hoisted(() => ({
  routes: [],
  paths: [],
  isrc: null,
  ytTitle: null,
}));

vi.mock("../deezerApi.js", () => ({
  // Première route dont le motif apparaît dans la requête décodée
  deezer: async (path) => {
    const p = decodeURIComponent(path);
    api.paths.push(p);
    const hit = api.routes.find(([m]) => p.includes(m));
    return hit ? hit[1] : null;
  },
  spotifyIsrc: async () => api.isrc,
  youtubeTitle: async () => api.ytTitle,
}));

const { findVersions } = await import("../versions.js");

let next = 1;
const v = (artist, title, rank, extra = {}) => ({
  id: next++,
  title,
  title_short: title,
  rank,
  artist: { id: 10, name: artist },
  album: { id: 100, title: "Album" },
  ...extra,
});
const search = (...data) => ({ data });
const ids = (r) => r.candidates.map((c) => c.id);

beforeEach(() => {
  api.routes = [];
  api.paths = [];
  api.isrc = null;
  api.ytTitle = null;
});

describe("findVersions : recherche stricte", () => {
  it("garde l'original, triée par rank, et écarte un autre titre", async () => {
    const a = v("Queen", "Bohemian Rhapsody", 900_000);
    const b = v("Queen", "Bohemian Rhapsody - Remastered 2011", 950_000);
    const other = v("Queen", "Killer Queen", 999_999);
    api.routes = [['artist:"Queen"', search(a, b, other)]];
    const r = await findVersions({
      artist: "Queen",
      title: "Bohemian Rhapsody",
      source: "youtube",
    });
    expect(r.start).toBeNull();
    expect(ids(r)).toEqual([b.id, a.id]);
  });

  it("préfère un original moins écouté à un live plus écouté", async () => {
    const live = v("Oasis", "Wonderwall", 990_000, {
      title_version: "(Live)",
    });
    const orig = v("Oasis", "Wonderwall", 700_000);
    api.routes = [['track:"Wonderwall"', search(live, orig)]];
    const r = await findVersions({ artist: "Oasis", title: "Wonderwall" });
    expect(ids(r)).toEqual([orig.id]);
  });

  it("ne garde les versions dérivées que s'il n'existe aucun original", async () => {
    const live = v("Oasis", "Wonderwall", 500_000, {
      album: { id: 1, title: "Live at Knebworth" },
    });
    api.routes = [['track:"Wonderwall"', search(live)]];
    const r = await findVersions({ artist: "Oasis", title: "Wonderwall" });
    expect(ids(r)).toEqual([live.id]);
  });

  it("nettoie le titre saisi : remaster, crochets, feat. dans le titre", async () => {
    const orig = v("Daft Punk", "Get Lucky", 950_000);
    api.routes = [['track:"Get Lucky"', search(orig)]];
    const r = await findVersions({
      artist: "Daft Punk feat. Pharrell Williams",
      title: "Get Lucky [Radio Edit] feat. Pharrell - Remastered",
    });
    expect(api.paths[0]).toContain('artist:"Daft Punk" track:"Get Lucky"');
    expect(ids(r)).toEqual([orig.id]);
  });

  it("titre Deezer de départ : ajouté aux candidats même sans résultat strict", async () => {
    const start = v("Stromae", "Alors on danse", 900_000);
    api.routes = [
      ["/track/123", start],
      ["/search", search()],
    ];
    const r = await findVersions({
      artist: "Stromae",
      title: "Alors on danse",
      source: "deezer",
      external_id: "123",
    });
    expect(r.start).toBe(start);
    expect(ids(r)).toEqual([start.id]);
  });

  it("un id Deezer non numérique n'est pas appelé", async () => {
    api.routes = [["/search", search()]];
    await findVersions({
      artist: "X",
      title: "Y",
      source: "deezer",
      external_id: "../user/1",
    });
    expect(api.paths.some((p) => p.startsWith("/track/"))).toBe(false);
  });

  it("Spotify : passe par l'ISRC, et s'en passe s'il manque", async () => {
    const start = v("Angèle", "Balance ton quoi", 800_000);
    api.isrc = "FR1234";
    api.routes = [
      ["/track/isrc:FR1234", start],
      ["/search", search()],
    ];
    const r = await findVersions({
      artist: "Angèle",
      title: "Balance ton quoi",
      source: "spotify",
      external_id: "abc",
    });
    expect(r.start).toBe(start);

    api.isrc = null;
    api.paths = [];
    const r2 = await findVersions({
      artist: "Angèle",
      title: "Balance ton quoi",
      source: "spotify",
      external_id: "abc",
    });
    expect(r2.start).toBeNull();
    expect(api.paths.some((p) => p.includes("isrc:"))).toBe(false);
  });
});

describe("findVersions : recherches tolérantes", () => {
  it("titre abrégé chez le bon artiste (recherche large)", async () => {
    const full = v("ABBA", "Gimme! Gimme! Gimme! (A Man After Midnight)", 1, {
      title_short: "Gimme! Gimme! Gimme! (A Man After Midnight)",
    });
    api.routes = [["ABBA Gimme Gimme Gimme", search(full)]];
    const r = await findVersions({
      artist: "ABBA",
      title: "Gimme Gimme Gimme",
    });
    expect(ids(r)).toEqual([full.id]);
  });

  it("artiste mal orthographié : « Quenn » trouve Queen, pas une reprise", async () => {
    const cover = v("Queen Tribute Band", "Bohemian Rhapsody", 990_000);
    const karaoke = v("Quenn", "Bohemian Rhapsody (Karaoke Version)", 1, {
      title_short: "Bohemian Rhapsody",
      album: { id: 3, title: "Karaoke Hits" },
    });
    const real = v("Queen", "Bohemian Rhapsody", 900_000);
    api.routes = [
      ['artist:"', search()],
      ["Quenn Bohemian Rhapsody", search(cover, karaoke, real)],
    ];
    const r = await findVersions({
      artist: "Quenn",
      title: "Bohemian Rhapsody",
    });
    expect(ids(r)).toEqual([real.id]);
  });

  it("artiste et titre inversés : « Flowers - Miley cirus »", async () => {
    const real = v("Miley Cyrus", "Flowers", 980_000);
    api.routes = [
      ['artist:"', search()],
      ["Miley cirus", search(real)],
    ];
    const r = await findVersions({ artist: "Flowers", title: "Miley cirus" });
    expect(ids(r)).toEqual([real.id]);
  });

  it("début du titre saisi comme artiste : « EVE - LEVE TOI »", async () => {
    const real = v("Inconnu", "Eve lève-toi", 600_000);
    api.routes = [
      ['artist:"', search()],
      ["EVE LEVE TOI", search(real)],
    ];
    const r = await findVersions({ artist: "EVE", title: "LEVE TOI" });
    expect(ids(r)).toEqual([real.id]);
  });

  it("aucun artiste proche : pas de carte plutôt que celle d'un autre", async () => {
    api.routes = [["/search", search(v("Muse", "Hysteria", 900_000))]];
    const r = await findVersions({ artist: "Def Leppard", title: "Hysteria" });
    expect(r.candidates).toEqual([]);
  });

  it("catégorie « SERIE TV » : seuls les génériques conviennent", async () => {
    const pop = v("Rembrandts Fans", "I'll Be There for You", 950_000);
    const theme = v("The Rembrandts", "I'll Be There for You", 800_000, {
      album: { id: 4, title: "Friends (Original TV Soundtrack)" },
    });
    api.routes = [
      ['artist:"', search()],
      ["/search", search(pop, theme)],
    ];
    const r = await findVersions({
      artist: "SERIE TV",
      title: "Friends - I'll Be There for You",
    });
    expect(ids(r)).toEqual([theme.id]);
  });

  it("id YouTube : cherche avec le titre de la vidéo", async () => {
    api.ytTitle = "Linked Horizon - Guren no Yumiya (Official Video)";
    const real = v("Linked Horizon", "Guren no Yumiya", 700_000);
    const other = v("Autre", "Guren no Yumiya", 800_000);
    api.routes = [
      ['artist:"', search()],
      ["Linked Horizon Guren no Yumiya", search(other, real)],
    ];
    const r = await findVersions({
      artist: "dQw4w9WgXcQ",
      title: "dQw4w9WgXcQ",
    });
    // Le même nom d'artiste que dans la vidéo l'emporte sur le rank
    expect(ids(r)).toEqual([real.id]);
  });

  it("vidéo au titre vide de sens : aucune recherche, aucune carte", async () => {
    api.ytTitle = "Official Video (HD)";
    api.routes = [["/search", search()]];
    const r = await findVersions({
      artist: "dQw4w9WgXcQ",
      title: "dQw4w9WgXcQ",
    });
    expect(r.candidates).toEqual([]);
  });

  it("nom du jeu en guise d'artiste, rien ne correspond : vide", async () => {
    api.routes = [["/search", search(v("X", "Sans rapport", 1))]];
    const r = await findVersions({ artist: "Zelda", title: "Zelda" });
    expect(r.candidates).toEqual([]);
  });

  it("Deezer en panne (null partout) : vide, sans lever", async () => {
    const r = await findVersions({ artist: "Queen", title: "Bohemian" });
    expect(r).toEqual({ start: null, candidates: [] });
  });

  it("titre et artiste vides : vide, sans lever", async () => {
    const r = await findVersions({ artist: "", title: "" });
    expect(r.candidates).toEqual([]);
  });
});
