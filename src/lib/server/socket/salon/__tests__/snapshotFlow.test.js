import { describe, it, expect, vi } from "vitest";

// Fausse table salon.snapshots derrière les trois fonctions SQL
const table = new Map();
vi.mock("../../game/audio.js", () => ({
  validPreviewUrl: () => null,
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({
    schema: (s) =>
      s === "salon"
        ? {
            rpc: async (fn, a) => {
              if (fn === "save_salon_snapshot")
                table.set(a.p_code, JSON.parse(JSON.stringify(a.p_data)));
              if (fn === "delete_salon_snapshot") table.delete(a.p_code);
              if (fn === "load_salon_snapshot" && table.has(a.p_code))
                return {
                  data: [{ code: a.p_code, data: table.get(a.p_code) }],
                };
              return { data: null, error: null };
            },
          }
        : null,
  }),
}));
vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../tracks.js", () => ({
  mediaOf: (t) => ({ trackId: t.id }),
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  knownVideo: async (t) => ({
    video: { id: `v-${t.title}` },
    safeStart: 0,
  }),
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound, endRound, finishGame } = await import("../rounds.js");
const { cleanupNow } = await import("../timers.js");
const { restoreSalon } = await import("../snapshot.js");

const CODE = "FLOW01";
const io = {
  to: () => ({ emit: () => {} }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};
const phase = () => table.get(CODE)?.game.phase;

describe("instantané au fil d'une soirée", () => {
  it("suit chaque phase, disparaît à la fermeture, et le code ne revient pas", async () => {
    vi.useFakeTimers();
    try {
      const titre = { id: "t1", title: "T", artist: "A" };
      salonRooms[CODE] = {
        code: CODE,
        settings: {
          maxRounds: 1,
          roundDuration: 30,
          answerMode: "free",
          manualNext: true,
        },
        players: {},
        banned: new Set(),
        game: {
          phase: "lobby",
          currentRound: 0,
          fullPlaylist: [titre],
          sessionPlaylist: [titre],
          played: [],
          history: [],
        },
      };

      await startNextRound(CODE, io);
      expect(phase()).toBe("round");
      endRound(CODE, "fin", io);
      expect(phase()).toBe("summary");
      finishGame(CODE, io);
      expect(phase()).toBe("gameover");

      cleanupNow(CODE, io);
      await vi.runOnlyPendingTimersAsync();
      expect(table.has(CODE)).toBe(false);
      await restoreSalon(CODE, io, {});
      expect(salonRooms[CODE]).toBeUndefined();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
