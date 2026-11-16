import { describe, it, expect } from "vitest";
import { endView } from "../endView.js";

const top = [
  { username: "Léa", score: 1520 },
  { username: "Sam", score: 1480 },
  { username: "Tom", score: 1310 },
];
const solo = (me, count = 8) => ({
  finalRanking: { top, me, count },
  teams: null,
  myTeam: null,
});
const teams = [
  { id: 1, name: "Bleue", score: 1240 },
  { id: 0, name: "Rouge", score: 1105 },
  { id: 2, name: "Jaune", score: 1105 },
];

describe("téléphone en fin de partie", () => {
  it("1re place : « Tu gagnes ! », or, écart avec le 2e", () => {
    const v = endView(solo({ ...top[0], rank: 1 }));
    expect(v).toMatchObject({
      rank: 1,
      title: "Tu gagnes !",
      medal: "or",
      score: "1 520 pts",
      gap: "40 points devant Sam.",
    });
  });

  it("2e et 3e : écart avec celui juste devant", () => {
    expect(endView(solo({ ...top[1], rank: 2 }))).toMatchObject({
      title: "2e sur 8",
      medal: "ar",
      gap: "À 40 points de Léa.",
    });
    expect(endView(solo({ ...top[2], rank: 3 })).medal).toBe("br");
  });

  it("hors podium : pas de médaille, écart avec la 3e place", () => {
    const v = endView(solo({ username: "Inès", score: 1020, rank: 5 }));
    expect(v).toMatchObject({
      title: "5e sur 8",
      medal: null,
      gap: "Le podium était à 290 points.",
    });
  });

  it("égalité et point au singulier", () => {
    expect(endView(solo({ username: "Inès", score: 1310, rank: 4 })).gap).toBe(
      "À égalité avec Tom.",
    );
    expect(endView(solo({ username: "Inès", score: 1309, rank: 4 })).gap).toBe(
      "Le podium était à 1 point.",
    );
  });

  it("seul dans la partie : pas d'écart", () => {
    const me = { username: "Léa", score: 300, rank: 1 };
    const v = endView({ finalRanking: { top: [me], me, count: 1 } });
    expect(v.gap).toBeNull();
  });

  it("sans place (arrivé après la partie) : « Fin de partie », rien d'autre", () => {
    const v = endView({ finalRanking: { top, me: null, count: 3 } });
    expect(v).toMatchObject({
      rank: 0,
      title: "Fin de partie",
      medal: null,
      score: null,
      gap: null,
    });
  });

  it("en équipes : la place de l'équipe et l'écart avec l'équipe devant", () => {
    const v = endView({
      finalRanking: solo(null).finalRanking,
      teams,
      myTeam: 0,
    });
    expect(v).toMatchObject({
      team: true,
      rank: 2,
      title: "Ton équipe finit 2e",
      medal: "ar",
      score: "1 105 pts",
      gap: "À 135 points de Bleue.",
    });
    expect(endView({ teams, myTeam: 1 })).toMatchObject({
      title: "Ton équipe gagne !",
      gap: "135 points devant Rouge.",
    });
  });

  it("équipes mais aucune choisie : la place du joueur", () => {
    const v = endView({ ...solo({ ...top[1], rank: 2 }), teams, myTeam: 9 });
    expect(v).toMatchObject({ team: false, rank: 2 });
  });

  it("soirée de plusieurs parties : la place au cumul", () => {
    const night = {
      games: 3,
      teams: null,
      ranking: { me: { rank: 2 }, count: 8 },
    };
    expect(endView({ ...solo(null), night }).night).toEqual({
      games: 3,
      team: false,
      place: "2e place",
      count: 8,
    });
    expect(
      endView({ ...solo(null), night: { ...night, games: 1 } }).night,
    ).toBeNull();
    const nightTeams = { games: 2, teams, ranking: { me: null, count: 8 } };
    expect(
      endView({ teams, myTeam: 1, night: nightTeams }).night,
    ).toMatchObject({
      team: true,
      place: "1re place",
      count: null,
    });
  });
});
