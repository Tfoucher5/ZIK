import { describe, it, expect } from "vitest";
import { sumWindow, computeDelta, pct, ago } from "../stats-utils.js";

const serie = (vals) => vals.map((n, i) => ({ day: `2026-07-${10 + i}`, n }));

describe("sumWindow", () => {
  it("somme les n derniers points", () => {
    expect(sumWindow(serie([1, 2, 3, 4]), 2)).toBe(7);
  });
  it("gère l'offset (fenêtre précédente)", () => {
    expect(sumWindow(serie([1, 2, 3, 4]), 2, 2)).toBe(3);
  });
  it("accepte le format Umami {x,y}", () => {
    expect(
      sumWindow(
        [
          { x: "a", y: 5 },
          { x: "b", y: 6 },
        ],
        2,
      ),
    ).toBe(11);
  });
  it("série plus courte que la fenêtre → somme ce qui existe", () => {
    expect(sumWindow(serie([3]), 7)).toBe(3);
  });
  it("offset plus grand que la série → 0", () => {
    expect(sumWindow(serie([1, 2, 3, 4]), 2, 5)).toBe(0);
    expect(sumWindow(serie([1, 2, 3, 4]), 2, 6)).toBe(0);
  });
});

describe("computeDelta", () => {
  it("hausse", () => {
    expect(computeDelta(120, 100)).toEqual({ pct: 20, dir: "up" });
  });
  it("baisse", () => {
    expect(computeDelta(80, 100)).toEqual({ pct: -20, dir: "down" });
  });
  it("stable", () => {
    expect(computeDelta(100, 100)).toEqual({ pct: 0, dir: "flat" });
  });
  it("précédent à zéro → pct null", () => {
    expect(computeDelta(5, 0)).toEqual({ pct: null, dir: "up" });
  });
});

describe("pct", () => {
  it("arrondit au dixième", () => {
    expect(pct(1, 3)).toBe(33.3);
  });
  it("vaut 0 sans dénominateur", () => {
    expect(pct(4, 0)).toBe(0);
  });
});

describe("ago", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  it("minutes, heures, jours", () => {
    expect(ago("2026-10-09T11:55:00Z", now)).toBe("il y a 5 min");
    expect(ago("2026-10-09T09:00:00Z", now)).toBe("il y a 3 h");
    expect(ago("2026-10-08T11:00:00Z", now)).toBe("hier");
    expect(ago("2026-10-05T12:00:00Z", now)).toBe("il y a 4 j");
  });
});
