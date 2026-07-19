import { describe, it, expect } from "vitest";
import { sumWindow, computeDelta, toPercent } from "../stats-utils.js";

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

describe("toPercent", () => {
  it("arrondit", () => {
    expect(toPercent(1, 3)).toBe(33);
  });
  it("total zéro → 0", () => {
    expect(toPercent(5, 0)).toBe(0);
  });
});
