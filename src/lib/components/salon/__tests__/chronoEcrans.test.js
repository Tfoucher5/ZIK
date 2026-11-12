import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { listenRegie } from "../regie/regieEvents.js";
import { listenHost } from "../host/hostEvents.js";
import { listenPlayer } from "../play/playerEvents.js";

// Socket factice : recoit() déclenche les écouteurs enregistrés par l'écran
function fauxSocket() {
  const ecoute = {};
  return {
    on: (ev, fn) => (ecoute[ev] ??= []).push(fn),
    emit() {},
    disconnect() {},
    recoit: (ev, d) => (ecoute[ev] ?? []).forEach((fn) => fn(d)),
  };
}

const base = {
  pro: true,
  settings: { playlistIds: [], answerMode: "free", maxRounds: 10 },
  players: [],
  phase: "round",
  paused: false,
  currentRound: 1,
  timerVal: 30,
  timerMax: 30,
  timerActive: true,
};

// Les trois écrans qui affichent le chrono : TV (vue par toute la salle),
// régie, téléphone
const ECRANS = [
  {
    nom: "TV",
    rejoint: "salon_host_joined",
    ecoute: (s) => listenHost(s, s.socket),
    etat: () => ({
      mergeRoster() {},
      applyVolume() {},
      chat: { update() {} },
      players: [],
      settings: {},
    }),
  },
  {
    nom: "régie",
    rejoint: "salon_control_joined",
    ecoute: (s) => listenRegie(s, s.socket),
    etat: () => ({
      mergeRoster() {},
      applyScores() {},
      chat: { update() {} },
      players: [],
      history: [],
    }),
  },
  {
    nom: "téléphone",
    rejoint: "salon_joined",
    ecoute: (s) => listenPlayer(s, s.socket, "ABC123", "Ana"),
    etat: () => ({ showFeedback() {}, players: [] }),
    extra: { username: "Ana", token: "t", reconnecting: true },
  },
];

describe.each(ECRANS)("chrono : $nom", ({ rejoint, ecoute, etat, extra }) => {
  let e;
  const recoit = (ev, d) => e.socket.recoit(ev, d);
  const joint = (d) => recoit(rejoint, { ...base, ...extra, ...d });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.stubGlobal("localStorage", { getItem() {}, setItem() {} });
    e = etat();
    e.socket = fauxSocket();
    ecoute(e);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("compte seul après la connexion, se fige en pause", () => {
    joint({ endsAt: 30_000, now: 0 });
    vi.advanceTimersByTime(2000);
    expect(e.timerVal).toBe(28);
    recoit("salon_paused", { paused: true });
    vi.advanceTimersByTime(10_000);
    expect(e.timerVal).toBe(28);
  });

  it("reconnexion pendant une pause : l'ancien chrono s'arrête", () => {
    recoit("salon_timer_started", { max: 30, endsAt: 30_000, now: 0 });
    vi.advanceTimersByTime(5000);
    e.timerVal = 25;
    joint({ paused: true, timerVal: 25, endsAt: null, now: 5000 });
    vi.advanceTimersByTime(10_000);
    expect(e.timerVal).toBe(25);
  });

  it("révélation avant la fin : le chrono s'arrête", () => {
    recoit("salon_timer_started", { max: 30, endsAt: 30_000, now: 0 });
    vi.advanceTimersByTime(3000);
    recoit("salon_round_end", { scores: [], teams: null });
    vi.advanceTimersByTime(10_000);
    expect(e.timerVal).toBe(27);
  });

  it("pause puis reprise : repart de la nouvelle heure de fin", () => {
    recoit("salon_timer_started", { max: 30, endsAt: 30_000, now: 0 });
    vi.advanceTimersByTime(10_000);
    recoit("salon_paused", { paused: true });
    vi.advanceTimersByTime(60_000);
    expect(e.timerVal).toBe(20);

    recoit("salon_paused", { paused: false });
    recoit("salon_timer_update", { max: 30, endsAt: 90_000, now: 70_000 });
    vi.advanceTimersByTime(5000);
    expect(e.timerVal).toBe(15);
  });

  it("page rechargée pendant la pause : la reprise rétablit le chrono", () => {
    joint({ paused: true, timerVal: 20, timerMax: 45, endsAt: null, now: 0 });
    recoit("salon_paused", { paused: false });
    recoit("salon_timer_update", { max: 45, endsAt: 20_000, now: 0 });
    vi.advanceTimersByTime(1000);
    expect(e).toMatchObject({ timerVal: 19, timerMax: 45 });
  });

  it("décompte de lancement : compte seul, disparaît quand la manche arrive", () => {
    recoit("salon_countdown", { kind: "start", endsAt: 5_000, now: 0 });
    vi.advanceTimersByTime(2000);
    expect(e).toMatchObject({ startSec: 3, nextSec: 0 });
    recoit("salon_round_start", { round: 1, total: 10 });
    expect(e.startSec).toBe(0);
  });

  it("titre suivant : décompte coupé par la pause, puis remplacé", () => {
    recoit("salon_countdown", { kind: "next", endsAt: 7_000, now: 0 });
    vi.advanceTimersByTime(1000);
    expect(e.nextSec).toBe(6);
    recoit("salon_paused", { paused: true });
    vi.advanceTimersByTime(10_000);
    expect(e.nextSec).toBe(0);
    recoit("salon_countdown", { kind: "start", endsAt: 16_000, now: 11_000 });
    expect(e).toMatchObject({ startSec: 5, nextSec: 0 });
  });
});

describe("TV qui se reconnecte en pleine manche", () => {
  it("affiche le chrono tout de suite", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const h = ECRANS[0].etat();
    h.socket = fauxSocket();
    listenHost(h, h.socket);
    h.socket.recoit("salon_host_joined", {
      ...base,
      timerMax: 45,
      endsAt: 40_000,
      now: 10_000,
    });
    expect(h).toMatchObject({ timerStarted: true, timerMax: 45, timerVal: 30 });
    vi.useRealTimers();
  });
});

describe("TV pendant un redémarrage du serveur", () => {
  it("coupe la vidéo, annonce la reprise, efface l'annonce au début de la manche", () => {
    const h = ECRANS[0].etat();
    h.hostCenter = { pauseVideo: vi.fn(), loadMedia() {} };
    h.socket = fauxSocket();
    listenHost(h, h.socket);
    h.socket.recoit("salon_server_restart");
    expect(h.restarting).toBe(true);
    expect(h.hostCenter.pauseVideo).toHaveBeenCalled();

    h.socket.recoit("salon_host_joined", { ...base, phase: "summary" });
    h.socket.recoit("salon_restored", { resumeIn: 5 });
    expect(h).toMatchObject({ restarting: false, restored: { resumeIn: 5 } });
    h.socket.recoit("salon_round_start", { round: 1, total: 10 });
    expect(h.restored).toBeNull();
  });
});

describe.each(ECRANS)("annonce de reprise : $nom", ({ ecoute, etat }) => {
  it("disparaît si l'hôte met en pause ou si la partie se termine", () => {
    for (const fin of [
      ["salon_paused", { paused: true }],
      ["salon_game_over", { scores: [], teams: null, history: [] }],
    ]) {
      const e = etat();
      e.socket = fauxSocket();
      ecoute(e);
      e.socket.recoit("salon_restored", { resumeIn: 5 });
      expect(e.restored).toEqual({ resumeIn: 5 });
      e.socket.recoit(...fin);
      expect(e.restored, fin[0]).toBeNull();
    }
  });
});
