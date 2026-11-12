import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  getAdminClient: () => ({
    rpc: () => ({ then: () => {} }),
    from: () => ({
      update: (fields) => ({
        eq: () => {
          m.updates.push(fields);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
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
const { startNextRound, skipTrack, finishGame } = await import("../rounds.js");
const { prefetchNextVideo } = await import("../session.js");
const { previewUrl } = await import("../media.js");
const { registerSalon } = await import("../index.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const URL_A = "https://cdn/a.mp3";
const flush = () => new Promise((r) => setImmediate(r));

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

describe("déroulé d'une manche", () => {
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
  };

  it("second « suivant » pendant la recherche : un seul titre consommé", async () => {
    const game = salonRooms[CODE].game;
    game.gen = 1;
    game.sessionPlaylist = [
      { id: "b", title: "B", youtube_id: "vb" },
      { id: "a", title: "A", youtube_id: "va" },
    ];
    game.fullPlaylist = [...game.sessionPlaylist];
    const premier = startNextRound(CODE, io);
    const second = startNextRound(CODE, io);
    await Promise.all([premier, second]);
    await flush();
    expect(game.currentRound).toBe(1);
    expect(game.currentTrack.id).toBe("a");
    expect(game.sessionPlaylist.map((t) => t.id)).toEqual(["b"]);
  });

  it("la recherche finie, la manche suivante peut partir", async () => {
    const game = salonRooms[CODE].game;
    game.sessionPlaylist = [
      { id: "b", title: "B", youtube_id: "vb" },
      { id: "a", title: "A", youtube_id: "va" },
    ];
    game.fullPlaylist = [...game.sessionPlaylist];
    await startNextRound(CODE, io);
    expect(game._resolving).toBeNull();
    await startNextRound(CODE, io);
    expect(game.currentTrack.id).toBe("b");
  });

  it("titre sauté avec un chrono lancé : le chrono est arrêté", async () => {
    const game = salonRooms[CODE].game;
    game.currentRound = 1;
    game.interval = setInterval(() => {}, 1000);
    game.timerActive = true;
    game.sessionPlaylist = [];
    skipTrack(CODE, io);
    expect(game.interval).toBeNull();
    expect(game.timerActive).toBe(false);
  });

  it("revanche pendant une recherche : la nouvelle partie démarre", async () => {
    const h = makeIo();
    registerSalon(h.io);
    const regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_host({ code: CODE, key: CLE });

    const game = salonRooms[CODE].game;
    game.gen = 1;
    game.phase = "summary";
    const titres = ["a", "b", "c", "d"].map((id) => ({
      id,
      title: id,
      youtube_id: `v${id}`,
      playlistId: "p",
    }));
    game.fullPlaylist = titres;
    game.sessionPlaylist = [...titres];
    salonRooms[CODE].settings.maxRounds = 4;

    let libere;
    m.settings.mockReturnValueOnce(new Promise((r) => (libere = r)));
    const enCours = startNextRound(CODE, h.io);
    await regie.handlers.salon_restart();
    await flush();
    libere({ exclude: [], minStart: 15 });
    await enCours;
    await flush();

    expect(game.phase).toBe("round");
    expect(game.currentRound).toBe(1);
    expect(game.currentVideo).toBeTruthy();
    expect(game._resolving).toBeNull();
  });

  it("partie terminée pendant une recherche sans média : pas de manche après le podium", async () => {
    const game = salonRooms[CODE].game;
    game.gen = 1;
    game.phase = "summary";
    game.sessionPlaylist = [
      { id: "b", title: "B", youtube_id: "vb" },
      { id: "a", title: "A", external_id: "12" },
    ];
    game.fullPlaylist = [...game.sessionPlaylist];
    let libere;
    m.byId.mockReturnValue(new Promise((r) => (libere = r)));
    const enCours = startNextRound(CODE, io);
    await flush();
    finishGame(CODE, io);
    libere(null);
    await enCours;
    await flush();
    expect(game.phase).toBe("gameover");
  });

  it("revanche puis « Terminer » pendant son décompte : une nouvelle revanche reste possible", async () => {
    const h = makeIo();
    registerSalon(h.io);
    const regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
    const salon = salonRooms[CODE];
    salon.settings.countStart = true;
    salon.game.phase = "summary";
    salon.game.fullPlaylist = [{ id: "a", title: "A", youtube_id: "va" }];
    const decomptes = () =>
      h.emissions.filter((e) => e.event === "salon_countdown").length;

    regie.handlers.salon_restart();
    expect(decomptes()).toBe(1);
    finishGame(CODE, h.io);
    expect(salon.game.phase).toBe("gameover");
    regie.handlers.salon_restart();
    expect(decomptes()).toBe(2);
    clearTimeout(salon.game.breakTimer);
  });

  it("base bloquée : la vidéo part avec les réglages par défaut en 2 s", async () => {
    vi.useFakeTimers();
    m.settings.mockReturnValue(new Promise(() => {}));
    const { findVideo } = await import("../media.js");
    const attente = findVideo(salonRooms[CODE], {
      id: "a",
      youtube_id: "va",
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect((await attente).video.id).toBe("va");
  });

  it("Deezer lent : le lien en base valide sert de repli à 5 s", async () => {
    vi.useFakeTimers();
    m.byId.mockReturnValue(new Promise(() => {}));
    const attente = previewUrl({
      external_id: "12",
      preview_url: URL_A,
      title: "T",
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await attente).toBe(URL_A);
  });

  it("l'hôte avance pendant la recherche d'extrait : pas de titre sauté", async () => {
    const h = makeIo();
    registerSalon(h.io);
    const ecran = makeSocket("ecran", h.rooms);
    h.connecte(ecran);
    ecran.salonRole = "screen";
    ecran.salonCode = CODE;
    const game = salonRooms[CODE].game;
    const track = { id: "t", title: "T", external_id: "12" };
    Object.assign(game, {
      phase: "round",
      currentRound: 3,
      currentTrack: track,
      currentVideo: { id: "v", start: 0 },
    });
    let libere;
    m.byId.mockReturnValue(new Promise((r) => (libere = r)));
    const attente = ecran.handlers.salon_video_failed({ videoId: "v" });
    await flush();
    game.phase = "summary";
    libere(null);
    await attente;
    expect(game.currentRound).toBe(3);
    expect(game.skipStreak ?? 0).toBe(0);
    expect(h.emissions.some((e) => e.event === "salon_use_audio")).toBe(false);
  });

  it("préchargement sans vidéo : extrait prêt, rien d'annoncé à la TV", async () => {
    const h = makeIo();
    const game = salonRooms[CODE].game;
    game.prefetchedRound = { track: {}, video: { id: "ancien" } };
    game.sessionPlaylist = [{ id: "a", title: "A", external_id: "12" }];
    m.byId.mockResolvedValue(URL_A);
    prefetchNextVideo(CODE, h.io);
    await flush();
    expect(m.byId).toHaveBeenCalledOnce();
    expect(game.prefetchedRound).toBeNull();
    expect(h.emissions.filter((e) => e.event === "salon_next_video")).toEqual(
      [],
    );
  });
});
