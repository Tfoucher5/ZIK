import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

describe("création : entrées bornées", () => {
  const tracks = (n) => Array.from({ length: n }, () => ({}));
  const make = (o) =>
    customRooms[createCustomRoom({ name: "R", tracks: tracks(20), ...o })];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("code de 6 caractères sans 0, O, 1 ni I, unique", () => {
    const codes = Array.from({ length: 50 }, () =>
      createCustomRoom({ name: "R", tracks: tracks(3) }),
    );
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(new Set(codes).size).toBe(50);
  });

  it("valeurs par défaut", () => {
    expect(make({})).toMatchObject({
      emoji: "🎵",
      maxRounds: 10,
      roundDuration: 30,
      breakDuration: 7,
    });
  });

  it("nom nettoyé et tronqué à 60 caractères", () => {
    expect(make({ name: "  Soirée  " }).name).toBe("Soirée");
    expect(make({ name: "x".repeat(1_000_000) }).name).toHaveLength(60);
  });

  it.each([
    [{ maxRounds: 999, roundDuration: 999, breakDuration: 999 }, [20, 60, 15]],
    [{ maxRounds: -5, roundDuration: 1, breakDuration: -1 }, [3, 10, 3]],
    [{ maxRounds: "abc", roundDuration: null, breakDuration: {} }, [10, 30, 7]],
    [
      { maxRounds: "15", roundDuration: "45.9", breakDuration: [5] },
      [15, 45, 5],
    ],
  ])("réglages hostiles bornés (%#)", (opts, attendu) => {
    const r = make(opts);
    expect([r.maxRounds, r.roundDuration, r.breakDuration]).toEqual(attendu);
  });

  it("pas plus de manches que de titres", () => {
    expect(make({ tracks: tracks(4), maxRounds: 10 }).maxRounds).toBe(4);
  });

  it("moins de 3 titres : aucune room créée", () => {
    let code;
    try {
      code = createCustomRoom({ name: "R", tracks: [] });
    } catch {
      // un refus est le comportement attendu
    }
    expect(customRooms[code]).toBeUndefined();
  });

  it("emoji borné, et remplacé s'il n'est pas un texte", () => {
    expect(make({ emoji: 42 }).emoji).toBe("🎵");
    expect(make({ emoji: "x".repeat(1_000_000) }).emoji.length).toBeLessThan(
      20,
    );
  });
});
