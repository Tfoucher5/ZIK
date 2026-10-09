import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../config.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        in: async () => ({ data: [] }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "g1" } }) }),
        then: (r) => r({ error: null }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  getAdminClient: () => ({ rpc: async () => ({ error: null }) }),
}));
vi.mock("youtube-sr", () => ({ YouTube: { search: async () => [] } }));

const { salonRooms } = await import("../../state.js");
const {
  registerSalon,
  salonLiveState,
  supportPause,
  supportResume,
  supportSkip,
  supportKick,
  supportGiftPro,
  supportMessage,
} = await import("../salon.js");

const CODE = "AIDE01";

function makeIo() {
  const rooms = new Map();
  const emissions = [];
  const io = {
    on: () => {},
    to: (cible) => ({
      emit: (event, payload) =>
        emissions.push({ cibles: [].concat(cible), event, payload }),
    }),
    sockets: { adapter: { rooms }, sockets: new Map() },
  };
  return { io, rooms, emissions };
}

function joueur(username, score, extra = {}) {
  return {
    username,
    socketId: null,
    score,
    foundArtist: false,
    foundTitle: false,
    foundFeats: [],
    foundExtras: [],
    _fullFoundCounted: false,
    team: null,
    stats: { found: 0, first: 0 },
    token: `tok-${username}`,
    ...extra,
  };
}

function salonDeTest(phase = "round") {
  salonRooms[CODE] = {
    code: CODE,
    adminKey: "cle",
    pro: false,
    hostUserId: null,
    settings: {
      maxRounds: 10,
      roundDuration: 30,
      showAnswerDuration: 7,
      manualNext: true,
      answerMode: "free",
      playlistIds: ["p1", "p2"],
    },
    players: {
      Camille: joueur("Camille", 12),
      Mehdi: joueur("Mehdi", 30, { _disconnected: true }),
    },
    banned: new Set(),
    game: {
      phase,
      currentRound: 3,
      sessionPlaylist: [],
      fullPlaylist: [{}, {}, {}],
      currentTrack: {
        id: "t1",
        artist: "Daft Punk",
        title: "One More Time",
        cover: null,
        featArtists: [],
      },
      currentVideo: { id: "vid", start: 40 },
      interval: null,
      breakTimer: null,
      musicReadyTimer: null,
      timerValue: 18,
      timerActive: true,
      startTime: Date.now(),
      history: [],
      played: [],
      paused: false,
    },
  };
}

const vus = (h, event) => h.emissions.filter((e) => e.event === event);

describe("dépannage d'un salon depuis l'admin", () => {
  let h;

  beforeEach(() => {
    vi.useFakeTimers();
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    registerSalon(h.io);
  });

  afterEach(() => vi.useRealTimers());

  it("décrit l'état en direct du salon", () => {
    h.rooms.set(`salon:ctrl:${CODE}`, new Set(["regie"]));
    const s = salonLiveState(CODE);
    expect(s).toMatchObject({
      code: CODE,
      pro: false,
      phase: "round",
      round: 3,
      timer: 18,
      screens: 0,
      controls: 1,
      hostConnected: true,
      players: 2,
      playlistIds: ["p1", "p2"],
      trackCount: 3,
      track: { id: "t1", title: "One More Time" },
      video: { id: "vid", start: 40 },
    });
    expect(s.roster.map((p) => [p.username, p.offline])).toEqual([
      ["Mehdi", true],
      ["Camille", false],
    ]);
  });

  it("renvoie null pour un salon inconnu", () => {
    expect(salonLiveState("NOPE00")).toBeNull();
  });

  it("met en pause puis relance la partie", () => {
    supportPause(CODE);
    expect(salonRooms[CODE].game.paused).toBe(true);
    expect(() => supportPause(CODE)).toThrow();
    supportResume(CODE);
    expect(salonRooms[CODE].game.paused).toBe(false);
    expect(vus(h, "salon_paused").map((e) => e.payload.paused)).toEqual([
      true,
      false,
    ]);
  });

  it("refuse la pause hors d'une partie", () => {
    salonRooms[CODE].game.phase = "lobby";
    expect(() => supportPause(CODE)).toThrow();
  });

  it("passe le titre en révélant la réponse", () => {
    expect(supportSkip(CODE)).toBe("revealed");
    expect(salonRooms[CODE].game.phase).toBe("summary");
    expect(vus(h, "salon_round_end")[0].payload.reason).toMatch(/support/);
  });

  it("lance la suite quand la réponse est affichée", () => {
    salonRooms[CODE].game.phase = "summary";
    expect(supportSkip(CODE)).toBe("next");
    // Plus aucun titre en réserve : la partie se termine
    expect(salonRooms[CODE].game.phase).toBe("gameover");
  });

  it("retire un joueur et le bannit pour la soirée", () => {
    supportKick(CODE, "Camille");
    expect(salonRooms[CODE].players.Camille).toBeUndefined();
    expect(salonRooms[CODE].banned.has("camille")).toBe(true);
    expect(() => supportKick(CODE, "Inconnu")).toThrow();
  });

  it("offre le Pro et prévient la régie et la TV", () => {
    supportGiftPro(CODE);
    expect(salonRooms[CODE].pro).toBe(true);
    expect(salonLiveState(CODE).proGift).toBe(true);
    expect(vus(h, "salon_pro")[0].cibles).toEqual([
      `salon:screens:${CODE}`,
      `salon:ctrl:${CODE}`,
    ]);
    expect(() => supportGiftPro(CODE)).toThrow();
  });

  it("affiche un message sur l'écran choisi", () => {
    supportMessage(CODE, "  Le support ZIK est là : on regarde  ", "control");
    const [m] = vus(h, "salon_support");
    expect(m.cibles).toEqual([`salon:ctrl:${CODE}`]);
    expect(m.payload.message).toBe("Le support ZIK est là : on regarde");
    expect(() => supportMessage(CODE, "   ")).toThrow();
  });

  it("refuse d'agir sur un salon fermé", () => {
    expect(() => supportPause("NOPE00")).toThrow(/plus en cours/);
  });
});
