import { describe, it, expect } from "vitest";
import {
  awards,
  endResult,
  gameOverShown,
  gameOverView,
  isReplay,
  qrBigShown,
  tvAlone,
} from "../host/gameOverView.js";

const j = (username, score, found = 0, first = 0, extra = {}) => ({
  username,
  score,
  found,
  first,
  ...extra,
});
const solo = (n) =>
  Array.from({ length: n }, (_, i) => j(`J${i + 1}`, 1000 - i * 10));

describe("étiquettes de fin de partie", () => {
  it("une par nom, le plus régulier avant le plus rapide", () => {
    const scores = [
      j("Léa", 1520, 8, 2),
      j("Sam", 1480, 9, 2),
      j("Tom", 1310, 8, 4),
    ];
    expect(awards(scores)).toEqual({
      Sam: "Le plus régulier",
      Tom: "Le plus rapide",
    });
  });

  it("un prix déjà pris par un nom mieux étiqueté ne passe pas au suivant", () => {
    const scores = [j("Léa", 1500, 9, 5), j("Sam", 1400, 8, 4)];
    expect(awards(scores)).toEqual({ Léa: "Le plus régulier" });
  });

  it("meilleur joueur en équipes seulement, en priorité", () => {
    const scores = [j("Sam", 1480, 9, 4), j("Tom", 1380, 8, 1)];
    expect(awards(scores, true)).toEqual({ Sam: "Meilleur joueur" });
    expect(awards(scores, false)).toEqual({ Sam: "Le plus régulier" });
  });

  it("aucun prix à zéro", () => {
    expect(awards([j("Léa", 0), j("Sam", 0)], true)).toEqual({});
  });
});

describe("TV de fin de partie", () => {
  it("chacun pour soi, 3 joueurs : le podium seul, liste vide", () => {
    const v = gameOverView({ scores: solo(3) });
    expect(v.teams).toBe(false);
    expect(v.podium.map((p) => [p.rank, p.name])).toEqual([
      [1, "J1"],
      [2, "J2"],
      [3, "J3"],
    ]);
    expect(v.podium[0].color).toBeNull();
    expect(v.list.rows).toEqual([]);
  });

  it("8 joueurs : la liste commence à la 4e place", () => {
    const v = gameOverView({ scores: solo(8) });
    expect(v.list.title).toBe("Classement");
    expect(v.list.count).toBe(8);
    expect(v.list.rows.map((r) => r.rank)).toEqual([4, 5, 6, 7, 8]);
    expect(v.list.more).toBe(0);
  });

  it("20 joueurs : liste plafonnée avec « et N autres »", () => {
    const v = gameOverView({ scores: solo(20) }, [], 7);
    expect(v.list.rows).toHaveLength(7);
    expect(v.list.more).toBe(10);
    expect(gameOverView({ scores: solo(20) }, [], 4).list.more).toBe(13);
  });

  it("moins de 3 joueurs : pas de place vide", () => {
    expect(gameOverView({ scores: solo(2) }).podium).toHaveLength(2);
    expect(gameOverView({ scores: [] }).podium).toEqual([]);
    expect(gameOverView(null).podium).toEqual([]);
  });

  it("en équipes : podium des équipes en couleur, joueurs avec bande", () => {
    const over = {
      scores: [
        j("Sam", 1480, 2, 1, { team: 1 }),
        j("Tom", 1380, 8, 4, { team: 0 }),
      ],
      teams: [
        { id: 1, name: "Bleue", score: 1480, members: ["Sam"] },
        { id: 0, name: "Rouge", score: 1380, members: ["Tom"] },
      ],
    };
    const v = gameOverView(over);
    expect(v.teams).toBe(true);
    expect(v.podium[0]).toMatchObject({
      name: "Bleue",
      avg: true,
      color: "var(--q1)",
    });
    expect(v.list.title).toBe("Les joueurs");
    expect(v.list.rows[0]).toMatchObject({
      rank: 1,
      name: "Sam",
      tag: "Meilleur joueur",
      color: "var(--q1)",
    });
    expect(v.list.rows[1].tag).toBe("Le plus régulier");
  });

  it("joueur parti : gardé et marqué", () => {
    const scores = [...solo(3), j("Zoé", 10, 0, 0, { left: true })];
    expect(gameOverView({ scores }).list.rows[0]).toMatchObject({
      name: "Zoé",
      tag: "Parti",
    });
  });

  it("ZIK Pro : la soirée remplace la partie dès la 2e partie", () => {
    const night = { games: 2, players: [j("Sam", 4210), j("Léa", 3980)] };
    const v = gameOverView({ scores: solo(5), night });
    expect(v.list.title).toBe("Soirée · 2 parties");
    expect(v.list.count).toBeNull();
    expect(v.list.rows.map((r) => [r.rank, r.name])).toEqual([
      [1, "Sam"],
      [2, "Léa"],
    ]);
    expect(
      gameOverView({ scores: solo(5), night: { ...night, games: 1 } }).list
        .title,
    ).toBe("Classement");
  });

  it("« Une autre ! » compté sur les joueurs encore là", () => {
    const players = [
      { username: "A", encore: true },
      { username: "B" },
      { username: "C", encore: true, left: true },
    ];
    expect(gameOverView({ scores: [] }, players).encore).toEqual({
      n: 1,
      of: 2,
    });
  });
});

