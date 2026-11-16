import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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
  startNextRound: () => {},
  finishGame: () => {},
  skipTrack: () => {},
  checkEveryoneDone: () => {},
  endRound: () => {},
}));

const { salonRooms } = await import("../../../state.js");
const { registerSalon } = await import("../index.js");
const { addPlayer, kickPlayer, phoneLists } = await import("../players.js");
const { departPlayer } = await import("../departed.js");
const { CODE, CLE, makeIo, makeSocket, salonDeTest } =
  await import("./salonHarness.js");

let h, regie, salon;
const phones = {};

// Téléphone branché : reçoit sa vue par emitSplit, ses envois passent par safe()
function telephone(u) {
  const s = makeSocket(`s-${u}`, h.rooms);
  Object.assign(s, { salonRole: "player", salonCode: CODE, salonUsername: u });
  s.recus = [];
  s.emit = (ev, d) => s.recus.push([ev, d]);
  h.connecte(s);
  s.join(`salon:players:${CODE}`);
  h.io.sockets.sockets.set(s.id, s);
  addPlayer(salon, u, s.id);
  return (phones[u] = s);
}

const envois = (event) => h.emissions.filter((e) => e.event === event);
const versTelephones = () =>
  h.emissions.filter((e) =>
    e.cibles.some((c) => c.startsWith(`salon:players:`)),
  );
const encore = (u, on) => phones[u].handlers.salon_encore({ on });
const qr = (s, on) => s.handlers.salon_qr_big({ on });
const ligne = (u) =>
  envois("salon_roster")
    .at(-1)
    .payload.players.find((p) => p.username === u);

beforeEach(async () => {
  vi.useFakeTimers();
  salonDeTest();
  salon = salonRooms[CODE];
  salon.game.sessionPlaylist = [{ id: "a" }];
  h = makeIo();
  registerSalon(h.io);
  regie = makeSocket("regie", h.rooms);
  h.connecte(regie);
  await regie.handlers.salon_join_control({ code: CODE, key: CLE });
  for (const u of ["Ana", "Bob", "Cle"]) telephone(u);
  salon.game.phase = "gameover";
  h.emissions.length = 0;
});
afterEach(() => {
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.breakTimer);
  clearTimeout(salon._cleanupTimer);
  delete salonRooms[CODE];
  vi.useRealTimers();
});

describe("QR en grand", () => {
  it("ouvert puis fermé par la régie, vers la TV et la régie seulement", async () => {
    await qr(regie, true);
    expect(salon.qrBig).toBe(true);
    await qr(regie, true);
    await qr(regie, false);
    expect(envois("salon_evening").map((e) => e.payload.qr)).toEqual([
      true,
      false,
    ]);
    expect(envois("salon_evening")[0].cibles).toEqual([
      `salon:screens:${CODE}`,
      `salon:ctrl:${CODE}`,
    ]);
    expect(Object.values(phones).flatMap((p) => p.recus)).toEqual([]);
    expect(versTelephones()).toEqual([]);
  });

  it("refusé à un téléphone, à une TV sans clé, en partie et au podium de soirée", async () => {
    const tv = makeSocket("tv", h.rooms);
    Object.assign(tv, { salonRole: "screen", salonCode: CODE });
    h.connecte(tv);
    await qr(tv, true);
    await qr(phones.Ana, true);
    salon.game.phase = "round";
    await qr(regie, true);
    salon.game.phase = "gameover";
    salon.finale = true;
    await qr(regie, true);
    expect(salon.qrBig).toBeFalsy();
    expect(envois("salon_evening")).toEqual([]);
  });

  it("fermé par le podium de soirée, gardé par l'entracte", async () => {
    salon.pro = true;
    salon.nightGames = 1;
    await qr(regie, true);
    await regie.handlers.salon_intermission({ minutes: 5 });
    expect(salon.qrBig).toBe(true);
    expect(envois("salon_evening").at(-1).payload.qr).toBe(true);
    // Les téléphones ont l'entracte, sans le QR
    expect(phones.Ana.recus.at(-1)).toEqual([
      "salon_evening",
      { intermission: { until: expect.any(Number) }, finale: null },
    ]);
    expect(phoneLists(salon, "Ana").evening).not.toHaveProperty("qr");
    await regie.handlers.salon_finale();
    expect(salon.qrBig).toBe(false);
    expect(envois("salon_evening").at(-1).payload.qr).toBe(false);
  });

  it("fermé par salon_evening_close, salon_restart et salon_start", async () => {
    for (const close of [
      "salon_evening_close",
      "salon_restart",
      "salon_start",
    ]) {
      salon.game._starting = false;
      salon.game.phase = close === "salon_start" ? "lobby" : "gameover";
      await qr(regie, true);
      h.emissions.length = 0;
      await regie.handlers[close]();
      expect(salon.qrBig, close).toBe(false);
      const fin = envois("salon_evening");
      expect(
        fin.map((e) => e.payload.qr),
        close,
      ).toEqual([false]);
      expect(fin[0].cibles, close).not.toContain(`salon:${CODE}`);
      expect(
        Object.values(phones).flatMap((p) =>
          p.recus.filter(([ev]) => ev === "salon_evening"),
        ),
      ).toEqual([]);
      for (const p of Object.values(phones)) p.recus.length = 0;
    }
  });

  it("une régie qui arrive voit le QR ouvert", async () => {
    await qr(regie, true);
    const r2 = makeSocket("regie2", h.rooms);
    let joined;
    r2.emit = (ev, d) => ev === "salon_control_joined" && (joined = d);
    h.connecte(r2);
    await r2.handlers.salon_join_control({ code: CODE, key: CLE });
    expect(joined.evening.qr).toBe(true);
  });
});

