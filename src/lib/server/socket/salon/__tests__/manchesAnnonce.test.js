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
const verif = vi.hoisted(() => ({ dead: [], video: true, audio: null }));
vi.mock("../media.js", () => ({
  checkSession: async (salon) => {
    salon.game.mediaCheck = { dead: verif.dead };
  },
  findVideo: async () => {
    if (!verif.video) throw new Error("introuvable");
    return { video: { id: "v" }, safeStart: 0 };
  },
  previewUrl: async () => verif.audio,
  resolveMedia: async () => ({ video: { id: "v" }, safeStart: 0 }),
}));
vi.mock("../tracks.js", async (orig) => ({
  ...(await orig()),
  buildSessionPlaylist: (tracks, n) => tracks.slice(0, Math.max(0, n)),
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { prefetchNextVideo, prepareSession } = await import("../session.js");
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
    verif.video = true;
    verif.audio = null;
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

  const enPartie = () => {
    const s = salonRooms[CODE];
    s.settings.maxRounds = 5;
    const t = titres(5);
    Object.assign(s.game, {
      phase: "round",
      currentRound: 4,
      fullPlaylist: t,
      played: t.slice(0, 4),
      sessionPlaylist: [t[4]],
      mediaCheck: { dead: ["t4"], missing: 1, video: 4, audio: 0 },
    });
    return s;
  };

  it("introuvable du lobby retrouvé au préchargement : le total remonte avant la dernière manche", async () => {
    const s = enPartie();
    prefetchNextVideo(CODE, h.io);
    await fin();
    expect(totaux()).toEqual([5]);
    expect(s.game.mediaCheck).toMatchObject({ dead: [], missing: 0, video: 5 });
  });

  it("salon fermé pendant le préchargement : rien n'est annoncé", async () => {
    const s = enPartie();
    prefetchNextVideo(CODE, h.io);
    delete salonRooms[CODE];
    await fin();
    expect(totaux()).toEqual([]);
    expect(s.game.mediaCheck.dead).toEqual(["t4"]);
  });

  it("retrouvé en extrait seulement : le total remonte aussi", async () => {
    verif.video = false;
    verif.audio = "https://extrait";
    enPartie();
    prefetchNextVideo(CODE, h.io);
    await fin();
    await fin();
    expect(totaux()).toEqual([5]);
  });

  it("toujours introuvable : rien n'est annoncé", async () => {
    verif.video = false;
    const s = enPartie();
    prefetchNextVideo(CODE, h.io);
    await fin();
    await fin();
    expect(totaux()).toEqual([]);
    expect(s.game.mediaCheck.dead).toEqual(["t4"]);
  });
});
