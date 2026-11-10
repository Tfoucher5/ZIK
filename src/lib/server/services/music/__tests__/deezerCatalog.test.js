import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const dz = vi.hoisted(() => ({ routes: {}, fetch: vi.fn() }));
vi.mock("../deezerClient.js", () => ({ deezerFetch: dz.fetch }));

const cat = await import("../deezerCatalog.js");

const T = (id, o = {}) => ({
  id,
  title: `Titre ${id}`,
  artist: { id: 100 + id, name: `Artiste ${id}` },
  preview: `https://cdn/${id}.mp3`,
  rank: id,
  album: { id: 7, title: "Album", cover_xl: "xl.jpg" },
  ...o,
});

beforeEach(() => {
  dz.routes = {};
  dz.fetch.mockReset().mockImplementation(async (path) => {
    const key = Object.keys(dz.routes).find((k) => path.startsWith(k));
    const r = dz.routes[key];
    if (r instanceof Error) throw r;
    return typeof r === "function" ? r(path) : (r ?? { data: [] });
  });
});
afterEach(() => vi.useRealTimers());

describe("toTrack", () => {
  it("normalise un titre Deezer", () => {
    expect(cat.toTrack(T(1))).toEqual({
      external_id: "1",
      source: "deezer",
      artist: "Artiste 1",
      artist_id: 101,
      title: "Titre 1",
      preview_url: "https://cdn/1.mp3",
      cover_url: "xl.jpg",
      album_id: 7,
      album: "Album",
      rank: 1,
    });
  });
  it("sans album, extrait ni rang : valeurs nulles", () => {
    const t = cat.toTrack(
      T(2, { album: undefined, preview: "", rank: undefined }),
    );
    expect(t).toMatchObject({
      preview_url: null,
      cover_url: null,
      album_id: null,
      album: null,
      rank: 0,
    });
  });
  it("album fourni à part (page d'album), pochette big en repli", () => {
    expect(
      cat.toTrack(T(3), { id: 9, title: "B", cover_big: "big.jpg" }),
    ).toMatchObject({
      album_id: 9,
      cover_url: "big.jpg",
    });
  });
});

describe("recherche et liens", () => {
  it("recherche : titres illisibles écartés, requête encodée", async () => {
    dz.routes["/search"] = { data: [T(1), T(2, { readable: false })] };
    const r = await cat.searchTracks("Daft & Punk", 5);
    expect(r.map((t) => t.external_id)).toEqual(["1"]);
    expect(dz.fetch).toHaveBeenCalledWith(
      "/search?q=Daft%20%26%20Punk&limit=5",
      undefined,
    );
  });
  it("erreur Deezer : levée avec son message", async () => {
    dz.routes["/search"] = { error: { message: "Quota" } };
    await expect(cat.searchTracks("x")).rejects.toThrow("Quota");
    dz.routes["/search"] = { error: {} };
    await expect(cat.searchTracks("x")).rejects.toThrow("Deezer indisponible");
  });
  it("trackQuery : « artiste titre »", async () => {
    dz.routes["/track/5"] = T(5);
    expect(await cat.trackQuery(5)).toBe("Artiste 5 Titre 5");
  });
});

