import { describe, it, expect, beforeEach, vi } from "vitest";

// Pas de base en test : les instantanés sont couverts par snapshot.test.js
vi.mock("../../game/audio.js", () => ({
  validPreviewUrl: () => null,
}));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  freezeAndSaveAll: async () => {},
  purgeSnapshots: async () => {},
  dropSnapshot: async () => {},
  restoreSalon: async () => {},
}));

vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../tracks.js", () => ({
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  knownVideo: async (t) => {
    if (t.title.startsWith("KO")) throw new Error("No video");
    return { video: { id: `v-${t.title}` }, safeStart: 0 };
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound, skipTrack, finishGame } = await import("../rounds.js");
const { drawSpareTrack } = await import("../session.js");
const { mediaMissesSince, resetMediaMisses } =
  await import("../../../services/health/mediaMisses.js");

const CODE = "ROUND1";
const io = { to: () => ({ emit: () => {} }) };
const t = (title, playlistId = "p1") => ({
  id: title,
  title,
  artist: "A",
  playlistId,
});

function salonDeTest(full, session, maxRounds) {
  salonRooms[CODE] = {
    code: CODE,
    settings: { maxRounds, roundDuration: 30, answerMode: "free" },
    players: {},
    game: {
      phase: "lobby",
      currentRound: 0,
      fullPlaylist: full,
      sessionPlaylist: session,
      played: [],
      history: [],
    },
  };
  return salonRooms[CODE].game;
}

describe("fin de partie pendant la recherche d'une vidéo", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  });

  it("ne relance pas de manche après la fin", async () => {
    const ok1 = t("ok1");
    const game = salonDeTest([ok1], [ok1], 5);
    const pending = startNextRound(CODE, io);
    finishGame(CODE, io);
    await pending;
    expect(game.phase).toBe("gameover");
  });

  it("la partie suivante démarre depuis le podium", async () => {
    const ok1 = t("ok1");
    const game = salonDeTest([ok1], [ok1], 5);
    game.phase = "gameover";
    await startNextRound(CODE, io);
    expect(game.phase).toBe("round");
  });
});

describe("titre sans vidéo en salon", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  });

  it("ne consomme pas de manche et joue un titre de réserve", async () => {
    const ok1 = t("ok1");
    const ko = t("KO");
    const spare = t("spare");
    const game = salonDeTest([ok1, ko, spare], [ok1, ko], 2);

    await startNextRound(CODE, io);
    await vi.waitFor(() => expect(game.phase).toBe("round"));
    expect(game.currentRound).toBe(1);
    expect(game.currentTrack).toBe(ok1);
    expect(game.sessionPlaylist).toEqual([spare]);

    await startNextRound(CODE, io);
    expect(game.currentRound).toBe(2);
    expect(game.currentTrack).toBe(spare);
    clearTimeout(game.musicReadyTimer);
  });

  it("une vidéo illisible à l'écran est remplacée dans la même manche", async () => {
    const a = t("a");
    const b = t("b");
    const spare = t("spare");
    const game = salonDeTest([a, b, spare], [b, a], 2);

    await startNextRound(CODE, io);
    expect(game.currentRound).toBe(1);
    resetMediaMisses();
    skipTrack(CODE, io);
    // Compté par la surveillance : c'est ce qui aurait détecté le 30/10
    expect(mediaMissesSince(5 * 60_000)).toBe(1);
    await vi.waitFor(() => expect(game.currentTrack).toBe(b));
    expect(game.currentRound).toBe(1);
    expect(game.sessionPlaylist).toEqual([spare]);
    clearTimeout(game.musicReadyTimer);
  });
});

describe("drawSpareTrack", () => {
  it("préfère la même playlist et ne reprend ni joué ni à venir", () => {
    const joue = t("joue", "p1");
    const avenir = t("avenir", "p1");
    const memePl = t("meme", "p1");
    const autre = t("autre", "p2");
    const game = {
      fullPlaylist: [joue, avenir, memePl, autre],
      played: [joue],
      sessionPlaylist: [avenir],
    };
    drawSpareTrack(game, joue);
    expect(game.sessionPlaylist).toEqual([memePl, avenir]);
  });

  it("ne fait rien quand la playlist est épuisée", () => {
    const a = t("a");
    const game = { fullPlaylist: [a], played: [a], sessionPlaylist: [] };
    drawSpareTrack(game, a);
    expect(game.sessionPlaylist).toEqual([]);
  });
});

describe("début de manche", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
  });

  it("le média part à la TV et à la régie, jamais aux téléphones", async () => {
    const ok1 = t("ok1");
    salonDeTest([ok1], [ok1], 5);
    const sent = {};
    const ioCapture = {
      to: (salle) => ({ emit: (ev, d) => (sent[`${salle}|${ev}`] = d) }),
    };
    await startNextRound(CODE, ioCapture);
    const ev = "salon_round_start";
    expect(sent[`salon:screens:${CODE}|${ev}`].videoId).toBe("v-ok1");
    expect(sent[`salon:screens:${CODE}|${ev}`]).not.toHaveProperty("hostInfo");
    expect(sent[`salon:ctrl:${CODE}|${ev}`]).toHaveProperty("hostInfo");
    expect(sent[`salon:ctrl:${CODE}|${ev}`].videoId).toBe("v-ok1");
    const phone = sent[`salon:players:${CODE}|${ev}`];
    expect(phone.round).toBe(1);
    expect(phone).not.toHaveProperty("videoId");
    expect(phone).not.toHaveProperty("audioUrl");
    expect(phone).not.toHaveProperty("startSeconds");
    expect(phone).not.toHaveProperty("hostInfo");
  });
});
