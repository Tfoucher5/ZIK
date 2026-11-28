import { describe, it, expect, vi } from "vitest";

// Pas de base en test : les instantanés sont couverts par snapshot.test.js
vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));

const inserts = [];
const updates = [];
vi.mock("../../../config.js", () => ({
  // Clé publique absente : aucune écriture de partie ne doit passer par elle
  supabase: {},
  getAdminClient: () => ({
    schema() {
      return this;
    },
    from: () => ({
      insert: (rows) => {
        inserts.push(rows);
        return {
          then: (r) => r({ error: null }),
          select: () => ({ single: async () => ({ data: { id: "g-new" } }) }),
        };
      },
      update: (row) => {
        updates.push(row);
        return { eq: () => ({ then: (r) => r({ error: null }) }) };
      },
    }),
  }),
}));

const { recordSalonGameStart, recordSalonGameEnd } =
  await import("../persist.js");
const { addPlayer } = await import("../players.js");
const { departPlayer } = await import("../departed.js");

describe("fin de partie en base", () => {
  it("un joueur parti figure dans salon_players et le nombre de joueurs", () => {
    const salon = {
      code: "PERS1",
      settings: { teams: null },
      players: {},
      game: { phase: "round", dbGameId: "g1", history: [] },
    };
    const ana = addPlayer(salon, "Ana", "s1");
    ana.score = 500;
    ana.userId = "u-ana";
    addPlayer(salon, "Bob", "s2").score = 200;
    departPlayer(salon, "Ana");

    recordSalonGameEnd(salon);
    expect(inserts[0]).toEqual([
      expect.objectContaining({
        username: "Ana",
        user_id: "u-ana",
        score: 500,
        rank: 1,
        departed: true,
      }),
      expect.objectContaining({
        username: "Bob",
        score: 200,
        rank: 2,
        departed: false,
      }),
    ]);
    expect(updates[0].player_count).toBe(2);
  });

  it("le nom de la soirée n'est jamais écrit en base", async () => {
    inserts.length = updates.length = 0;
    const salon = {
      code: "PERS2",
      settings: { teams: null, maxRounds: 10, title: "Quiz du jeudi" },
      players: {},
      game: { phase: "lobby", sessionPlaylist: [], history: [] },
    };
    addPlayer(salon, "Ana", "s1").score = 100;
    await recordSalonGameStart(salon);
    salon.game.dbGameId = "g2";
    recordSalonGameEnd(salon);
    expect(inserts.length).toBe(2);
    expect(updates.length).toBe(1);
    expect(JSON.stringify([inserts, updates])).not.toContain("Quiz");
  });

  it("écrit le total affiché au lancement, pas le choix de l'organisateur", async () => {
    inserts.length = 0;
    const salon = {
      code: "PERS3",
      settings: { teams: null, maxRounds: 10 },
      players: {},
      game: {
        phase: "lobby",
        sessionPlaylist: Array.from({ length: 7 }, (_, i) => ({ id: i })),
        history: [],
      },
    };
    await recordSalonGameStart(salon);
    expect(inserts[0]).toMatchObject({ rounds: 7 });
    expect(salon.game.dbGameId).toBe("g-new");
  });

  it("écrit les manches allées jusqu'au bout", () => {
    updates.length = 0;
    const salon = {
      code: "PERS4",
      settings: { teams: null },
      players: {},
      game: { phase: "gameover", dbGameId: "g4", history: [{}, {}, {}] },
    };
    recordSalonGameEnd(salon);
    expect(updates[0].rounds_played).toBe(3);
  });

  it("partie coupée avant la fin de la 1re manche : 0 manche jouée", () => {
    updates.length = 0;
    const salon = {
      code: "PERS5",
      settings: { teams: null },
      players: {},
      game: { phase: "round", dbGameId: "g5", history: [] },
    };
    recordSalonGameEnd(salon);
    expect(updates[0].rounds_played).toBe(0);
  });
});
