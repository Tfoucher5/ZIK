import { describe, it, expect } from "vitest";
import { storyData } from "../podiumStory.js";

const finalRanking = {
  top: [
    { rank: 1, username: "Alice", score: 120 },
    { rank: 2, username: "Bob", score: 90 },
    { rank: 3, username: "Chloé", score: 40 },
  ],
  me: { rank: 5, username: "Dan", score: 10 },
  count: 8,
};

describe("story du podium", () => {
  it("en solo : les trois premiers et ma place, sans genre", () => {
    const d = storyData({ finalRanking, username: "Dan" });
    expect(d.podium.map((p) => p.name)).toEqual(["Alice", "Bob", "Chloé"]);
    expect(d.mine).toBe("Dan, à la 5e place sur 8");
  });

  it("à la 1re place", () => {
    const d = storyData({
      finalRanking: { ...finalRanking, me: { rank: 1 } },
      username: "Alice",
    });
    expect(d.mine).toBe("Alice, à la 1re place sur 8");
  });

  it("en équipes : le podium des équipes avec leur couleur", () => {
    const teams = [
      { id: 2, name: "Les Bleus", score: 80 },
      { id: 0, name: "Les Roses", score: 60 },
    ];
    const d = storyData({ finalRanking, teams, myTeam: 0 });
    expect(d.podium.map((p) => p.name)).toEqual(["Les Bleus", "Les Roses"]);
    expect(d.podium[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(d.mine).toBe("Mon équipe, à la 2e place");
    // Pas d'équipe choisie : la place du joueur
    expect(storyData({ finalRanking, teams, username: "Dan" }).mine).toBe(
      "Dan, à la 5e place sur 8",
    );
  });

  it("sans classement reçu : rien à dessiner, rien ne casse", () => {
    expect(storyData({ finalRanking: null, username: "X" })).toEqual({
      podium: [],
      mine: null,
    });
  });
});

describe("couleurs d'équipe de la story", () => {
  it("les mêmes que celles de la TV (--q0 à --q15)", async () => {
    const { readFileSync } = await import("node:fs");
    const { teamHex } = await import("../../../../data/salonOptions.js");
    const css = readFileSync("static/css/salon/shared.css", "utf8");
    for (let i = 0; i < 16; i++) {
      const m = css.match(new RegExp(`--q${i}: *(#[0-9a-f]{6})`, "i"));
      expect(teamHex(i).toLowerCase(), `--q${i}`).toBe(m[1].toLowerCase());
    }
  });
});
