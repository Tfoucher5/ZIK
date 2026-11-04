import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../snapshot.js", () => ({
  saveSnapshot: async () => {},
  dropSnapshot: async () => {},
}));
vi.mock("../outage.js", () => ({ clearOutage: () => {} }));
vi.mock("../rounds.js", () => ({
  startNextRound: () => {},
  endRound: (code) => {
    const g = salonRooms[code].game;
    clearInterval(g.interval);
    g.interval = null;
    g.phase = "summary";
  },
}));

const { salonRooms } = await import("../../../state.js");
const { startTimer, pauseGame, resumeGame, timerClock } =
  await import("../timers.js");

const CODE = "CHRONO";
const sent = [];
const io = { to: () => ({ emit: (ev, d) => sent.push([ev, d]) }) };
const game = () => salonRooms[CODE].game;
const dernier = (ev) => sent.filter(([e]) => e === ev).at(-1)?.[1];

describe("chrono par heure de fin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    sent.length = 0;
    salonRooms[CODE] = {
      code: CODE,
      settings: { roundDuration: 30 },
      game: { phase: "round", paused: false, interval: null },
    };
  });
  afterEach(() => {
    clearInterval(game().interval);
    delete salonRooms[CODE];
    vi.useRealTimers();
  });

  it("annonce l'heure de fin et clôt la manche pile à l'heure", () => {
    startTimer(CODE, io);
    expect(dernier("salon_timer_started")).toEqual({
      max: 30,
      endsAt: 1_030_000,
      now: 1_000_000,
    });
    vi.advanceTimersByTime(29_000);
    expect(game().phase).toBe("round");
    expect(game().timerValue).toBe(1);
    // Chaque écran compte seul : aucun message par seconde
    expect(dernier("salon_timer_update")).toBeUndefined();
    vi.advanceTimersByTime(1000);
    expect(game().phase).toBe("summary");
  });

  it("un tick en retard (boucle d'événements chargée) ne décale pas le temps", () => {
    startTimer(CODE, io);
    // 5 s passent sans qu'aucun tick ne parte
    vi.setSystemTime(1_005_000);
    vi.advanceTimersByTime(1000);
    expect(game().timerValue).toBe(24);
  });

  it("la pause garde le temps restant, la reprise annonce la nouvelle heure de fin", () => {
    startTimer(CODE, io);
    vi.advanceTimersByTime(10_000);
    pauseGame(CODE, io);
    expect(timerClock(game()).endsAt).toBeNull();
    vi.advanceTimersByTime(60_000);
    expect(game().phase).toBe("round");

    resumeGame(CODE, io);
    expect(dernier("salon_timer_update").endsAt).toBe(Date.now() + 20_000);
    vi.advanceTimersByTime(19_000);
    expect(game().phase).toBe("round");
    vi.advanceTimersByTime(1000);
    expect(game().phase).toBe("summary");
  });

  it("hors manche, aucune heure de fin n'est donnée", () => {
    startTimer(CODE, io);
    game().phase = "summary";
    expect(timerClock(game()).endsAt).toBeNull();
  });
});
