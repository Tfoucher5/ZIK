import { describe, it, expect, vi } from "vitest";

vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => null,
}));
const { reconnectView } = await import("../phoneView.js");

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

describe("reprise d'un téléphone : réglages", () => {
  it("le nom de la soirée revient avec les réglages, pour la story", () => {
    const s = salon(null);
    s.settings.title = "Quiz du jeudi";
    expect(reconnectView(s, s.players.Bob).settings).toEqual({
      answerMode: "multiple",
      maxRounds: 5,
      rounds: 2,
      title: "Quiz du jeudi",
    });
  });
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

describe("reprise d'un téléphone en buzzer et en manche spéciale", () => {
  const buzzer = () => {
    const s = salon(null);
    s.settings.answerMode = "buzzer";
    Object.assign(s.game, {
      special: "double",
      buzzer: { username: "Ana", at: 3.2 },
      currentTrack: {
        title: "Titre secret",
        artist: "Artiste secret",
        videoId: "vid123",
        audioUrl: "https://cdn/x.mp3",
        cover: "https://cdn/c.jpg",
        featArtists: [],
        extraAnswers: [],
      },
      correctChoiceIndex: 2,
    });
    return s;
  };

  it("buzzer verrouillé après une mauvaise réponse : il le reste", () => {
    const s = buzzer();
    s.players.Bob._buzzLocked = true;
    expect(reconnectView(s, s.players.Bob)).toMatchObject({
      special: "double",
      buzzer: "Ana",
      buzzLocked: true,
    });
  });

  it("hors manche spéciale et sans buzz : rien d'annoncé", () => {
    const s = salon(null);
    expect(reconnectView(s, s.players.Bob)).toMatchObject({
      special: null,
      buzzer: null,
      buzzLocked: false,
    });
  });

  it("ni média ni réponse dans la vue du téléphone", () => {
    const s = buzzer();
    const sent = JSON.stringify(reconnectView(s, s.players.Bob));
    for (const secret of [
      "vid123",
      "cdn/",
      "Titre secret",
      "Artiste secret",
      "videoId",
      "audioUrl",
      "correctChoiceIndex",
      '"at"',
    ])
      expect(sent).not.toContain(secret);
  });
});
