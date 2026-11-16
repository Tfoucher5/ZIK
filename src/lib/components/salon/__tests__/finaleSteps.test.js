import { describe, it, expect } from "vitest";
import {
  DRUMROLL_MS,
  FINALE_END,
  FINALE_START,
  finaleSteps,
} from "../host/finaleSteps.js";
import { finaleView } from "../host/gameOverView.js";
import { FINALE_WINNER_MS } from "../../../data/salonOptions.js";

// État affiché à un instant donné de la séquence
const at = (steps, ms) =>
  steps
    .filter((s) => s.at <= ms)
    .reduce((v, s) => ({ ...v, ...s.set }), { ...FINALE_START });

describe("podium de la soirée sur la TV", () => {
  it("le 3e, le 2e, le tambour, le vainqueur, le repli, puis la suite", () => {
    const s = finaleSteps({ count: 8 });
    expect(s.map((x) => x.at)).toEqual(
      [...s.map((x) => x.at)].sort((a, b) => a - b),
    );
    expect(at(s, 1500).step).toBe(1);
    expect(at(s, 3600).step).toBe(2);
    expect(at(s, 5700).drum).toBe(true);
    expect(at(s, FINALE_WINNER_MS).flood).toBe("in");
    expect(at(s, FINALE_WINNER_MS - 1).flood).toBeNull();
    const fin = at(s, 60000);
    expect(fin).toEqual(FINALE_END);
  });

  it("le vainqueur tombe au même instant que la place sur le téléphone", () => {
    const vainqueur = finaleSteps().find((s) => s.set.flood === "in");
    expect(vainqueur.at).toBe(FINALE_WINNER_MS);
  });

  it("confettis une seule fois, sur le vainqueur", () => {
    const c = finaleSteps().filter((s) => s.confetti);
    expect(c).toHaveLength(1);
    expect(c[0].at).toBe(FINALE_WINNER_MS);
  });

  it("places absentes sautées, le vainqueur reste à l'heure", () => {
    const deux = finaleSteps({ count: 2 });
    expect(deux.some((s) => s.set.step === 1)).toBe(false);
    expect(at(deux, 3600).step).toBe(2);
    const un = finaleSteps({ count: 1 });
    expect(un.some((s) => s.set.step === 1 || s.set.step === 2)).toBe(false);
    expect(un.find((s) => s.set.flood === "in").at).toBe(FINALE_WINNER_MS);
  });

  it("sans son : même séquence à l'écran, pas de tambour joué", () => {
    const muet = finaleSteps({ sound: false });
    const ecran = (s) => s.filter((x) => !x.drumroll);
    expect(muet.some((s) => s.drumroll)).toBe(false);
    expect(muet).toEqual(ecran(finaleSteps()));
  });

  it("le roulement de tambour (4 s) se termine sur le vainqueur", () => {
    const tambour = finaleSteps().filter((s) => s.drumroll);
    expect(tambour).toHaveLength(1);
    expect(tambour[0].at + DRUMROLL_MS).toBe(FINALE_WINNER_MS);
    expect(DRUMROLL_MS).toBeGreaterThanOrEqual(3980);
  });

  it("mouvements réduits : tout d'un coup, sans aplat ni confettis", () => {
    const s = finaleSteps({ count: 8, reduced: true });
    expect(s).toEqual([{ at: 0, set: FINALE_END }]);
    expect(s.some((x) => x.confetti || x.drumroll)).toBe(false);
  });

  it("classement vide : ni tambour ni confettis", () => {
    const s = finaleSteps({ count: 0 });
    expect(s.some((x) => x.confetti || x.drumroll || x.set.flood)).toBe(false);
  });
});

describe("classement du podium de la soirée", () => {
  it("chacun pour soi : médailles sur le podium, couleur d'équipe pour la suite", () => {
    const players = ["Léa", "Sam", "Tom", "Jade"].map((u, i) => ({
      username: u,
      score: 4000 - i * 100,
      team: i === 3 ? 2 : null,
    }));
    const f = finaleView({ games: 3, players, teams: null });
    expect(f.podium.map((e) => [e.rank, e.name, e.color])).toEqual([
      [1, "Léa", null],
      [2, "Sam", null],
      [3, "Tom", null],
    ]);
    expect(f.rest).toEqual([
      expect.objectContaining({ rank: 4, name: "Jade", color: "var(--q2)" }),
    ]);
  });

  it("en équipes : couleur d'équipe et moyenne", () => {
    const teams = [
      { id: 1, name: "Bleue", score: 1400, members: [] },
      { id: 0, name: "Rouge", score: 1300, members: [] },
    ];
    const f = finaleView({ games: 2, players: [], teams });
    expect(f.podium[0]).toMatchObject({
      rank: 1,
      name: "Bleue",
      color: "var(--q1)",
      avg: true,
    });
    expect(f.rest).toEqual([]);
  });

  it("un joueur parti reste classé et marqué, podium compris", () => {
    const players = [{ username: "Zoé", score: 900, left: true }];
    expect(finaleView({ games: 2, players }).podium[0].tag).toBe("Parti");
  });

  it("classement absent : rien à montrer", () => {
    expect(finaleView(null)).toEqual({ podium: [], rest: [] });
  });
});
