import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const m = vi.hoisted(() => ({
  exec: vi.fn(),
  byId: vi.fn(),
  deezer: vi.fn(),
  itunes: vi.fn(),
}));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: m.exec,
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: m.byId,
  deezerPreviewMatch: m.deezer,
  iTunesPreviewMatch: m.itunes,
}));

const { roomGames } = await import("../../../state.js");
const { prefetchNextRound, getPreview, previewCacheKey, refreshPreview } =
  await import("../audio.js");
const { ytdlAudioCache } = await import("../../../audio/ytdlCache.js");

const ROOM = "room-test";
const titre = (id, extra = {}) => ({
  id,
  title: `T${id}`,
  artist: "A",
  cleanArtist: `a${id}`,
  cleanTitle: `t${id}`,
  external_id: "12",
  ...extra,
});

function salleDeTest(tracks) {
  const emissions = [];
  roomGames[ROOM] = { game: { sessionPlaylist: tracks, roundDuration: 30 } };
  return {
    emissions,
    io: { to: () => ({ emit: (ev, d) => emissions.push([ev, d]) }) },
  };
}

describe("rooms en ligne : aucun appel YouTube pendant une partie", () => {
  beforeEach(() => {
    m.exec.mockReset();
    m.byId.mockReset();
    m.deezer.mockReset().mockResolvedValue(null);
    m.itunes.mockReset().mockResolvedValue(null);
    ytdlAudioCache.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ json: async () => ({}) })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete roomGames[ROOM];
  });

  it("le chemin d'une manche n'utilise plus l'extraction ni la recherche", () => {
    const dossier = path.resolve("src/lib/server/socket/game");
    const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".js"));
    for (const f of fichiers) {
      const code = readFileSync(path.join(dossier, f), "utf8");
      expect(code, f).not.toMatch(/\b(getYtAudioUrl|resolveVideo)\b/);
      if (f !== "audio.js")
        expect(code, f).not.toMatch(/\b(ytsQuery|ytsSearch|ytVideoInfo)\b/);
    }
    const route = readFileSync(
      path.resolve("src/routes/(site)/api/game/audio/+server.js"),
      "utf8",
    );
    expect(route).not.toMatch(/getYtAudioUrl/);
  });

  it("préchargement : extrait prêt et annoncé, yt-dlp jamais lancé", async () => {
    const { io, emissions } = salleDeTest([titre(1)]);
    m.byId.mockResolvedValue("https://cdn/a.mp3");
    await prefetchNextRound(ROOM, io);
    const next = roomGames[ROOM].game.prefetchedRound;
    expect(next.track.id).toBe(1);
    expect(next.ytAudio.url).toBe("https://cdn/a.mp3");
    expect(next.videoId).toMatch(/^prev_/);
    expect(emissions).toEqual([["next_audio", { audioUrl: next.audioUrl }]]);
    expect(next.audioUrl).not.toContain(next.videoId);
    expect(m.exec).not.toHaveBeenCalled();
  });

  it("vidéo épinglée : l'extrait reste la source, sans yt-dlp", async () => {
    const { io } = salleDeTest([titre(2, { youtube_id: "pin" })]);
    m.byId.mockResolvedValue("https://cdn/b.mp3");
    await prefetchNextRound(ROOM, io);
    expect(roomGames[ROOM].game.prefetchedRound.ytAudio.url).toBe(
      "https://cdn/b.mp3",
    );
    expect(m.exec).not.toHaveBeenCalled();
  });

  it("aucun extrait : rien de préparé, rien d'annoncé", async () => {
    const { io, emissions } = salleDeTest([titre(3)]);
    m.byId.mockResolvedValue(null);
    await prefetchNextRound(ROOM, io);
    expect(roomGames[ROOM].game.prefetchedRound).toBeUndefined();
    expect(emissions).toEqual([]);
    expect(m.exec).not.toHaveBeenCalled();
  });

  it("titre changé pendant la recherche : résultat ignoré", async () => {
    const t = titre(4);
    const { io, emissions } = salleDeTest([t]);
    let libere;
    m.byId.mockReturnValue(new Promise((r) => (libere = r)));
    const attente = prefetchNextRound(ROOM, io);
    roomGames[ROOM].game.sessionPlaylist = [];
    libere("https://cdn/c.mp3");
    await attente;
    expect(roomGames[ROOM].game.prefetchedRound).toBeUndefined();
    expect(emissions).toEqual([]);
  });

  it("chaque titre a sa clé : alphabets non latins et titres proches", () => {
    const cle = (cleanArtist, cleanTitle) =>
      previewCacheKey({ cleanArtist, cleanTitle });
    expect(cle("кино", "группа крови")).not.toBe(cle("ария", "беспечный"));
    expect(cle("mozart", "symphony no 40")).not.toBe(
      cle("mozart", "symphony no 41"),
    );
    expect(cle("a", "b")).toMatch(/^prev_[0-9a-f]+$/);
  });

  describe("recherche d'extrait", () => {
    const sansId = (id) => titre(id, { external_id: null, mainArtist: "M" });

    it("ordre : id Deezer, correspondance Deezer, correspondance iTunes", async () => {
      m.byId.mockResolvedValue("https://cdn/id.mp3");
      expect((await getPreview(titre(10))).entry.url).toBe(
        "https://cdn/id.mp3",
      );
      expect(m.deezer).not.toHaveBeenCalled();

      m.byId.mockResolvedValue(null);
      m.deezer.mockResolvedValue("https://cdn/dz.mp3");
      expect((await getPreview(titre(11))).entry.url).toBe(
        "https://cdn/dz.mp3",
      );
      expect(m.deezer).toHaveBeenCalledWith("A", "T11");
      expect(m.itunes).not.toHaveBeenCalled();

      m.deezer.mockResolvedValue(null);
      m.itunes.mockResolvedValue("https://cdn/it.mp3");
      expect((await getPreview(titre(12))).entry.url).toBe(
        "https://cdn/it.mp3",
      );
    });

    it("id non numérique : pas d'appel par id, artiste principal utilisé", async () => {
      m.deezer.mockResolvedValue("https://cdn/dz.mp3");
      await getPreview({ ...sansId(13), external_id: "spotify:1" });
      expect(m.byId).not.toHaveBeenCalled();
      expect(m.deezer).toHaveBeenCalledWith("M", "T13");
    });

    it("aucune recherche non vérifiée : le réseau ne part jamais d'ici", async () => {
      expect(await getPreview(sansId(14))).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("refreshPreview repart de la recherche d'origine et garde le nouveau lien", async () => {
      m.deezer.mockResolvedValue("https://cdn/frais.mp3");
      const query = { artist: "A", title: "T", externalId: null };
      const entree = await refreshPreview("prev_x", { query });
      expect(m.deezer).toHaveBeenCalledWith("A", "T");
      expect(entree.url).toBe("https://cdn/frais.mp3");
      expect(entree.query).toEqual(query);
      expect(ytdlAudioCache.get("prev_x")).toBe(entree);
    });

    it("refreshPreview sans résultat : erreur, le cache reste", async () => {
      ytdlAudioCache.set("prev_y", { url: "ancien" });
      await expect(
        refreshPreview("prev_y", { query: { artist: "A", title: "T" } }),
      ).rejects.toThrow();
      expect(ytdlAudioCache.get("prev_y").url).toBe("ancien");
    });
  });

  it("getPreview ne lance pas yt-dlp", async () => {
    m.byId.mockResolvedValue("https://cdn/d.mp3");
    const res = await getPreview(titre(5));
    expect(res.entry.url).toBe("https://cdn/d.mp3");
    expect(m.exec).not.toHaveBeenCalled();
  });
});
