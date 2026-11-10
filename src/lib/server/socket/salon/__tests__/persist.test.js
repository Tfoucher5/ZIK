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
    from: () => ({
      insert: (rows) => {
        inserts.push(rows);
        return { then: (r) => r({ error: null }) };
      },
      update: (row) => {
        updates.push(row);
        return { eq: () => ({ then: (r) => r({ error: null }) }) };
      },
    }),
  }),
}));

const { recordSalonGameEnd } = await import("../persist.js");
const { addPlayer } = await import("../players.js");
const { departPlayer } = await import("../departed.js");

describe("fin de partie en base", () => {
  it("un joueur parti figure dans salon_players et le nombre de joueurs", () => {
    const salon = {
      code: "PERS1",
      settings: { teams: null },
      players: {},
      game: { phase: "round", dbGameId: "g1" },
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
});
