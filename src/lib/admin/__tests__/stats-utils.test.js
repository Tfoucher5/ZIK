import { describe, it, expect } from "vitest";
import {
  sumWindow,
  computeDelta,
  toPercent,
  isSignificant,
  cohortCell,
  leverRow,
  stickiness,
} from "../stats-utils.js";

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

describe("toPercent", () => {
  it("arrondit", () => {
    expect(toPercent(1, 3)).toBe(33);
  });
  it("total zéro → 0", () => {
    expect(toPercent(5, 0)).toBe(0);
  });
});

describe("isSignificant", () => {
  it("au moins 20 personnes → significatif", () => {
    expect(isSignificant(20)).toBe(true);
  });
  it("en dessous de 20 → non significatif", () => {
    expect(isSignificant(19)).toBe(false);
    expect(isSignificant(0)).toBe(false);
  });
});

describe("cohortCell", () => {
  it("calcule le pourcentage et garde les effectifs", () => {
    expect(cohortCell(9, 30)).toEqual({
      pct: 30,
      retained: 9,
      total: 30,
      significant: true,
    });
  });
  it("marque non significatif sous le seuil", () => {
    expect(cohortCell(2, 4).significant).toBe(false);
  });
  it("cohorte vide → null (case à laisser vide)", () => {
    expect(cohortCell(0, 0)).toBeNull();
  });
});

describe("leverRow", () => {
  const row = {
    lever: "zikle",
    with_n: 50,
    with_retained: 20,
    without_n: 100,
    without_retained: 10,
  };
  it("compare les deux groupes et donne l'écart en points", () => {
    expect(leverRow(row)).toEqual({
      lever: "zikle",
      withPct: 40,
      withoutPct: 10,
      deltaPts: 30,
      withN: 50,
      withoutN: 100,
      significant: true,
    });
  });
  it("écart négatif quand le levier retient moins", () => {
    expect(leverRow({ ...row, with_retained: 2 }).deltaPts).toBe(-6);
  });
  it("non significatif si un seul des deux groupes est trop petit", () => {
    expect(leverRow({ ...row, with_n: 4, with_retained: 1 }).significant).toBe(
      false,
    );
  });
  it("groupe vide → 0 % sans division par zéro", () => {
    const r = leverRow({ ...row, with_n: 0, with_retained: 0 });
    expect(r.withPct).toBe(0);
    expect(r.significant).toBe(false);
  });
});

describe("stickiness", () => {
  it("ratio DAU/MAU en pourcentage", () => {
    expect(stickiness(12, 60)).toBe(20);
  });
  it("MAU à zéro → 0", () => {
    expect(stickiness(0, 0)).toBe(0);
  });
});
