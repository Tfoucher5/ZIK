import { describe, it, expect } from "vitest";
import {
  makeTeams,
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

  it("garde les noms déjà personnalisés quand le nombre change", () => {
    const avant = makeTeams(2);
    avant[0].name = "Les Bretons";
    avant[1].name = "Table du fond";
    const apres = makeTeams(4, avant);
    expect(apres[0].name).toBe("Les Bretons");
    expect(apres[1].name).toBe("Table du fond");
  });

  it("donne un nom par défaut aux équipes ajoutées", () => {
    const avant = makeTeams(2);
    avant[0].name = "Les Bretons";
    const apres = makeTeams(4, avant);
    expect(apres[2].name).toBe("Jaune");
    expect(apres[3].name).toBe("Verte");
  });

  it("oublie les noms des équipes retirées", () => {
    const avant = makeTeams(4);
    avant[3].name = "Supprimée";
    const apres = makeTeams(2, avant);
    expect(apres).toHaveLength(2);
    expect(apres.some((t) => t.name === "Supprimée")).toBe(false);
  });

  it("repart des noms par défaut sans équipes existantes", () => {
    expect(makeTeams(2)[0].name).toBe("Rouge");
    expect(makeTeams(2, null)[0].name).toBe("Rouge");
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
