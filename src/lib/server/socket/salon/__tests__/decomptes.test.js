import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({ manches: 0, fins: [] }));

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
vi.mock("../rounds.js", () => ({
  startNextRound: () => m.manches++,
  finishGame: () => {},
  skipTrack: () => {},
  checkEveryoneDone: () => {},
  endRound: (code, reason) => {
    const g = salonRooms[code].game;
    clearInterval(g.interval);
    g.interval = null;
    g.phase = "summary";
    m.fins.push(reason);
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startTimer, armNext, endSoon, pauseGame, resumeGame } =
  await import("../timers.js");
const { registerSalon } = await import("../index.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

const game = () => salonRooms[CODE].game;
let h;
const decomptes = () =>
  h.emissions
    .filter((e) => e.event === "salon_countdown")
    .map((e) => e.payload);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  m.manches = 0;
  m.fins = [];
  salonDeTest();
  Object.assign(salonRooms[CODE].settings, {
    startCountdown: 5,
    revealCountdown: 3,
    showAnswerDuration: 7,
  });
  h = makeIo();
});
afterEach(() => {
  clearInterval(game().interval);
  clearTimeout(game().breakTimer);
  clearTimeout(salonRooms[CODE]._cleanupTimer);
  delete salonRooms[CODE];
  vi.useRealTimers();
});

describe("décompte avant le titre suivant", () => {
  it("annonce l'heure de reprise à tout le salon puis lance la manche", () => {
    armNext(CODE, h.io, 7);
    expect(decomptes()).toEqual([
      { kind: "next", endsAt: 1_007_000, now: 1_000_000 },
    ]);
    expect(h.emissions.at(-1).cibles).toEqual([`salon:${CODE}`]);
    vi.advanceTimersByTime(6_999);
    expect(m.manches).toBe(0);
    vi.advanceTimersByTime(1);
    expect(m.manches).toBe(1);
  });

  it("à zéro seconde, la manche part tout de suite sans décompte", () => {
    armNext(CODE, h.io, 0, "start");
    expect(m.manches).toBe(1);
    expect(decomptes()).toEqual([]);
    expect(game()._starting).toBe(false);
  });

  it("la pause annule le décompte, la reprise en annonce un nouveau", () => {
    game().phase = "summary";
    armNext(CODE, h.io, 7);
    pauseGame(CODE, h.io);
    vi.advanceTimersByTime(60_000);
    expect(m.manches).toBe(0);
    resumeGame(CODE, h.io);
    expect(decomptes().at(-1)).toMatchObject({
      kind: "next",
      endsAt: 1_063_000,
    });
    vi.advanceTimersByTime(3_000);
    expect(m.manches).toBe(1);
  });
});

describe("décompte avant la révélation", () => {
  beforeEach(() => {
    game().phase = "round";
    startTimer(CODE, h.io);
  });

  it("tout le monde a répondu : le chrono saute à 3 s puis révèle avec la bonne raison", () => {
    vi.advanceTimersByTime(5_000);
    endSoon(CODE, "Tout le monde a répondu !", h.io);
    const maj = h.emissions
      .filter((e) => e.event === "salon_timer_update")
      .at(-1);
    expect(maj.payload).toMatchObject({ endsAt: 1_008_000 });
    expect(game().phase).toBe("round");
    // Un second appel (dernier joueur qui revient) ne relance rien
    endSoon(CODE, "Tout le monde a répondu !", h.io);
    vi.advanceTimersByTime(3_000);
    expect(m.fins).toEqual(["Tout le monde a répondu !"]);
  });

  it("moins de 3 s restantes ou décompte désactivé : révélation immédiate", () => {
    vi.advanceTimersByTime(28_000);
    endSoon(CODE, "Tout le monde a répondu !", h.io);
    expect(m.fins).toEqual(["Tout le monde a répondu !"]);

    game().phase = "round";
    startTimer(CODE, h.io);
    salonRooms[CODE].settings.revealCountdown = 0;
    endSoon(CODE, "Fini", h.io);
    expect(m.fins.at(-1)).toBe("Fini");
  });

  it("la manche suivante repart avec la raison par défaut", () => {
    endSoon(CODE, "Tout le monde a répondu !", h.io);
    vi.advanceTimersByTime(3_000);
    game().phase = "round";
    startTimer(CODE, h.io);
    vi.advanceTimersByTime(30_000);
    expect(m.fins.at(-1)).toBe("Temps écoulé !");
  });
});

describe("décompte de lancement", () => {
  let regie;
  beforeEach(() => {
    registerSalon(h.io);
    regie = makeSocket("regie", h.rooms);
    h.connecte(regie);
    regie.handlers.salon_join_control({ code: CODE, key: CLE });
    game().sessionPlaylist = [{ id: "a" }];
  });

  it("5 s annoncées avant la première manche, un double clic ne relance rien", () => {
    regie.handlers.salon_start();
    regie.handlers.salon_start();
    expect(decomptes()).toEqual([
      { kind: "start", endsAt: 1_005_000, now: 1_000_000 },
    ]);
    vi.advanceTimersByTime(4_999);
    expect(m.manches).toBe(0);
    vi.advanceTimersByTime(1);
    expect(m.manches).toBe(1);
  });

  it("revanche : même décompte, une seule fois", () => {
    game().phase = "gameover";
    regie.handlers.salon_restart();
    regie.handlers.salon_restart();
    expect(decomptes().map((d) => d.kind)).toEqual(["start"]);
    vi.advanceTimersByTime(5_000);
    expect(m.manches).toBe(1);
  });

  it("aucune donnée de partie dans le décompte", () => {
    regie.handlers.salon_start();
    expect(Object.keys(decomptes()[0]).sort()).toEqual([
      "endsAt",
      "kind",
      "now",
    ]);
  });
});
