import { describe, it, expect, vi } from "vitest";

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => null,
}));
const { reconnectView } = await import("../players.js");

const salon = (choix) => ({
  settings: { answerMode: "multiple", maxRounds: 5, roundDuration: 15 },
  game: {
    phase: "round",
    paused: false,
    currentRound: 2,
    choices: ["a", "b", "c", "d"],
    currentTrack: { featArtists: [], extraAnswers: [] },
    timerActive: true,
    timerValue: 10,
  },
  players: {
    Bob: {
      username: "Bob",
      token: "t",
      team: null,
      score: 0,
      foundArtist: false,
      foundTitle: false,
      foundFeats: [],
      foundExtras: [],
      _choiceIndex: choix,
    },
  },
});

describe("reprise d'un téléphone en QCM", () => {
  it("renvoie le choix enregistré par le serveur pour la manche", () => {
    const s = salon(2);
    expect(reconnectView(s, s.players.Bob).chosenIndex).toBe(2);
  });

  it("aucun choix enregistré : le téléphone peut répondre", () => {
    const s = salon(null);
    expect(reconnectView(s, s.players.Bob).chosenIndex).toBeNull();
  });
});
