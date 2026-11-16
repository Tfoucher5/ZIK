import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({ manches: 0 }));

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
  endRound: (code) => {
    const g = salonRooms[code].game;
    clearInterval(g.interval);
    g.interval = null;
    g.phase = "summary";
  },
}));

const { salonRooms } = await import("../../../state.js");
const { armNext, pauseGame, resumeGame } = await import("../timers.js");
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
  salonDeTest();
  Object.assign(salonRooms[CODE].settings, {
    countStart: true,
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
      { kind: "next", endsAt: 1_007_000, now: 1_000_000, show: true },
    ]);
    expect(h.emissions.at(-1).cibles).toEqual([`salon:${CODE}`]);
    vi.advanceTimersByTime(6_999);
    expect(m.manches).toBe(0);
    vi.advanceTimersByTime(1);
    expect(m.manches).toBe(1);
  });

  it("décompte coupé par l'hôte : l'heure de reprise part quand même, sans affichage", () => {
    salonRooms[CODE].settings.countNext = false;
    armNext(CODE, h.io, 7);
    expect(decomptes()).toEqual([
      { kind: "next", endsAt: 1_007_000, now: 1_000_000, show: false },
    ]);
    vi.advanceTimersByTime(7_000);
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

describe("écran qui rejoint pendant un décompte", () => {
  const arrivee = async (id, evt, payload) => {
    const s = makeSocket(id, h.rooms);
    const recus = [];
    s.emit = (event, p) => event === "salon_countdown" && recus.push(p);
    h.connecte(s);
    await s.handlers[evt](payload);
    return recus;
  };
  const arrivees = async () => ({
    tv: await arrivee("tv", "salon_join_host", { code: CODE, key: CLE }),
    rg: await arrivee("rg", "salon_join_control", { code: CODE, key: CLE }),
    tel: await arrivee("tel", "salon_join_player", {
      code: CODE,
      username: "Ana",
    }),
  });

  beforeEach(() => {
    registerSalon(h.io);
    game().phase = "summary";
  });

  it("TV, régie et téléphone reçoivent l'heure de reprise", async () => {
    armNext(CODE, h.io, 7);
    vi.advanceTimersByTime(2_000);
    const recu = await arrivees();
    for (const id of ["tv", "rg", "tel"])
      expect(recu[id], id).toEqual([
        { kind: "next", endsAt: 1_007_000, now: 1_002_000, show: true },
      ]);
  });

  it("nouveau joueur pendant le décompte de lancement : il le reçoit", async () => {
    game().phase = "lobby";
    armNext(CODE, h.io, 5, "start");
    vi.advanceTimersByTime(1_000);
    const recus = await arrivee("neuf", "salon_join_player", {
      code: CODE,
      username: "Nouveau",
    });
    expect(salonRooms[CODE].players.Nouveau).toBeDefined();
    expect(recus).toEqual([
      { kind: "start", endsAt: 1_005_000, now: 1_001_000 },
    ]);
  });

  it("décompte annulé par une pause, ou terminé : rien", async () => {
    armNext(CODE, h.io, 7);
    pauseGame(CODE, h.io);
    for (const recus of Object.values(await arrivees()))
      expect(recus).toEqual([]);
    resumeGame(CODE, h.io);
    vi.advanceTimersByTime(3_000);
    expect(m.manches).toBe(1);
    expect(
      await arrivee("tv2", "salon_join_host", { code: CODE, key: CLE }),
    ).toEqual([]);
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

  it("pause pendant le décompte d'une revanche : la régie peut relancer", () => {
    game().phase = "summary";
    regie.handlers.salon_restart();
    pauseGame(CODE, h.io);
    expect(game()._starting).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(m.manches).toBe(0);
  });

  it("revanche : même décompte, une seule fois", () => {
    game().phase = "gameover";
    regie.handlers.salon_restart();
    regie.handlers.salon_restart();
    expect(decomptes().map((d) => d.kind)).toEqual(["start"]);
    vi.advanceTimersByTime(5_000);
    expect(m.manches).toBe(1);
  });

  it("décompte de lancement coupé : la première manche part tout de suite", () => {
    salonRooms[CODE].settings.countStart = false;
    regie.handlers.salon_start();
    expect(m.manches).toBe(1);
    expect(decomptes()).toEqual([]);
  });

  it("chaque décompte se coupe à part, en pleine partie et sans Pro", () => {
    game().phase = "round";
    regie.handlers.salon_update_settings({ countNext: false });
    expect(salonRooms[CODE].settings).toMatchObject({
      countStart: true,
      countNext: false,
    });
    regie.handlers.salon_update_settings({ countStart: false });
    regie.handlers.salon_update_settings({ countNext: "oui" });
    expect(salonRooms[CODE].settings).toMatchObject({
      countStart: false,
      countNext: true,
    });
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
