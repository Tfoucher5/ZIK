import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({ signalements: [] }));

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  dropSnapshot: async () => {},
}));
vi.mock("../persist.js", () => ({
  recordSalonGameEnd: () => {},
  recordSalonGameStart: () => {},
  recordSalonPlayers: () => {},
}));
vi.mock("../../../config.js", () => ({
  supabase: {},
  getAdminClient: () => ({}),
}));
vi.mock("../../../services/music/trackIssues.js", () => ({
  reportTrackIssue: (...args) => m.signalements.push(args),
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { endRound } = await import("../rounds.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

let regie, h;
const game = () => salonRooms[CODE].game;

beforeEach(() => {
  m.signalements = [];
  salonDeTest();
  h = makeIo();
  registerSalon(h.io);
  regie = makeSocket("regie", h.rooms);
  h.connecte(regie);
  regie.handlers.salon_join_control({ code: CODE, key: CLE });
  Object.assign(game(), {
    phase: "round",
    currentTrack: { id: "t3" },
    currentVideo: { id: "v3", start: 30 },
    history: [{ answer: "A" }, { answer: "B" }],
    historyMedia: [
      { trackId: "t1", videoId: "v1", start: 15 },
      { trackId: "t2", videoId: "v2", start: 20 },
    ],
  });
});
afterEach(() => {
  clearTimeout(salonRooms[CODE]._cleanupTimer);
  delete salonRooms[CODE];
});

describe("signaler un titre depuis la régie", () => {
  it("un titre déjà joué part avec la vidéo qui passait à sa manche", () => {
    regie.handlers.salon_report_video({ reason: "Pas de son", round: 1 });
    expect(m.signalements).toEqual([
      [
        "t1",
        "video",
        "host",
        "Pas de son",
        { salon: CODE, videoId: "v1", start: 15 },
      ],
    ]);
  });

  it("sans manche : le titre en cours, comme avant", () => {
    regie.handlers.salon_report_video({ reason: "Mauvaise version" });
    expect(m.signalements[0][0]).toBe("t3");
    expect(m.signalements[0][4]).toMatchObject({ videoId: "v3", start: 30 });
  });

  it("possible aussi au podium, une fois la partie finie", () => {
    game().phase = "gameover";
    regie.handlers.salon_report_video({ reason: "Pas de son", round: 2 });
    expect(m.signalements[0][0]).toBe("t2");
  });

  it("salon repris d'un instantané sans historyMedia : pas de décalage", () => {
    salonRooms[CODE].settings.manualNext = true;
    delete game().historyMedia;
    Object.assign(game().currentTrack, { title: "T", artist: "A" });
    endRound(CODE, "Temps écoulé !", h.io);
    expect(game().historyMedia[2]).toEqual({
      trackId: "t3",
      videoId: "v3",
      start: 30,
    });
    regie.handlers.salon_report_video({ reason: "x", round: 1 });
    expect(m.signalements).toEqual([]);
    regie.handlers.salon_report_video({ reason: "x", round: 3 });
    expect(m.signalements[0][0]).toBe("t3");
  });

  it("manche inconnue ou titre en cours hors manche : rien n'est signalé", () => {
    regie.handlers.salon_report_video({ reason: "x", round: 9 });
    game().phase = "lobby";
    regie.handlers.salon_report_video({ reason: "x" });
    expect(m.signalements).toEqual([]);
  });
});
