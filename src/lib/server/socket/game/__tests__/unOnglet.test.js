import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../config.js", () => {
  const table = () => ({
    insert: () => ({
      select: () => ({ single: async () => ({ data: { id: "game-1" } }) }),
      then: (r) => r({ error: null }),
    }),
    update: () => ({ eq: async () => ({ error: null }) }),
  });
  return {
    supabase: { from: table, rpc: async () => ({ data: null, error: null }) },
    getAdminClient: () => ({
      rpc: async () => ({ error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
            range: async () => ({ data: [] }),
          }),
        }),
      }),
    }),
  };
});
vi.mock("../../../middleware/auth.js", () => ({
  verifyToken: async (token) => ({ id: token }),
}));
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { roomGames, dbRooms, customRooms } = await import("../../../state.js");
const { register } = await import("../index.js");

let _io = null;

function makeIo() {
  const handlers = {};
  const io = {
    on: (evt, fn) => (handlers[evt] = fn),
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map() },
  };
  _io = io;
  return { io, handlers };
}

function connect(handlers) {
  const events = {};
  const emitted = [];
  const socket = {
    id: `sock-${Math.random()}`,
    on: (evt, fn) => (events[evt] = fn),
    emit: (evt, payload) => emitted.push({ evt, payload }),
    join: () => {},
    leave: () => {},
    disconnect: () => _io.sockets.sockets.delete(socket.id),
  };
  _io.sockets.sockets.set(socket.id, socket);
  handlers.connection(socket);
  return { socket, events, emitted };
}

describe("un seul onglet par compte", () => {
  let handlers;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.keys(roomGames).forEach((k) => delete roomGames[k]);
    Object.keys(dbRooms).forEach((k) => delete dbRooms[k]);
    Object.keys(customRooms).forEach((k) => delete customRooms[k]);
    customRooms.TESTRM = { id: "TESTRM", name: "Test", tracks: [] };
    const io = makeIo();
    handlers = io.handlers;
    register(io.io);
  });

  const compte = (username) => ({
    roomId: "TESTRM",
    username,
    userId: "user-1",
    isGuest: false,
    token: "user-1",
  });

  it("refuse un second pseudo pour le même compte", async () => {
    await connect(handlers).events.join_room(compte("Timeo"));

    const second = connect(handlers);
    await second.events.join_room(compte("lafritequivole"));

    expect(second.emitted.map((e) => e.evt)).toContain("join_refused");
    expect(Object.keys(roomGames.TESTRM.players)).toEqual(["Timeo"]);
  });

  it("laisse le compte se reconnecter sous son propre pseudo", async () => {
    await connect(handlers).events.join_room(compte("Timeo"));

    const second = connect(handlers);
    await second.events.join_room(compte("Timeo"));

    expect(second.emitted.map((e) => e.evt)).not.toContain("join_refused");
    expect(Object.keys(roomGames.TESTRM.players)).toEqual(["Timeo"]);
  });

  it("laisse deux invités jouer sous des pseudos différents", async () => {
    const a = {
      roomId: "TESTRM",
      username: "Alice",
      userId: null,
      isGuest: true,
    };
    const b = {
      roomId: "TESTRM",
      username: "Bob",
      userId: null,
      isGuest: true,
    };
    await connect(handlers).events.join_room(a);
    const second = connect(handlers);
    await second.events.join_room(b);

    expect(second.emitted.map((e) => e.evt)).not.toContain("join_refused");
    expect(Object.keys(roomGames.TESTRM.players)).toEqual(["Alice", "Bob"]);
  });

  it("refuse aussi de rejoindre une autre room", async () => {
    customRooms.AUTRE = { id: "AUTRE", name: "Autre", tracks: [] };
    await connect(handlers).events.join_room(compte("Timeo"));

    const second = connect(handlers);
    await second.events.join_room({ ...compte("Timeo"), roomId: "AUTRE" });

    const refus = second.emitted.find((e) => e.evt === "join_refused");
    expect(refus.payload).toMatchObject({
      roomId: "TESTRM",
      playerName: "Timeo",
    });
    expect(roomGames.AUTRE).toBeUndefined();
  });

  it("laisse le nouvel onglet reprendre la main", async () => {
    customRooms.AUTRE = { id: "AUTRE", name: "Autre", tracks: [] };
    const first = connect(handlers);
    await first.events.join_room(compte("Timeo"));

    const second = connect(handlers);
    await second.events.join_room({
      ...compte("Timeo"),
      roomId: "AUTRE",
      takeover: true,
    });
    await vi.advanceTimersByTimeAsync(6000);

    expect(second.emitted.map((e) => e.evt)).not.toContain("join_refused");
    expect(first.emitted.map((e) => e.evt)).toContain("session_taken_over");
    expect(Object.keys(roomGames.AUTRE.players)).toEqual(["Timeo"]);
    expect(roomGames.TESTRM?.players.Timeo).toBeUndefined();
  });

  it("reprend la main même si l'ancien onglet ne répond plus : la place et le score restent", async () => {
    const first = connect(handlers);
    await first.events.join_room(compte("Timeo"));
    roomGames.TESTRM.players.Timeo.score = 8;
    _io.sockets.sockets.delete(first.socket.id); // onglet fantôme côté serveur

    const second = connect(handlers);
    await second.events.join_room({
      ...compte("lafritequivole"),
      takeover: true,
    });
    await vi.advanceTimersByTimeAsync(6000);

    expect(second.emitted.map((e) => e.evt)).not.toContain("join_refused");
    expect(Object.keys(roomGames.TESTRM.players)).toEqual(["Timeo"]);
    expect(roomGames.TESTRM.players.Timeo.score).toBe(8);
  });
});
