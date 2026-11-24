import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { storyData, storySteps, MEDAL, ACCENT } from "../podiumStory.js";
import { teamHex } from "../../../../data/salonOptions.js";

const now = new Date(2026, 10, 12, 23, 30);
const finalRanking = {
  top: [
    { rank: 1, username: "Léa", score: 1520 },
    { rank: 2, username: "Bob", score: 900 },
    { rank: 3, username: "Chloé", score: 400 },
  ],
  me: { rank: 5, username: "Inès", score: 1020, found: 7 },
  count: 8,
};

describe("story : ma colonne", () => {
  it("en solo hors podium : magenta, ma place, mes titres trouvés, la date", () => {
    const d = storyData({ finalRanking, username: "Inès", round: 10, now });
    expect(d).toEqual({
      rank: 5,
      count: 8,
      unit: "place sur 8",
      name: "Inès",
      score: "1 020",
      average: false,
      found: "7 titres trouvés sur 10",
      team: null,
      color: ACCENT,
      date: "12 novembre 2026",
      title: null,
      line: "Inès, à la 5e place sur 8",
    });
  });

  it("nom de la soirée : gardé avec la date, absent s'il est vide", () => {
    const avec = {
      finalRanking,
      username: "Inès",
      now,
      title: "Quiz du jeudi",
    };
    expect(storyData(avec)).toMatchObject({
      title: "Quiz du jeudi",
      date: "12 novembre 2026",
    });
    expect(storyData({ ...avec, title: "" }).title).toBeNull();
    const teams = [{ id: 0, name: "Rouge", score: 10 }];
    expect(storyData({ ...avec, teams, myTeam: 0 }).title).toBe(
      "Quiz du jeudi",
    );
  });

  it("à la 1re place : en or, un seul titre au singulier", () => {
    const d = storyData({
      finalRanking: { ...finalRanking, me: { rank: 1, score: 1520, found: 1 } },
      username: "Léa",
      round: 10,
      now,
    });
    expect(d.color).toBe(MEDAL[0]);
    expect(d.line).toBe("Léa, à la 1re place sur 8");
    expect(d.found).toBe("1 titre trouvé sur 10");
  });

  it("sans titres trouvés reçus : pas de ligne inventée", () => {
    const d = storyData({
      finalRanking: { ...finalRanking, me: { rank: 3, score: 10 } },
      username: "X",
      round: 10,
      now,
    });
    expect(d.found).toBeNull();
    expect(d.color).toBe(MEDAL[2]);
  });

  it("en équipes : la place de mon équipe, sa moyenne, sa couleur, aucun pseudo", () => {
    const teams = [
      { id: 2, name: "Bleu", score: 1300 },
      { id: 0, name: "Rouge", score: 1105 },
      { id: 1, name: "Vert", score: 800 },
    ];
    const d = storyData({
      finalRanking,
      teams,
      myTeam: 0,
      username: "Inès",
      now,
    });
    expect(d).toMatchObject({
      rank: 2,
      count: 3,
      unit: "place sur 3 équipes",
      name: "Rouge",
      score: "1 105",
      average: true,
      found: null,
      team: teamHex(0),
      color: MEDAL[1],
      line: "Mon équipe, à la 2e place",
    });
    expect(JSON.stringify(d)).not.toMatch(/Léa|Bob|Chloé|Inès/);
    // Une seule équipe : singulier
    const seule = storyData({ teams: teams.slice(1, 2), myTeam: 0, now });
    expect(seule.unit).toBe("place sur 1 équipe");
    // Pas d'équipe choisie : la place du joueur
    const solo = storyData({ finalRanking, teams, username: "Inès", now });
    expect(solo.line).toBe("Inès, à la 5e place sur 8");
  });

  it("sans classement reçu : pas de story", () => {
    expect(storyData({ finalRanking: null, username: "X" })).toBeNull();
  });
});

describe("story : les marches", () => {
  it("une marche par place jusqu'à 8", () => {
    expect(storySteps(1, 8)).toEqual({ n: 8, at: 0 });
    expect(storySteps(2, 3)).toEqual({ n: 3, at: 1 });
    expect(storySteps(5, 8)).toEqual({ n: 8, at: 4 });
  });

  it("au-delà de 8 : une fenêtre de 8 autour du joueur", () => {
    expect(storySteps(1, 40)).toEqual({ n: 8, at: 0 });
    expect(storySteps(20, 40)).toEqual({ n: 8, at: 3 });
    expect(storySteps(40, 40)).toEqual({ n: 8, at: 7 });
  });
});

describe("couleurs de la story", () => {
  it("médailles et magenta de base/v2.css", () => {
    const css = readFileSync("static/css/base/v2.css", "utf8");
    const v = (name) =>
      css.match(new RegExp(`--${name}: *(#[0-9a-f]{6})`, "i"))[1];
    expect(MEDAL).toEqual([v("gold"), v("silver"), v("bronze")]);
    expect(ACCENT).toBe(v("accent"));
  });

  it("équipes : les mêmes que celles de la TV (--q0 à --q15)", () => {
    const css = readFileSync("static/css/salon/shared.css", "utf8");
    for (let i = 0; i < 16; i++) {
      const m = css.match(new RegExp(`--q${i}: *(#[0-9a-f]{6})`, "i"));
      expect(teamHex(i).toLowerCase(), `--q${i}`).toBe(m[1].toLowerCase());
    }
  });
});
