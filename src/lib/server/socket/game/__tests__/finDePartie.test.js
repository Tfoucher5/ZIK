import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// La room se vide pendant que la fin de partie écrit en base : chaque joueur
// reste compté une seule fois, avec son classement
const db = vi.hoisted(() => ({
  lignes: [],
  stats: [],
  liberer: null,
  bloque: null,
  settle: vi.fn(),
  resultat: vi.fn(async () => null),
}));

// Une seule attente, partagée : le départ d'alice règle aussi ses cartes
const attente = () =>
  (db.attente ??= new Promise((r) => {
    db.liberer = r;
  }));

vi.mock("../../../config.js", () => {
  const rpc = async (fn, a) => {
    if (fn === "update_player_stats") db.stats.push(a.p_user_id);
    return { data: null, error: null };
  };
  const from = () => ({
    update: () => ({
      eq: () => (db.bloque === "base" ? attente() : Promise.resolve({})),
    }),
    insert: async (x) => {
      db.lignes.push(...[x].flat());
      return {};
    },
  });
  const client = { from, rpc, schema: () => client };
  return { supabase: client, getAdminClient: () => client };
});
vi.mock("../../../services/achievements.js", () => ({
  checkAchievements: async () => [],
  saveGameResult: (...args) => db.resultat(...args),
}));
vi.mock("../../../services/weeklyChallenge.js", () => ({
  bumpWeeklyChallenge: () => {},
}));
vi.mock("../cardSettle.js", () => ({
  settleCards: async (args) => {
    db.settle(args);
    if (db.bloque === "cartes") await attente();
  },
}));

const { roomGames } = await import("../../../state.js");
const { leaveRoom } = await import("../lobby.js");
const { finishGame } = await import("../rounds.js");

const io = { to: () => ({ emit: () => {} }) };

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  db.lignes = [];
  db.stats = [];
  db.attente = null;
  db.settle.mockClear();
  db.resultat.mockClear();
  db.bloque = null;
});
afterEach(() => {
  delete roomGames.X;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function salle() {
  roomGames.X = {
    roomId: "X",
    game_mode: "classic",
    players: {
      alice: { name: "alice", userId: "u-a", isGuest: false, score: 3 },
    },
    socketToName: { s1: "alice" },
    nameToSocket: { alice: "s1" },
    game: {
      dbGameId: "g",
      currentRound: 2,
      plannedRounds: 2,
      savedPlayers: new Set(),
      _ended: false,
      departed: {
        bob: {
          name: "bob",
          userId: "u-b",
          isGuest: false,
          score: 4,
          roundsPresent: 2,
        },
      },
    },
  };
  return roomGames.X;
}

describe("deux fins de partie simultanées", () => {
  it("résultats et succès ne sont écrits qu'une fois", async () => {
    const room = salle();
    await Promise.all([finishGame(room, io), finishGame(room, io)]);
    expect(db.resultat).toHaveBeenCalledTimes(2);
    expect(db.resultat.mock.calls.map(([r]) => r.username).sort()).toEqual([
      "alice",
      "bob",
    ]);
  });
});

describe("la room se vide pendant la fin de partie", () => {
  for (const [cas, bloque] of [
    ["l'écriture en base", "base"],
    ["le réglage des cartes", "cartes"],
  ])
    it(`pendant ${cas} : une ligne classée par joueur, stats une fois`, async () => {
      db.bloque = bloque;
      const room = salle();
      leaveRoom({ id: "s1", leave: () => {} }, "X", io);
      await vi.advanceTimersByTimeAsync(4000);

      const fin = finishGame(room, io);
      await vi.advanceTimersByTimeAsync(1100); // délai de grâce d'alice écoulé
      db.bloque = null;
      db.liberer();
      await vi.advanceTimersByTimeAsync(0);
      await fin;
      await vi.advanceTimersByTimeAsync(0);

      expect(db.lignes.map((l) => [l.username, l.rank])).toEqual([
        ["bob", 1],
        ["alice", 2],
      ]);
      expect(db.stats.sort()).toEqual(["u-a", "u-b"]);
      expect(db.settle).toHaveBeenCalledWith(
        expect.objectContaining({ name: "bob", keep: true }),
      );
    });
});
