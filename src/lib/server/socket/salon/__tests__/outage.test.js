import { describe, it, expect, beforeEach, vi } from "vitest";

// Rejoue l'incident du 30/10 : toutes les recherches de vidéo échouent
let panne = false;
const alertes = [];
vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: () => {},
}));
vi.mock("../../../services/admin/alerts.js", () => ({
  alertAdminsSafe: (kind, payload) => alertes.push(payload),
}));
let recherches = 0;
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
}));
vi.mock("../tracks.js", () => ({
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  forgetVideo: () => {},
  searchTrackVideo: async (t) => {
    recherches++;
    if (panne) throw new Error("fetch failed");
    return { video: { id: `v-${t.title}` }, safeStart: 0 };
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound } = await import("../rounds.js");
const { checkSession, findVideo } = await import("../media.js");

const CODE = "PANNE1";
const sent = [];
const io = { to: () => ({ emit: (ev, d) => sent.push([ev, d]) }) };
const titres = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `t${i}`,
    artist: "A",
    playlistId: "p1",
  }));

function salonDeTest() {
  const full = titres(12);
  salonRooms[CODE] = {
    code: CODE,
    pro: false,
    settings: { maxRounds: 5, roundDuration: 30, answerMode: "free" },
    players: {},
    game: {
      phase: "lobby",
      currentRound: 0,
      fullPlaylist: full,
      sessionPlaylist: full.slice(0, 5),
      played: [],
      history: [],
    },
  };
  return salonRooms[CODE].game;
}

describe("protections de la musique", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    sent.length = 0;
    recherches = 0;
    panne = false;
  });

  it("sans vidéo, la manche se joue avec l'extrait audio", async () => {
    const game = salonDeTest();
    for (const t of game.sessionPlaylist)
      t.preview_url = `https://cdn/${t.id}.mp3`;
    panne = true;
    await startNextRound(CODE, io);
    expect(game.phase).toBe("round");
    expect(game.currentVideo).toMatchObject({ audio: true });
    expect(game.videoOutage).toBeFalsy();
    const [, round] = sent.find(([ev]) => ev === "salon_round_start");
    expect(round.audioUrl.startsWith("https://cdn/")).toBe(true);
  });

  it("une vidéo trouvée n'est plus recherchée", async () => {
    const salon = { game: salonDeTest(), settings: { roundDuration: 30 } };
    const t = salon.game.fullPlaylist[0];
    await findVideo(salon, t);
    await findVideo(salon, t);
    expect(recherches).toBe(1);
  });

  it("le lobby vérifie toute la musique de la partie", async () => {
    salonDeTest();
    const salon = salonRooms[CODE];
    salon.game.sessionPlaylist[0].preview_url = "https://cdn/x.mp3";
    panne = true;
    await checkSession(salon, io);
    expect(salon.game.mediaCheck).toEqual({
      total: 5,
      video: 0,
      audio: 1,
      missing: 4,
    });
  });
});

describe("panne de recherche vidéo", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    sent.length = 0;
    alertes.length = 0;
    panne = true;
    vi.useRealTimers();
  });

  it("la partie attend au lieu de se terminer, sans perdre de titre", async () => {
    vi.useFakeTimers();
    const game = salonDeTest();
    startNextRound(CODE, io);
    await vi.waitFor(() => expect(game.videoOutage).toBe(true));

    expect(game.phase).not.toBe("gameover");
    expect(game.currentRound).toBe(0);
    expect(game.sessionPlaylist).toHaveLength(5);
    expect(alertes).toHaveLength(1);
    expect(
      sent.some(([ev, d]) => ev === "salon_video_outage" && d.retryIn),
    ).toBe(true);

    // Toujours en panne : on réessaie sans jamais finir la partie
    await vi.advanceTimersByTimeAsync(10_000);
    expect(game.phase).not.toBe("gameover");
    expect(game.sessionPlaylist).toHaveLength(5);

    // YouTube revient : la manche démarre au prochain essai
    panne = false;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(game.phase).toBe("round");
    expect(game.currentRound).toBe(1);
  });
});