describe("« Une autre ! »", () => {
  it("compte juste pour la TV, le total seul pour les téléphones", async () => {
    await encore("Ana", true);
    vi.advanceTimersByTime(1000);
    await encore("Bob", true);
    await encore("Bob", true);
    vi.advanceTimersByTime(1000);
    expect(ligne("Ana").encore).toBe(true);
    expect(ligne("Cle").encore).toBe(false);
    const [, vue] = phones.Cle.recus.at(-1);
    expect(vue).toMatchObject({
      encore: false,
      roster: { count: 3, encore: 2 },
    });
    expect(vue).not.toHaveProperty("players");
    expect(phones.Bob.recus.at(-1)[1].encore).toBe(true);
    await encore("Bob", false);
    vi.advanceTimersByTime(1000);
    expect(phones.Cle.recus.at(-1)[1].roster.encore).toBe(1);
  });

  it("ignoré depuis la régie, un téléphone remplacé ou hors podium", async () => {
    await regie.handlers.salon_encore({ on: true });
    salon.players.Ana.socketId = "autre";
    await encore("Ana", true);
    salon.game.phase = "lobby";
    await encore("Bob", true);
    salon.game.phase = "summary";
    await encore("Bob", true);
    expect(Object.values(salon.players).some((p) => p.encore)).toBe(false);
    expect(envois("salon_roster")).toEqual([]);
  });

  it("un joueur parti ou retiré sort du compte", async () => {
    await encore("Ana", true);
    await encore("Bob", true);
    departPlayer(salon, "Ana");
    kickPlayer(salon, "Bob", h.io);
    vi.advanceTimersByTime(1000);
    expect(phones.Cle.recus.at(-1)[1].roster.encore).toBe(0);
  });

  it("remis à zéro par salon_restart et salon_start, gardé par l'entracte", async () => {
    await encore("Ana", true);
    await regie.handlers.salon_intermission({ minutes: 0 });
    expect(salon.players.Ana.encore).toBe(true);
    await regie.handlers.salon_restart();
    expect(salon.players.Ana.encore).toBe(false);
    salon.game._starting = false;
    salon.game.phase = "gameover";
    await encore("Ana", true);
    salon.game.phase = "lobby";
    await regie.handlers.salon_start();
    expect(salon.players.Ana.encore).toBe(false);
  });

  it("50 bascules en rafale : au plus un envoi par seconde", async () => {
    for (let i = 0; i < 50; i++) await encore("Ana", i % 2 === 0);
    expect(envois("salon_roster")).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(envois("salon_roster")).toHaveLength(2);
    vi.advanceTimersByTime(1000);
    expect(envois("salon_roster")).toHaveLength(2);
    expect(versTelephones()).toEqual([]);
  });
});
