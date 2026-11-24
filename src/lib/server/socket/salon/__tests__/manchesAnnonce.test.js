import { describe, it, expect, beforeEach, vi } from "vitest";

// Le vrai total est annoncé à tous les écrans dès qu'une pile est tirée
// (lobby, podium, revanche) puis après la vérification de la musique.
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
const verif = vi.hoisted(() => ({ dead: [] }));
vi.mock("../media.js", () => ({
  checkSession: async (salon) => {
    salon.game.mediaCheck = { dead: verif.dead };
  },
  findVideo: async () => ({ video: { id: "v" }, safeStart: 0 }),
  previewUrl: async () => null,
  resolveMedia: async () => ({ video: { id: "v" }, safeStart: 0 }),
}));
vi.mock("../tracks.js", async (orig) => ({
  ...(await orig()),
  buildSessionPlaylist: (tracks, n) => tracks.slice(0, Math.max(0, n)),
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { prepareSession } = await import("../session.js");
const { finishGame } = await import("../rounds.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const titres = (n) => Array.from({ length: n }, (_, i) => ({ id: "t" + i }));
let h;
const totaux = () =>
  h.emissions
    .filter((e) => e.event === "salon_settings")
    .map((e) => e.payload.settings.rounds);
const fin = () => new Promise((r) => setTimeout(r, 0));

describe("annonce du vrai total", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    salonDeTest();
    h = makeIo();
    verif.dead = [];
  });

  it("lobby : total des titres, puis baissé par un introuvable sans réserve", async () => {
    const s = salonRooms[CODE];
    s.settings.maxRounds = 5;
    s.game.fullPlaylist = titres(3);
    verif.dead = ["t1"];
    prepareSession(CODE, h.io);
    await fin();
    expect(totaux()).toEqual([3, 2]);
  });

  it("podium : le total de la revanche part tout de suite", async () => {
    const s = salonRooms[CODE];
    s.settings.maxRounds = 5;
    s.game.fullPlaylist = titres(8);
    Object.assign(s.game, { phase: "summary", currentRound: 5 });
    finishGame(CODE, h.io);
    await fin();
    expect(totaux()[0]).toBe(5);
  });

  it("« Recommencer » depuis la réponse affichée : jamais le choix de 5 avec 3 titres", async () => {
    registerSalon(h.io);
    const regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    await regie.handlers.salon_join_control({ code: CODE, key: CLE });
    const s = salonRooms[CODE];
    s.settings.maxRounds = 5;
    s.game.fullPlaylist = titres(3);
    Object.assign(s.game, { phase: "summary", currentRound: 2 });
    h.emissions.length = 0;
    await regie.handlers.salon_restart();
    await fin();
    clearInterval(s.game.interval);
    clearTimeout(s.game.breakTimer);
    expect(totaux().length).toBeGreaterThan(0);
    expect(totaux().every((n) => n === 3)).toBe(true);
  });
});
