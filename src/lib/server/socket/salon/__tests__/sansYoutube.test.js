import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const m = vi.hoisted(() => ({
  updates: [],
  byId: vi.fn(),
  byName: vi.fn(),
  settings: vi.fn(),
}));

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));
vi.mock("../persist.js", () => ({
  recordSalonGameEnd: () => {},
  recordSalonGameStart: () => {},
  recordSalonPlayers: () => {},
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => {
    const sb = {
      rpc: () => ({ then: () => {} }),
      from: () => ({
        update: (fields) => ({
          eq: () => {
            m.updates.push(fields);
            return Promise.resolve({ error: null });
          },
        }),
      }),
    };
    sb.schema = () => sb;
    return sb;
  },
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: m.byId,
  deezerPreviewMatch: m.byName,
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
  DEFAULT_VIDEO_SETTINGS: { exclude: [], minStart: 15 },
  getVideoSettings: () => m.settings(),
  pickStart: () => 20,
}));
vi.mock("../../game/audio.js", () => ({
  validPreviewUrl: (u) => (u?.startsWith("https://cdn/") ? u : null),
}));

const { salonRooms } = await import("../../../state.js");
const { forgetVideo } = await import("../tracks.js");
const { previewUrl } = await import("../media.js");
const { registerSalon } = await import("../index.js");
const { CODE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const URL_A = "https://cdn/a.mp3";

beforeEach(() => {
  m.updates = [];
  m.byId.mockReset().mockResolvedValue(null);
  m.byName.mockReset().mockResolvedValue(null);
  m.settings.mockReset().mockResolvedValue({ exclude: [], minStart: 15 });
  salonDeTest();
});
afterEach(() => {
  clearInterval(salonRooms[CODE]?.game.interval);
  clearTimeout(salonRooms[CODE]?.game.musicReadyTimer);
  clearTimeout(salonRooms[CODE]?._cleanupTimer);
  vi.useRealTimers();
  delete salonRooms[CODE];
});

describe("aucun appel YouTube dans le code du salon", () => {
  it("aucun fichier de salon n'utilise une fonction qui appelle YouTube", () => {
    const dossier = path.resolve("src/lib/server/socket/salon");
    const fautifs = readdirSync(dossier)
      .filter((f) => f.endsWith(".js"))
      .filter((f) =>
        /\b(ytsQuery|ytsCandidates|ytsSearch|ytVideoInfo|resolveVideo|getYtAudioUrl|YTDLP_BIN)\b/.test(
          readFileSync(path.join(dossier, f), "utf8"),
        ),
      );
    expect(fautifs).toEqual([]);
  });
});

describe("extrait de repli", () => {
  it("ordre : id Deezer, puis lien en base valide, puis recherche par nom", async () => {
    m.byId.mockResolvedValue("https://cdn/id.mp3");
    expect(
      await previewUrl({ external_id: "12", preview_url: URL_A, title: "T" }),
    ).toBe("https://cdn/id.mp3");

    m.byId.mockResolvedValue(null);
    expect(
      await previewUrl({ external_id: "12", preview_url: URL_A, title: "T" }),
    ).toBe(URL_A);
    expect(m.byName).not.toHaveBeenCalled();

    m.byName.mockResolvedValue("https://cdn/nom.mp3");
    expect(await previewUrl({ artist: "A", mainArtist: "M", title: "T" })).toBe(
      "https://cdn/nom.mp3",
    );
    expect(m.byName).toHaveBeenCalledWith("M", "T");
  });

  it("un id non numérique n'interroge pas Deezer, un lien non audio est ignoré", async () => {
    expect(
      await previewUrl({
        external_id: "spotify:1",
        preview_url: "https://youtube.com/x",
        title: "T",
      }),
    ).toBeNull();
    expect(m.byId).not.toHaveBeenCalled();
  });

  it("un seul appel par titre : le lobby prépare la manche", async () => {
    const track = { external_id: "12", title: "T" };
    m.byId.mockResolvedValue(URL_A);
    await previewUrl(track);
    await previewUrl(track);
    expect(m.byId).toHaveBeenCalledOnce();
  });

  it("Deezer ne répond pas : 5 s au plus, puis on réessaie après 30 s", async () => {
    vi.useFakeTimers();
    const track = { external_id: "12", title: "T" };
    m.byId.mockReturnValue(new Promise(() => {}));
    const attente = previewUrl(track);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await attente).toBeNull();
    expect(await previewUrl(track)).toBeNull();
    expect(m.byId).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    m.byId.mockResolvedValue(URL_A);
    expect(await previewUrl(track)).toBe(URL_A);
  });
});

describe("vidéo refusée par une TV", () => {
  it("note la vidéo refusée pour que la tâche de fond ne la repropose pas", () => {
    const track = { id: "t1", cachedVideo: { id: "refusee", duration: 100 } };
    forgetVideo(track);
    expect(track.cachedVideo).toBeNull();
    expect(m.updates[0]).toMatchObject({
      video_cache_id: null,
      video_refused_id: "refusee",
    });
    expect(m.updates[0].video_search_at).toBeTruthy();
  });

  it("titre sans vidéo en cache : rien à écrire", () => {
    forgetVideo({ id: "t1" });
    expect(m.updates).toEqual([]);
  });

  it("salon_video_failed : la TV passe à l'extrait, rien vers les téléphones", async () => {
    const h = makeIo();
    registerSalon(h.io);
    const ecran = makeSocket("ecran", h.rooms);
    h.connecte(ecran);
    ecran.salonRole = "screen";
    ecran.salonCode = CODE;

    const track = {
      id: "t1",
      title: "T",
      artist: "A",
      external_id: "12",
      cachedVideo: { id: "v1", duration: 100 },
    };
    Object.assign(salonRooms[CODE].game, {
      phase: "round",
      currentTrack: track,
      currentVideo: { id: "v1", start: 0 },
    });
    m.byId.mockResolvedValue(URL_A);

    await ecran.handlers.salon_video_failed({ videoId: "v1" });

    expect(salonRooms[CODE].game.currentVideo).toEqual({
      id: URL_A,
      start: 0,
      audio: true,
    });
    const envoi = h.emissions.find((e) => e.event === "salon_use_audio");
    expect(envoi.cibles).toEqual([`salon:screens:${CODE}`]);
    expect(envoi.payload).toEqual({ audioUrl: URL_A });
    expect(m.updates[0].video_refused_id).toBe("v1");
  });
});
