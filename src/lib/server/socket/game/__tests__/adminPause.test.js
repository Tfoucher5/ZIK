import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ preview: vi.fn(), envois: [] }));

vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: null }) }),
      }),
    }),
  },
  getAdminClient: () => ({ rpc: async () => ({ data: null, error: null }) }),
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
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
const { adminPauseRoom, adminResumeRoom } = await import("../admin.js");
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

describe("pause admin d'une room", () => {
  beforeEach(() => {
    m.envois = [];
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
    expect(room.game.currentRound).toBe(2);
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
    expect(room.game._roundHeld).toBe(false);
    expect(room.game.readyTimer).toBeTruthy();
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
