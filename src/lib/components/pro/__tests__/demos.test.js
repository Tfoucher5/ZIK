import { describe, it, expect } from "vitest";
import {
  heroAt,
  playersAt,
  buzzerAt,
  specialsAt,
  nightAt,
  HERO_STILL,
  PLAYERS_CYCLE,
} from "../demos.js";

describe("démos de /pro", () => {
  it("hero : le chrono descend, les réponses arrivent, le classement se trie", () => {
    const start = heroAt(0);
    expect(start).toMatchObject({ timer: 30, typed: "", artist: false });
    expect(start.rows.find((r) => r.n === "Léa").y).toBe(0);

    const end = heroAt(HERO_STILL);
    expect(end).toMatchObject({ timer: 12, artist: true, title: true });
    expect(end.found).toEqual(["Karim", "Léa", "Zoé"]);
    const lea = end.rows.find((r) => r.n === "Léa");
    expect(lea).toMatchObject({ s: 26, y: 0 });
    // Karim (19 + 3) passe devant Zoé (17 + 2)
    expect(end.rows.find((r) => r.n === "Karim").y).toBe(1);
    expect(new Set(end.rows.map((r) => r.y)).size).toBe(end.rows.length);
  });

  it("hero : le « +N » ne reste affiché qu'un moment", () => {
    const at = (step) => heroAt(step * 0.52 + 0.01).rows;
    expect(at(3).find((r) => r.n === "Karim").plus).toBe("+3");
    expect(at(8).find((r) => r.n === "Karim").plus).toBe("");
  });

  it("joueurs : passe la limite gratuite et garde 8 lignes", () => {
    expect(playersAt(0).count).toBe(0);
    const full = playersAt(PLAYERS_CYCLE - 1);
    expect(full).toMatchObject({ count: 40, over: true });
    expect(full.rows).toHaveLength(8);
    expect(full.rows[0]).toMatchObject({ rk: "40", y: 0 });
    expect(playersAt(1).over).toBe(false);
  });

  it("buzzer : appui, à toi, puis validation de la régie", () => {
    expect(buzzerAt(0)).toEqual({ press: false, lay: 0, regie: false });
    expect(buzzerAt(1.7).press).toBe(true);
    expect(buzzerAt(2.5)).toMatchObject({ lay: 1, regie: false });
    expect(buzzerAt(3.5)).toMatchObject({ lay: 1, regie: true });
    expect(buzzerAt(5)).toMatchObject({ lay: 2, regie: true });
  });

  it("manches spéciales : compte à rebours de 4 puis carte suivante", () => {
    expect(specialsAt(0)).toEqual({ i: 0, n: 4 });
    expect(specialsAt(2.2)).toEqual({ i: 0, n: 1 });
    expect(specialsAt(2.9)).toEqual({ i: 1, n: 4 });
  });

  it("soirée : trois parties, puis podium du 3e au 1er", () => {
    expect(nightAt(0)).toMatchObject({ game: -1, podium: false });
    expect(nightAt(3.4)).toMatchObject({ game: 2, podium: false });
    expect(nightAt(6.1)).toMatchObject({ podium: true, places: 1 });
    expect(nightAt(9).places).toBe(3);
  });
});