describe("priorité des écrans de fin", () => {
  const fin = { phase: "gameover", gameOver: { scores: [] } };
  it("fin de partie seule", () => {
    expect(gameOverShown(fin)).toBe(true);
    // TV rechargée en fin de partie : pas de résultat reçu, la fin reste affichée
    expect(gameOverShown({ ...fin, gameOver: null })).toBe(true);
    // Relance demandée : la phase reste gameover pendant le décompte
    expect(gameOverShown({ ...fin, relaunching: true })).toBe(false);
    expect(gameOverShown({ ...fin, phase: "round" })).toBe(false);
  });
  it("l'entracte, le QR et les pannes passent devant", () => {
    for (const k of [
      "intermission",
      "qrBig",
      "restarting",
      "connLost",
      "restored",
    ])
      expect(gameOverShown({ ...fin, [k]: {} }), k).toBe(false);
  });
  it("le podium de soirée passe devant le QR", () => {
    expect(qrBigShown({ qrBig: true })).toBe(true);
    expect(qrBigShown({ qrBig: true, finale: {} })).toBe(false);
    expect(qrBigShown({ qrBig: true, connLost: true })).toBe(false);
    expect(gameOverShown({ ...fin, qrBig: true, finale: {} })).toBe(true);
  });
});

describe("TV rechargée en fin de partie", () => {
  it("refait le résultat avec la liste des joueurs, sans prix", () => {
    const h = {
      gameOver: null,
      players: [
        { username: "Sam", score: 900 },
        { username: "Léa", score: 1500 },
        { username: "Tom", score: 400, left: true },
        { username: "Noé", score: 300 },
      ],
      teams: null,
      night: null,
    };
    const v = gameOverView(endResult(h), h.players);
    expect(v.podium.map((p) => p.name)).toEqual(["Léa", "Sam", "Tom"]);
    expect(v.podium[2].tag).toBe("Parti");
    expect(v.list.rows.map((r) => r.name)).toEqual(["Noé"]);
    expect(v.encore.of).toBe(3);
  });

  it("garde les équipes et la soirée", () => {
    const teams = [{ id: 1, name: "Bleue", score: 900, members: ["Sam"] }];
    const night = { games: 2, players: [{ username: "Sam", score: 2000 }] };
    const r = endResult({ gameOver: null, players: [], teams, night });
    expect(r.teams).toBe(teams);
    expect(r.night).toBe(night);
  });

  it("le résultat reçu passe avant", () => {
    const gameOver = { scores: [] };
    expect(endResult({ gameOver, players: [{ username: "A" }] })).toBe(
      gameOver,
    );
  });
});

describe("TV seule et relance", () => {
  it("commandes sur la TV tant qu'aucune régie n'est connectée", () => {
    expect(tvAlone({ controls: null })).toBe(true);
    expect(tvAlone({ controls: 0 })).toBe(true);
    expect(tvAlone({ controls: 1 })).toBe(false);
    expect(tvAlone({ controls: 2 })).toBe(false);
  });

  it("un décompte après une partie, c'est « On remet ça. »", () => {
    expect(isReplay("gameover")).toBe(true);
    expect(isReplay("summary")).toBe(true);
    expect(isReplay("starting")).toBe(false);
    expect(isReplay("lobby")).toBe(false);
  });
});
