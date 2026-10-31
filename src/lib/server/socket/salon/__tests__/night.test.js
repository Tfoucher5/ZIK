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
const { finishGame } = await import("../rounds.js");
const { addPlayer, bankNight, nightView } = await import("../players.js");

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
    bankNight(salon, ana);
    delete salon.players.Ana;

    expect(addPlayer(salon, "Ana", "s2", "autre").night).toBe(0);
    delete salon.players.Ana;
    expect(addPlayer(salon, "Ana", "s3", ana.token).night).toBe(250);
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
