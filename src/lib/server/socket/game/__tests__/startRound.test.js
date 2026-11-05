import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({ exec: vi.fn(), byId: vi.fn() }));

vi.mock("child_process", async (original) => ({
  ...(await original()),
  execFile: m.exec,
}));
vi.mock("../../../config.js", () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: null }) }),
      }),
    }),
  },
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../results.js", () => ({
  saveGameResults: async () => {},
  saveMidGamePlayer: async () => {},
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: m.byId,
  deezerPreviewMatch: async () => null,
  iTunesPreviewMatch: async () => null,
}));
const titres = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  title: `Secret${i}`,
  artist: "Artiste",
  mainArtist: "Artiste",
  cleanTitle: `secret${i}`,
  cleanArtist: "artiste",
  external_id: String(100 + i),
  youtube_id: `pin${i}`,
  featArtists: [],
}));
vi.mock("../../../services/music/playlist.js", () => ({
  loadPlaylist: async () => titres,
}));

const { getOrCreateRoom } = await import("../rooms.js");
const { beginGame } = await import("../lobby.js");
const { startNextRound } = await import("../rounds.js");

function lancer(roomId) {
  const room = getOrCreateRoom(roomId);
  room.game.maxRounds = 3;
  const envois = [];
  const io = {
    to: () => ({ emit: (event, data) => envois.push({ event, data }) }),
  };
  return { room, io, envois, de: (ev) => envois.filter((e) => e.event === ev) };
}

describe("manche d'une room en ligne", () => {
  let salle;
  beforeEach(() => {
    m.exec.mockReset();
    m.byId
      .mockReset()
      .mockImplementation(async (id) => `https://cdn/${id}.mp3`);
  });
  afterEach(() => {
    clearTimeout(salle?.room.game.readyTimer);
  });

  it("start_round ne révèle rien et ne lance pas yt-dlp", async () => {
    salle = lancer("room-manche");
    await beginGame(salle.room, salle.io);
    await vi.waitFor(() => expect(salle.room.game.readyRound).toBe(1));

    const { data } = salle.de("start_round")[0];
    expect(data).not.toHaveProperty("videoId");
    expect(data.startSeconds).toBe(0);
    expect(data.audioUrl).toMatch(/^\/api\/game\/audio\?v=/);

    const texte = JSON.stringify({ ...data, audioUrl: null });
    expect(texte).not.toContain("prev_");
    expect(texte).not.toContain("Secret");
    expect(texte).not.toContain("pin");
    expect(texte).not.toContain("cdn");
    expect(m.exec).not.toHaveBeenCalled();
  });

  it("un joueur qui rejoint reçoit la même manche, sans la réponse", async () => {
    salle = lancer("room-rejoint");
    await beginGame(salle.room, salle.io);
    await vi.waitFor(() => expect(salle.room.game.readyRound).toBe(1));
    expect(salle.room.game.lastRoundData).toEqual(
      salle.de("start_round")[0].data,
    );
  });

  it("la manche suivante joue l'extrait annoncé en next_audio", async () => {
    salle = lancer("room-suivante");
    await beginGame(salle.room, salle.io);
    await vi.waitFor(() =>
      expect(salle.room.game.prefetchedRound).toBeTruthy(),
    );
    const annonce = salle.de("next_audio").at(-1).data.audioUrl;
    const appels = m.byId.mock.calls.length;

    clearTimeout(salle.room.game.readyTimer);
    await startNextRound("room-suivante", salle.io);

    const manche = salle.de("start_round").at(-1).data;
    expect(manche.round).toBe(2);
    expect(manche.audioUrl).toBe(annonce);
    expect(m.exec).not.toHaveBeenCalled();
    // L'extrait de cette manche n'a pas été recherché une seconde fois
    expect(m.byId.mock.calls.length).toBeLessThanOrEqual(appels + 1);
  });
});
