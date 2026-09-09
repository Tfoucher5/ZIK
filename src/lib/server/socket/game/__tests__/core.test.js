import { describe, it, expect, beforeEach, vi } from "vitest";

const inserted = [];

vi.mock("../../../config.js", () => {
  const table = (name) => ({
    insert: (rows) => {
      if (name === "game_players")
        inserted.push(...(Array.isArray(rows) ? rows : [rows]));
      return {
        select: () => ({ single: async () => ({ data: { id: "game-1" } }) }),
        then: (r) => r({ error: null }),
      };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  });
  return {
    supabase: { from: table, rpc: async () => ({ data: null, error: null }) },
    getAdminClient: () => ({ rpc: async () => ({ error: null }) }),
  };
});
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));

const { roomGames, dbRooms, customRooms } = await import("../../../state.js");
const { register, adminEndGame } = await import("../core.js");

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

// Place une partie en cours dans la room avec un joueur qui a marqué des points
function startFakeGame(roomId, name) {
  const room = roomGames[roomId];
  room.game.dbGameId = "game-1";
  room.game.currentRound = 3;
  room.game.savedPlayers = new Set();
  room.players[name].score = 42;
  room.players[name].userId = "user-1";
  room.players[name].isGuest = false;
  return room;
}

describe("persistance des scores au départ d'un joueur", () => {
  let handlers;

  beforeEach(() => {
    inserted.length = 0;
    vi.useFakeTimers();
    Object.keys(roomGames).forEach((k) => delete roomGames[k]);
    Object.keys(dbRooms).forEach((k) => delete dbRooms[k]);
    Object.keys(customRooms).forEach((k) => delete customRooms[k]);
    customRooms.TESTRM = { id: "TESTRM", name: "Test", tracks: [] };
    const io = makeIo();
    handlers = io.handlers;
    register(io.io);
  });

  it("enregistre le score du joueur parti en cours de partie", async () => {
    const { events } = connect(handlers);
    await events.join_room({ roomId: "TESTRM", username: "Alice" });
    startFakeGame("TESTRM", "Alice");

    events.disconnect();
    await vi.advanceTimersByTimeAsync(6000);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      username: "Alice",
      score: 42,
      rank: null,
    });
  });

  it("n'enregistre pas deux fois un joueur déjà persisté à la fin de partie", async () => {
    const { events } = connect(handlers);
    await events.join_room({ roomId: "TESTRM", username: "Alice" });
    const room = startFakeGame("TESTRM", "Alice");

    events.disconnect();
    // la partie se termine pendant les 5 s de grâce : Alice est déjà en base
    room.game.savedPlayers.add("Alice");
    inserted.push({ username: "Alice", score: 42, rank: 1 });

    await vi.advanceTimersByTimeAsync(6000);

    expect(inserted).toHaveLength(1);
  });

  it("n'enregistre pas deux fois même si la room a été libérée de la mémoire", async () => {
    const { events } = connect(handlers);
    await events.join_room({ roomId: "TESTRM", username: "Alice" });
    const room = startFakeGame("TESTRM", "Alice");

    events.disconnect();
    room.game.savedPlayers.add("Alice");
    inserted.push({ username: "Alice", score: 42, rank: 1 });
    delete roomGames.TESTRM; // cleanupRoom déclenché par le départ d'un autre joueur

    await vi.advanceTimersByTimeAsync(6000);

    expect(inserted).toHaveLength(1);
  });
});

describe("un seul onglet par compte", () => {
  let handlers;

  beforeEach(() => {
    inserted.length = 0;
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

  it("reprend la main même si l'ancien onglet ne répond plus", async () => {
    const first = connect(handlers);
    await first.events.join_room(compte("Timeo"));
    _io.sockets.sockets.delete(first.socket.id); // onglet fantôme côté serveur

    const second = connect(handlers);
    await second.events.join_room({
      ...compte("lafritequivole"),
      takeover: true,
    });
    await vi.advanceTimersByTimeAsync(6000);

    expect(second.emitted.map((e) => e.evt)).not.toContain("join_refused");
    expect(Object.keys(roomGames.TESTRM.players)).toEqual(["lafritequivole"]);
  });
});

describe("partie coupée par l'admin", () => {
  let handlers;

  beforeEach(() => {
    inserted.length = 0;
    vi.useFakeTimers();
    Object.keys(roomGames).forEach((k) => delete roomGames[k]);
    Object.keys(dbRooms).forEach((k) => delete dbRooms[k]);
    Object.keys(customRooms).forEach((k) => delete customRooms[k]);
    customRooms.TESTRM = { id: "TESTRM", name: "Test", tracks: [] };
    const io = makeIo();
    handlers = io.handlers;
    register(io.io);
  });

  it("enregistre les scores au lieu de les perdre", async () => {
    const { events } = connect(handlers);
    await events.join_room({ roomId: "TESTRM", username: "Alice" });
    startFakeGame("TESTRM", "Alice");

    await adminEndGame("TESTRM");

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      username: "Alice",
      score: 42,
      rank: 1,
    });
  });

  it("ne persiste pas deux fois si l'admin coupe une partie déjà finie", async () => {
    const { events } = connect(handlers);
    await events.join_room({ roomId: "TESTRM", username: "Alice" });
    startFakeGame("TESTRM", "Alice");

    await adminEndGame("TESTRM");
    await adminEndGame("TESTRM");

    expect(inserted).toHaveLength(1);
  });
});
