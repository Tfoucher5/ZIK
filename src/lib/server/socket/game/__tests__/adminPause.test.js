import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({
  preview: vi.fn(),
  envois: [],
  report: vi.fn(),
}));

vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: null }) }),
      }),
    }),
  },
  getAdminClient: () => ({ schema: () => ({ rpc: async () => ({}) }) }),
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: m.report,
}));
vi.mock("../results.js", () => ({
  saveGameResults: async () => {},
  saveMidGamePlayer: async () => {},
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: m.preview,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
}));
vi.mock("../../../state.js", async (original) => ({
  ...(await original()),
  getIO: () => ({
    to: () => ({ emit: (event, data) => m.envois.push({ event, data }) }),
  }),
}));
const titres = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  title: `Titre${i}`,
  artist: "Artiste",
  mainArtist: "Artiste",
  cleanTitle: `titre${i}`,
  cleanArtist: "artiste",
  external_id: String(100 + i),
  featArtists: [],
}));
vi.mock("../../../services/music/playlist.js", () => ({
  loadPlaylist: async () => titres,
}));

const { getOrCreateRoom } = await import("../rooms.js");
const { beginGame } = await import("../lobby.js");
const { startNextRound, endRound, finishGame } = await import("../rounds.js");
const { adminPauseRoom, adminResumeRoom, adminSkipRound } =
  await import("../admin.js");
const { registerAnswers } = await import("../answers.js");
const { roomGames } = await import("../../../state.js");
const { getIO } = await import("../../../state.js");

let room, id;
const nombre = (event) => m.envois.filter((e) => e.event === event).length;
let compteur = 0;

async function partie() {
  id = `pause-${++compteur}`;
  room = getOrCreateRoom(id);
  room.game.maxRounds = 4;
  await beginGame(room, getIO());
  await vi.waitFor(() => expect(room.game.readyRound).toBe(1));
}

async function preparation() {
  await partie();
  adminPauseRoom(id);
  adminResumeRoom(id);
  endRound(id, "Temps écoulé !", getIO());
  clearTimeout(room.game.breakTimer);
  room.game.breakTimer = null;
  room.game.prefetchedRound = null;
  room.game._prefetchPromise = null;
  let libere;
  m.preview.mockImplementation(() => new Promise((r) => (libere = r)));
  const fin = startNextRound(id, getIO());
  await vi.waitFor(() => expect(libere).toBeTypeOf("function"));
  return async (url = "https://cdn/x.mp3") => {
    libere(url);
    m.preview.mockImplementation(async (e) => `https://cdn/${e}.mp3`);
    await fin;
  };
}

