import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../socket/game/index.js", () => ({
  adminGetRoomsSnapshot: () => [{ roomId: "ROCK" }, { roomId: "POP" }],
  adminGetChatHistory: (id) => (id === "ROCK" ? [{ text: "salut" }] : []),
}));

const { sseResponse, liveSnapshot, roomsLiveSnapshot } =
  await import("../live.js");

const saved = {};
beforeEach(() => {
  saved.r = globalThis.__zik_roomGames;
  saved.s = globalThis.__zik_salonRooms;
});
afterEach(() => {
  globalThis.__zik_roomGames = saved.r;
  globalThis.__zik_salonRooms = saved.s;
  vi.useRealTimers();
});

describe("vue en direct de l'admin", () => {
  it("rooms et salons résumés, valeurs manquantes remplacées", () => {
    globalThis.__zik_roomGames = {
      ROCK: {
        socketToName: { a: 1, b: 2 },
        currentRound: 3,
        maxRounds: 10,
        state: "playing",
      },
      VIDE: {},
    };
    globalThis.__zik_salonRooms = {
      ABCD: {
        hostName: "Bar",
        players: [{}, {}, {}],
        game: { state: "round" },
      },
      EFGH: {},
    };
    const s = liveSnapshot();
    expect(s.roomGames).toEqual([
      { roomId: "ROCK", players: 2, round: 3, maxRounds: 10, state: "playing" },
      { roomId: "VIDE", players: 0, round: 0, maxRounds: 0, state: "unknown" },
    ]);
    expect(s.salonRooms).toEqual([
      { code: "ABCD", host: "Bar", players: 3, state: "round" },
      { code: "EFGH", host: "?", players: 0, state: "lobby" },
    ]);
    expect(s.totalConnected).toBe(5);
  });

  it("rien en mémoire : zéro connecté", () => {
    globalThis.__zik_roomGames = undefined;
    globalThis.__zik_salonRooms = undefined;
    expect(liveSnapshot()).toMatchObject({
      roomGames: [],
      salonRooms: [],
      totalConnected: 0,
    });
  });

  it("rooms avec leur historique de discussion", () => {
    expect(roomsLiveSnapshot().rooms).toEqual([
      { roomId: "ROCK", chatMessages: [{ text: "salut" }] },
      { roomId: "POP", chatMessages: [] },
    ]);
  });

  it("flux SSE : un envoi toutes les 2 s, arrêté à la déconnexion", async () => {
    vi.useFakeTimers();
    const ctrl = new AbortController();
    let n = 0;
    const res = sseResponse({ signal: ctrl.signal }, () => ({ n: ++n }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const reader = res.body.getReader();
    expect((await reader.read()).value).toBe('data: {"n":1}\n\n');
    vi.advanceTimersByTime(2000);
    expect((await reader.read()).value).toBe('data: {"n":2}\n\n');
    ctrl.abort();
    vi.advanceTimersByTime(10_000);
    expect(n).toBe(2);
    expect((await reader.read()).done).toBe(true);
  });
});
