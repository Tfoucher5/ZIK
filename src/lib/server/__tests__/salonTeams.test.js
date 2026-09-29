import { describe, it, expect } from "vitest";
import {
  makeTeams,
  smallestTeam,
  spreadPlayers,
  teamStandings,
  cleanTeamName,
} from "../socket/salonTeams.js";

const p = (username, team, score = 0) => ({ username, team, score });

describe("makeTeams", () => {
  it("pas d'équipes en dessous de deux", () => {
    expect(makeTeams(0)).toBeNull();
    expect(makeTeams(1)).toBeNull();
  });

  it("plafonne à huit équipes", () => {
    expect(makeTeams(12)).toHaveLength(8);
  });
});

describe("smallestTeam", () => {
  it("envoie le nouvel arrivant dans l'équipe la moins remplie", () => {
    const teams = makeTeams(3);
    expect(smallestTeam(teams, [p("a", 0), p("b", 0), p("c", 1)])).toBe(2);
  });
});

describe("spreadPlayers", () => {
  it("répartit à tour de rôle", () => {
    const players = [p("a"), p("b"), p("c"), p("d")];
    spreadPlayers(makeTeams(2), players);
    expect(players.map((x) => x.team)).toEqual([0, 1, 0, 1]);
  });

  it("retire les équipes quand il n'y en a plus", () => {
    const players = [p("a", 1)];
    spreadPlayers(null, players);
    expect(players[0].team).toBeNull();
  });
});

describe("teamStandings", () => {
  it("classe à la moyenne, pas au total", () => {
    const teams = makeTeams(2);
    const players = [
      p("a", 0, 10),
      p("b", 0, 10),
      p("c", 0, 10),
      p("d", 1, 25),
    ];
    const [first, second] = teamStandings(teams, players);
    expect(first.id).toBe(1);
    expect(first.score).toBe(25);
    expect(second.total).toBe(30);
  });

  it("une équipe vide vaut zéro", () => {
    const [, empty] = teamStandings(makeTeams(2), [p("a", 0, 5)]);
    expect(empty.score).toBe(0);
    expect(empty.members).toEqual([]);
  });
});

describe("cleanTeamName", () => {
  it("coupe les noms trop longs", () => {
    expect(cleanTeamName("  " + "x".repeat(40))).toHaveLength(24);
  });
});