describe("pages artiste et album (cache 1 h)", () => {
  it("page artiste : albums du plus récent au plus ancien, mise en cache", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    dz.routes["/artist/50/top"] = { data: [T(1), T(2, { readable: false })] };
    dz.routes["/artist/50/albums"] = {
      data: [
        {
          id: 1,
          title: "Vieux",
          release_date: "1999-01-01",
          record_type: "album",
        },
        { id: 2, title: "Sans date" },
        {
          id: 3,
          title: "Récent",
          release_date: "2024-05-01",
          record_type: "single",
        },
      ],
    };
    dz.routes["/artist/50"] = { id: 50, name: "Art", picture_medium: "pic" };
    const p = await cat.artistPage(50);
    expect(p.artist).toEqual({ id: 50, name: "Art", picture: "pic" });
    expect(p.tracks).toHaveLength(1);
    expect(p.albums.map((a) => a.year)).toEqual(["2024", "1999", ""]);
    const n = dz.fetch.mock.calls.length;
    await cat.artistPage(50);
    expect(dz.fetch.mock.calls.length).toBe(n);
    vi.advanceTimersByTime(3_600_001);
    await cat.artistPage(50);
    expect(dz.fetch.mock.calls.length).toBe(n + 3);
  });
  it("page artiste en erreur : pas mise en cache", async () => {
    dz.routes["/artist/51"] = { error: { message: "no" } };
    await expect(cat.artistPage(51)).rejects.toThrow("no");
    dz.routes["/artist/51"] = { id: 51, name: "Ok" };
    expect((await cat.artistPage(51)).artist.name).toBe("Ok");
  });
  it("page album : titres avec la pochette de l'album", async () => {
    dz.routes["/album/60"] = {
      id: 60,
      title: "Alb",
      cover_medium: "m.jpg",
      cover_xl: "axl.jpg",
      release_date: "2010-02-02",
      artist: { id: 4, name: "Art" },
      tracks: { data: [T(1, { album: undefined }), T(2, { readable: false })] },
    };
    const p = await cat.albumPage(60);
    expect(p.album).toEqual({
      id: 60,
      title: "Alb",
      cover: "m.jpg",
      artist: "Art",
      artist_id: 4,
      year: "2010",
    });
    expect(p.tracks).toEqual([
      expect.objectContaining({
        external_id: "1",
        cover_url: "axl.jpg",
        album_id: 60,
      }),
    ]);
  });
  it("page album minimale", async () => {
    dz.routes["/album/61"] = { id: 61, title: "X" };
    expect(await cat.albumPage(61)).toEqual({
      album: {
        id: 61,
        title: "X",
        cover: undefined,
        artist: "",
        artist_id: null,
        year: "",
      },
      tracks: [],
    });
  });
});

describe("suggestions", () => {
  it("radios des artistes de la playlist, titres déjà présents exclus", async () => {
    dz.routes["/track/"] = (p) => {
      const id = Number(p.split("/")[2]);
      if (id === 903) throw new Error("down");
      return { artist: { id: id === 902 ? 81 : 80 } };
    };
    dz.routes["/artist/80/radio"] = { data: [T(901), T(10), T(11)] };
    dz.routes["/artist/81/radio"] = new Error("radio down");
    const r = await cat.suggestions(["901", "902", "903", "904"]);
    expect(r.map((t) => t.external_id)).toEqual(["11", "10"]);
    expect(
      dz.fetch.mock.calls.filter(([p]) => p.includes("/radio")),
    ).toHaveLength(2);
  });
});

describe("matchLines : liste collée", () => {
  it("chaque ligne reçoit son meilleur titre, dans l'ordre", async () => {
    dz.routes["/search"] = (p) => {
      const q = decodeURIComponent(p);
      if (q.includes("One More Time"))
        return {
          data: [
            T(1, {
              title: "One More Time (Live)",
              artist: { id: 1, name: "Daft Punk" },
            }),
            T(2, {
              title: "One More Time",
              artist: { id: 1, name: "Daft Punk" },
            }),
          ],
        };
      if (q.includes("Inconnu")) return { data: [] };
      return {
        data: [
          T(3, { title: "Autre chose", artist: { id: 3, name: "Personne" } }),
        ],
      };
    };
    const out = await cat.matchLines([
      "01. Daft Punk - One More Time (5:20)",
      "Inconnu - Rien",
      "texte libre",
    ]);
    expect(out[0]).toMatchObject({
      artist: "Daft Punk",
      title: "One More Time",
      status: "ok",
    });
    expect(out[0].picks[0].external_id).toBe("2");
    expect(out[1]).toMatchObject({ status: "none", picks: [] });
    expect(out[2]).toMatchObject({ line: "texte libre", status: "doubt" });
    expect(dz.fetch.mock.calls.every(([, o]) => o?.bulk)).toBe(true);
  });
  it("recherche ciblée vide : nouvelle recherche libre", async () => {
    dz.routes["/search"] = (p) =>
      p.includes("artist%3A")
        ? { data: [] }
        : {
            data: [T(4, { title: "Rien", artist: { id: 1, name: "Inconnu" } })],
          };
    const [r] = await cat.matchLines(["Inconnu - Rien"]);
    expect(r.status).toBe("ok");
    expect(dz.fetch).toHaveBeenCalledTimes(2);
  });
  it("Deezer en panne : statut none, sans lever", async () => {
    dz.routes["/search"] = new Error("down");
    expect(await cat.matchLines(["A - B"])).toEqual([
      { line: "A - B", artist: "A", title: "B", status: "none", picks: [] },
    ]);
  });
  it("liste vide", async () => {
    expect(await cat.matchLines([])).toEqual([]);
  });
});