describe("pause admin d'une room", () => {
  beforeEach(() => {
    m.envois = [];
    m.report.mockReset();
    m.preview
      .mockReset()
      .mockImplementation(async (extId) => `https://cdn/${extId}.mp3`);
  });
  afterEach(() => {
    const g = room?.game;
    clearTimeout(g?.readyTimer);
    clearTimeout(g?.breakTimer);
    clearInterval(g?.interval);
    vi.useRealTimers();
  });

  it("pause pendant le chargement de l'extrait : la manche démarre à la reprise", async () => {
    await partie();
    expect(room.game.isActive).toBeFalsy();
    adminPauseRoom(id);
    expect(nombre("round_start_sync")).toBe(0);
    // Un joueur qui rejoint pendant la pause doit encore recevoir la manche
    expect(room.game.isSyncWaiting).toBe(true);
    expect(room.game.readyTimer).toBeNull();

    adminResumeRoom(id);
    expect(nombre("round_start_sync")).toBe(1);
    expect(room.game.isActive).toBe(true);
    expect(room.game.interval).toBeTruthy();
  });

  it("pause à l'entracte : la manche suivante attend, puis part à la reprise", async () => {
    await partie();
    adminPauseRoom(id);
    adminResumeRoom(id);
    endRound(id, "Temps écoulé !", getIO());
    expect(room.game.interval).toBeNull();
    expect(room.game.breakTimer).toBeTruthy();

    adminPauseRoom(id);
    expect(room.game._pausedState).toBe("break");
    expect(room.game.breakTimer).toBeNull();
    const avant = nombre("start_round");

    vi.useFakeTimers();
    adminResumeRoom(id);
    await vi.advanceTimersByTimeAsync(1000);
    vi.useRealTimers();
    await vi.waitFor(() => expect(nombre("start_round")).toBe(avant + 1));
  });

  it("pause pendant la préparation d'une manche : annoncée à la reprise", async () => {
    await partie();
    adminPauseRoom(id);
    adminResumeRoom(id);
    endRound(id, "Temps écoulé !", getIO());
    clearTimeout(room.game.breakTimer);
    room.game.breakTimer = null;

    room.game.isPaused = true;
    await startNextRound(id, getIO());
    const avant = nombre("start_round");
    expect(room.game._roundHeld).toBe(true);
    room.game._pausedState = "none";

    adminResumeRoom(id);
    expect(nombre("start_round")).toBe(avant + 1);
    expect(room.game.readyTimer).toBeTruthy();
  });

  it.each([
    ["extrait trouvé", "https://cdn/x.mp3"],
    ["extrait introuvable", null],
  ])(
    "room libérée pendant la préparation (%s) : rien de faux",
    async (_, url) => {
      const finir = await preparation();
      delete roomGames[id];
      await finir(url);
      expect(m.report).not.toHaveBeenCalled();
      expect(nombre("game_over")).toBe(0);
      expect(room.game.readyTimer).toBeFalsy();
    },
  );

  it("room recréée pendant la préparation : la nouvelle ne démarre pas seule", async () => {
    const finir = await preparation();
    delete roomGames[id];
    const neuve = getOrCreateRoom(id);
    await finir();
    expect(neuve.game.readyTimer).toBeFalsy();
    expect(neuve.game.isActive).toBeFalsy();
  });

  it("fin de partie en préparation, extrait introuvable : un seul game_over", async () => {
    const finir = await preparation();
    await finishGame(room, getIO());
    await finir(null);
    expect(nombre("game_over")).toBe(1);
    expect(m.report).not.toHaveBeenCalled();
  });

  it("revanche pendant une ancienne préparation : pas de manche en double", async () => {
    const finir = await preparation();
    await finishGame(room, getIO());
    m.preview.mockImplementation(async (e) => `https://cdn/${e}.mp3`);
    const debut = nombre("start_round");
    await beginGame(room, getIO());
    await vi.waitFor(() => expect(nombre("start_round")).toBe(debut + 1));
    const avant = nombre("start_round");
    await finir();
    expect(nombre("start_round")).toBe(avant);
  });

  it("manche sautée pendant la pause : pas de second chrono à la reprise", async () => {
    await partie();
    adminPauseRoom(id);
    adminResumeRoom(id);
    adminPauseRoom(id);
    expect(room.game._pausedState).toBe("round");
    adminSkipRound(id);
    clearTimeout(room.game.breakTimer);
    room.game.breakTimer = null;
    adminResumeRoom(id);
    expect(room.game.interval).toBeNull();
    expect(nombre("round_start_sync")).toBe(1);
  });

  it("reprise en pleine manche : tout le monde recalé, la pause ne compte pas", async () => {
    await partie();
    adminPauseRoom(id);
    adminResumeRoom(id);
    const depart = room.game.startTime;
    adminPauseRoom(id);
    room.game.pausedAt = Date.now() - 60_000;
    adminResumeRoom(id);
    expect(room.game.startTime).toBeGreaterThanOrEqual(depart + 59_000);
    const sync = m.envois.filter((e) => e.event === "round_start_sync").at(-1);
    expect(sync.data.elapsed).toBeLessThan(5);
    expect(m.envois.at(-2).event).toBe("admin_resume");
  });

  it("pause pendant la préparation puis fin de partie : pas de manche fantôme", async () => {
    const finir = await preparation();
    adminPauseRoom(id);
    await finishGame(room, getIO());
    const avant = nombre("start_round");
    await finir();
    expect(nombre("start_round")).toBe(avant);
    expect(room.game.readyTimer).toBeNull();
  });

  it("fin de partie pendant le chargement : plus aucun départ prévu", async () => {
    await partie();
    const minuteur = room.game.readyTimer;
    const annule = vi.spyOn(globalThis, "clearTimeout");
    await finishGame(room, getIO());
    expect(annule).toHaveBeenCalledWith(minuteur);
    annule.mockRestore();
    expect(room.game.readyTimer).toBeNull();
    expect(room.game.isSyncWaiting).toBe(false);
  });

  it("manche préparée pendant la pause : la suivante se précharge quand même", async () => {
    const finir = await preparation();
    adminPauseRoom(id);
    await finir();
    await vi.waitFor(() => expect(room.game.prefetchedRound).toBeTruthy());
    expect(room.game._roundHeld).toBe(true);
  });

  it.each([
    ["submit_guess", "titre0"],
    ["submit_choice", { choiceIndex: 0 }],
  ])("réponse pendant la pause (%s) : refusée", async (event, payload) => {
    await partie();
    adminPauseRoom(id);
    adminResumeRoom(id);
    room.game_mode = "qcm";
    room.game.correctChoiceIndex = 0;
    room.players.alice = { score: 0, name: "alice" };
    room.socketToName.s1 = "alice";
    const handlers = {};
    const socket = {
      id: "s1",
      currentRoom: id,
      on: (e, f) => (handlers[e] = f),
      emit: () => {},
    };
    registerAnswers(socket, getIO());

    adminPauseRoom(id);
    await handlers[event](payload);
    expect(room.players.alice.score).toBe(0);
    expect(room.players.alice._qcmAnswered).toBeFalsy();
    expect(room.players.alice._guessTimes).toBeUndefined();
  });

  it("partie terminée pendant la pause : la reprise ne relance rien", async () => {
    await partie();
    adminPauseRoom(id);
    await finishGame(room, getIO());
    const avant = nombre("start_round");
    expect(adminResumeRoom(id)).toBe(false);
    expect(nombre("start_round")).toBe(avant);
    expect(room.game.interval).toBeNull();
    expect(room.game.isPaused).toBe(false);
  });
});
