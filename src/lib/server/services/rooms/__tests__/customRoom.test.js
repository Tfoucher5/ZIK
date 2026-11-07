import { describe, it, expect, vi } from "vitest";

const m = vi.hoisted(() => ({
  saveEveryone: vi.fn(async () => {}),
  emit: vi.fn(),
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../socket/game/results.js", () => ({
  saveEveryone: m.saveEveryone,
}));

const { customRooms, roomGames, setIO } = await import("../../../state.js");
const { createCustomRoom } = await import("../customRoom.js");

describe("room éphémère", () => {
  it("à 4 h : scores sauvés, joueurs prévenus, chronos arrêtés, room retirée", () => {
    vi.useFakeTimers();
    setIO({ to: () => ({ emit: m.emit }) });
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

      expect(m.saveEveryone).toHaveBeenCalledWith(room);
      expect(m.emit.mock.calls[0][0]).toBe("room_force_closed");
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
