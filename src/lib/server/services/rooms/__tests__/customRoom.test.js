import { describe, it, expect, vi } from "vitest";

const m = vi.hoisted(() => ({ saveDeparted: vi.fn(async () => {}) }));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../socket/game/results.js", () => ({
  saveDeparted: m.saveDeparted,
}));

const { customRooms, roomGames } = await import("../../../state.js");
const { createCustomRoom } = await import("../customRoom.js");

describe("room éphémère", () => {
  it("à 4 h : scores des joueurs partis sauvés, chronos arrêtés, room retirée", () => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = createCustomRoom({ name: "Test", tracks: [{}, {}, {}] });
      const interval = setInterval(() => {}, 1000);
      roomGames[code] = {
        roomId: code,
        players: {},
        game: { interval, departed: { bob: { name: "bob" } } },
      };
      const room = roomGames[code];

      vi.advanceTimersByTime(4 * 60 * 60 * 1000);

      expect(m.saveDeparted).toHaveBeenCalledWith(room);
      expect(room.game.interval).toBeNull();
      expect(roomGames[code]).toBeUndefined();
      expect(customRooms[code]).toBeUndefined();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("à 4 h sans partie : la room disparaît sans erreur", () => {
    vi.useFakeTimers();
    try {
      const code = createCustomRoom({ name: "Test", tracks: [{}, {}, {}] });
      vi.advanceTimersByTime(4 * 60 * 60 * 1000);
      expect(customRooms[code]).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
