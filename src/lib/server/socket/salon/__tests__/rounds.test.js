import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../tracks.js", () => ({
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  searchTrackVideo: async (t) => {
    if (t.title.startsWith("KO")) throw new Error("No video");
    return { video: { id: `v-${t.title}` }, safeStart: 0 };
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound, skipTrack } = await import("../rounds.js");
const { drawSpareTrack } = await import("../session.js");

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
    skipTrack(CODE, io);
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
