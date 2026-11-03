import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../persist.js", () => ({ recordSalonGameEnd: () => {} }));
vi.mock("../session.js", () => ({
  prepareSession: () => {},
  prefetchNextVideo: () => {},
  drawSpareTrack: () => {},
}));
vi.mock("../timers.js", () => ({
  scheduleCleanup: () => {},
  startTimer: () => {},
  clearPause: () => {},
}));

const { salonRooms } = await import("../../../state.js");
const { departPlayer, gamePlayers } = await import("../departed.js");
const { finishGame } = await import("../rounds.js");
const { addPlayer, nightView, resetStats, standings } =
  await import("../players.js");

const CODE = "NIGHT1";
const sent = [];
const io = { to: () => ({ emit: (ev, d) => sent.push([ev, d]) }) };

function salonDeTest(pro, teams = null) {
  salonRooms[CODE] = {
    code: CODE,
    pro,
    settings: { teams },
    players: {},
    game: { phase: "summary", history: [] },
  };
  return salonRooms[CODE];
}

function jouer(salon, scores) {
  for (const [u, s] of Object.entries(scores)) salon.players[u].score = s;
  finishGame(CODE, io);
  for (const p of Object.values(salon.players)) p.score = 0;
}

describe("classement de la soirée", () => {
  beforeEach(() => {
    for (const k of Object.keys(salonRooms)) delete salonRooms[k];
    sent.length = 0;
  });

  it("cumule les parties, classement de partie inchangé", () => {
    const salon = salonDeTest(true);
    addPlayer(salon, "Ana", "s1");
    addPlayer(salon, "Bob", "s2");
    jouer(salon, { Ana: 300, Bob: 100 });
    jouer(salon, { Ana: 0, Bob: 500 });

    const [, over] = sent.at(-1);
    expect(over.scores[0]).toMatchObject({ username: "Bob", score: 500 });
    expect(over.night.games).toBe(2);
    expect(over.night.players).toEqual([
      { username: "Bob", score: 600, team: null },
      { username: "Ana", score: 300, team: null },
    ]);
  });

  it("réservé au Pro, mais les points sont gardés si le salon passe Pro", () => {
    const salon = salonDeTest(false);
    addPlayer(salon, "Ana", "s1");
    jouer(salon, { Ana: 200 });
    expect(sent.at(-1)[1].night).toBeNull();
    salon.pro = true;
    expect(nightView(salon).players[0].score).toBe(200);
  });

  it("un joueur retiré retrouve ses points avec son jeton", () => {
    const salon = salonDeTest(true);
    const ana = addPlayer(salon, "Ana", "s1");
    jouer(salon, { Ana: 250 });
    departPlayer(salon, "Ana");

    expect(addPlayer(salon, "Ana", "s2", "autre").night).toBe(0);
    delete salon.players.Ana;
    expect(addPlayer(salon, "Ana", "s3", ana.token).night).toBe(250);
    expect(salon.departed).toEqual({});
  });

  it("un joueur parti en cours de partie reste dans le résultat et la soirée", () => {
    const salon = salonDeTest(true, [{ id: 0, name: "Rouge" }]);
    const ana = addPlayer(salon, "Ana", "s1");
    ana.team = 0;
    ana.userId = "u-ana";
    addPlayer(salon, "Bob", "s2");
    ana.score = 300;
    departPlayer(salon, "Ana");
    expect(salon.players.Ana).toBeUndefined();
    expect(standings(salon)[0].score).toBe(300);
    expect(gamePlayers(salon).map((p) => [p.username, p.userId])).toEqual([
      ["Bob", undefined],
      ["Ana", "u-ana"],
    ]);

    jouer(salon, { Bob: 100 });
    const [, over] = sent.at(-1);
    expect(over.scores[0]).toMatchObject({
      username: "Ana",
      score: 300,
      left: true,
    });
    expect(over.night.players[0]).toEqual({
      username: "Ana",
      score: 300,
      team: 0,
      left: true,
    });

    // Partie suivante : Ana ne compte plus que pour la soirée
    resetStats(salon);
    expect(gamePlayers(salon).map((p) => p.username)).toEqual(["Bob"]);
    expect(nightView(salon).players.map((p) => p.username)).toEqual([
      "Ana",
      "Bob",
    ]);
  });

  it("un joueur revenu en pleine partie retrouve son score, sans doublon", () => {
    const salon = salonDeTest(true);
    const ana = addPlayer(salon, "Ana", "s1");
    ana.score = 120;
    ana.stats = { found: 2, first: 1 };
    departPlayer(salon, "Ana");
    const back = addPlayer(salon, "Ana", "s2", ana.token);
    expect(back).toMatchObject({ score: 120, scoreBeforeRound: 120 });
    expect(back.stats).toEqual({ found: 2, first: 1 });
    expect(gamePlayers(salon)).toHaveLength(1);
  });

  it("un joueur revenu retrouve son équipe, qui garde ses points", () => {
    const salon = salonDeTest(true, [{ id: 0, name: "Rouge" }]);
    const ana = addPlayer(salon, "Ana", "s1");
    Object.assign(ana, { team: 0, score: 300 });
    const avant = standings(salon)[0].score;
    departPlayer(salon, "Ana");
    expect(addPlayer(salon, "Ana", "s2", ana.token).team).toBe(0);
    expect(standings(salon)[0].score).toBe(avant);

    // Équipe supprimée entre-temps : pas d'équipe fantôme
    departPlayer(salon, "Ana");
    salon.settings.teams = [{ id: 1, name: "Bleue" }];
    expect(addPlayer(salon, "Ana", "s3", ana.token).team).toBeNull();
  });

  it("un joueur parti du lobby sans points n'est pas gardé", () => {
    const salon = salonDeTest(true);
    salon.game.phase = "lobby";
    addPlayer(salon, "Ana", "s1");
    departPlayer(salon, "Ana");
    expect(salon.departed).toBeUndefined();
  });

  it("classe les équipes sur la soirée", () => {
    const salon = salonDeTest(true, [
      { id: 0, name: "Rouge" },
      { id: 1, name: "Bleue" },
    ]);
    addPlayer(salon, "Ana", "s1").team = 0;
    addPlayer(salon, "Bob", "s2").team = 1;
    jouer(salon, { Ana: 100, Bob: 400 });
    jouer(salon, { Ana: 100, Bob: 0 });
    expect(nightView(salon).teams.map((t) => [t.name, t.score])).toEqual([
      ["Bleue", 400],
      ["Rouge", 200],
    ]);
  });
});
