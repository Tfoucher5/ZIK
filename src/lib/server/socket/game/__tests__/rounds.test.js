import { describe, it, expect, vi, beforeEach } from "vitest";

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
const tracks = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  title: `T${i}`,
  artist: "A",
  featArtists: [],
}));
vi.mock("../../../services/music/playlist.js", () => ({
  loadPlaylist: async () => tracks,
}));
let noAudioLeft = 0;
const getPreview = vi.fn(async () =>
  noAudioLeft-- > 0 ? null : { pKey: "p", entry: { url: "u" } },
);
vi.mock("../audio.js", () => ({
  prefetchNextRound: () => Promise.resolve(),
  resolveVideo: async () => null,
  videoStart: () => 0,
  getPreview: (...a) => getPreview(...a),
}));

const { getOrCreateRoom } = await import("../rooms.js");
const { beginGame } = await import("../lobby.js");

function start(roomId) {
  const room = getOrCreateRoom(roomId);
  room.game.maxRounds = 3;
  const emitted = [];
  const io = { to: () => ({ emit: (evt) => emitted.push(evt) }) };
  return { room, emitted, run: () => beginGame(room, io) };
}

beforeEach(() => getPreview.mockClear());

describe("titre sans source audio", () => {
  it("est remplacé par un titre de réserve : la partie garde ses manches", async () => {
    noAudioLeft = 1;
    const { room, run } = start("room-skip");
    await run();
    await vi.waitFor(() => expect(room.game.readyRound).toBe(1));
    clearTimeout(room.game.readyTimer);
    // 3 tirés, 2 sortis (1 sauté), 1 réserve ajoutée
    expect(room.game.sessionPlaylist).toHaveLength(2);
    expect(room.game.skipStreak).toBe(0);
  });

  it("panne totale : la partie se termine vite au lieu de vider la réserve", async () => {
    noAudioLeft = Infinity;
    const { emitted, run } = start("room-outage");
    await run();
    await vi.waitFor(() => expect(emitted).toContain("game_over"));
    // 3 titres tirés + 3 de réserve au plus : 6 essais, pas 50
    expect(getPreview).toHaveBeenCalledTimes(6);
  });
});
