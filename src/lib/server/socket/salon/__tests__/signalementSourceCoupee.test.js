import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  signalements: [],
  src: { youtube: true, deezer: true },
}));

vi.mock("../../game/audio.js", () => ({ validPreviewUrl: () => null }));
vi.mock("../../../services/music/deezer.js", () => ({
  fetchDeezerTrackPreview: async () => null,
  deezerPreviewMatch: async () => null,
}));
vi.mock("../../../services/music/sources.js", () => ({ sources: () => m.src }));
vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  dropSnapshot: async () => {},
}));
vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: (...a) => m.signalements.push(a),
}));
vi.mock("../../../services/admin/alerts.js", () => ({
  alertAdminsSafe: () => {},
}));
vi.mock("../tracks.js", () => ({
  mediaOf: (t) => ({ trackId: t.id }),
  buildSessionPlaylist: () => [],
  currentTrackInfo: () => null,
  forgetVideo: () => {},
  // Titre sans vidéo connue
  knownVideo: async () => {
    throw new Error("aucune vidéo");
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startNextRound } = await import("../rounds.js");

const CODE = "COUPE1";
const io = {
  to: () => ({ emit: () => {} }),
  sockets: { adapter: { rooms: new Map() }, sockets: new Map() },
};

function salonDeTest() {
  const full = Array.from({ length: 8 }, (_, i) => ({
    id: `t${i}`,
    title: `t${i}`,
    artist: "A",
  }));
  salonRooms[CODE] = {
    code: CODE,
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
}

describe("titres sans média quand une source est coupée", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    m.signalements = [];
    Object.assign(m.src, { youtube: true, deezer: true });
  });

  it("sources allumées : le titre est signalé dans « Réparer »", async () => {
    salonDeTest();
    startNextRound(CODE, io);
    await vi.waitFor(() => expect(m.signalements.length).toBeGreaterThan(0));
    expect(m.signalements[0][3]).toBe("Ni vidéo ni extrait en salon");
  });

  it("Deezer coupé : aucun faux signalement", async () => {
    m.src.deezer = false;
    salonDeTest();
    startNextRound(CODE, io);
    await vi.waitFor(() =>
      expect(salonRooms[CODE]._journal?.length).toBeGreaterThan(0),
    );
    expect(m.signalements).toEqual([]);
  });
});
