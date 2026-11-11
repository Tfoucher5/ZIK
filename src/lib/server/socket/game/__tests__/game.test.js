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
    supabase: {
      schema() {
        return this;
      },
      from: table,
      rpc: async () => ({ data: null, error: null }),
    },
    getAdminClient: () => ({
      schema() {
        return this;
      },
      from: table,
      rpc: async () => ({ error: null }),
    }),
  };
});
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: async () => null,
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));
const loadPlaylist = vi.fn(async () => []);
vi.mock("../../../services/music/playlist.js", async (importOriginal) => ({
  ...(await importOriginal()),
  loadPlaylist: (...args) => loadPlaylist(...args),
}));

const { roomGames, dbRooms, customRooms } = await import("../../../state.js");
const { register, adminEndGame } = await import("../index.js");

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
  room.game.inProgress = true;
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

describe("relance d'une partie", () => {
  let handlers;

  beforeEach(() => {
    loadPlaylist.mockClear();
    vi.useFakeTimers();
    Object.keys(roomGames).forEach((k) => delete roomGames[k]);
    Object.keys(dbRooms).forEach((k) => delete dbRooms[k]);
    Object.keys(customRooms).forEach((k) => delete customRooms[k]);
    customRooms.TESTRM = { id: "TESTRM", name: "Test", tracks: [] };
    const io = makeIo();
    handlers = io.handlers;
    register(io.io);
  });

  it("ne lance qu'une partie quand tous les joueurs demandent à rejouer en même temps", async () => {
    const a = connect(handlers);
    await a.events.join_room({ roomId: "TESTRM", username: "Alice" });
    const b = connect(handlers);
    await b.events.join_room({ roomId: "TESTRM", username: "Bob" });

    await Promise.all([
      a.events.request_new_game(),
      b.events.request_new_game(),
    ]);

    expect(loadPlaylist).toHaveBeenCalledTimes(1);
  });

  it("refuse une nouvelle partie pendant la pause entre deux manches", async () => {
    const a = connect(handlers);
    await a.events.join_room({ roomId: "TESTRM", username: "Alice" });
    roomGames.TESTRM.game.inProgress = true;

    await a.events.request_new_game();

    expect(loadPlaylist).not.toHaveBeenCalled();
  });
});
