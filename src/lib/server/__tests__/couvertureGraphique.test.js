// Teste scripts/ : vitest ne cherche les tests que sous src/**/__tests__
import { describe, it, expect } from "vitest";
import {
  graphique,
  teinteSeuil,
  teinteZone,
} from "../../../../scripts/couverture-graphique.mjs";
import { historique } from "../../../../scripts/couverture.mjs";

const SEUILS = { statements: 43, branches: 35, functions: 40, lines: 45 };
const total = (l, s = l, f = l, b = l) => ({
  lines: { pct: l },
  statements: { pct: s },
  functions: { pct: f },
  branches: { pct: b },
});
const zones = [
  { nom: "services/cards", pct: 5.8, covered: 33, total: 568 },
  { nom: "socket/salon", pct: 91.4, covered: 1121, total: 1227 },
];

describe("tableau de bord de la couverture", () => {
  it("couleurs : rouge sous le seuil, puis paliers 50 et 70 %", () => {
    expect(teinteSeuil(40, 45)).toBe("#e5534b");
    expect(teinteSeuil(52, 35)).toBe("#d29922");
    expect(teinteSeuil(75, 45)).toBe("#2ea043");
    expect([teinteZone(5.8), teinteZone(56.6), teinteZone(91.4)]).toEqual([
      "#e5534b",
      "#d29922",
      "#2ea043",
    ]);
  });

  it("jauges, zones colorées, légende et écart avec develop", () => {
    const svg = graphique({
      resume: { total: total(64.7, 62.1, 54.5, 52.6) },
      zones,
      base: { total: total(60) },
      seuils: SEUILS,
      legende: "PR #12 · <abc>",
    });
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain(">64,7<");
    expect(svg).toContain("services/cards");
    expect(svg).toContain('fill="#e5534b"');
    expect(svg).toContain("▲ +4,7 pt vs develop");
    expect(svg).toContain("PR #12 · &lt;abc&gt;");
    expect(svg).toContain("prefers-color-scheme: dark");
  });

  it("sans historique : message à la place de la courbe", () => {
    const svg = graphique({
      resume: { total: total(50) },
      zones: [],
      seuils: SEUILS,
    });
    expect(svg).toContain("La courbe apparaîtra");
    expect(svg).not.toContain('stroke="#a371f7"');
  });

  it("avec historique : courbe et ligne du seuil", () => {
    const svg = graphique({
      resume: { total: total(50) },
      zones,
      seuils: SEUILS,
      historique: [
        { date: "2 nov.", lines: 48 },
        { date: "9 nov.", lines: 64.7 },
      ],
    });
    expect(svg).toContain('stroke="#a371f7"');
    expect(svg).toContain("seuil 45 %");
    expect(svg).toContain("9 nov.");
  });

  it("historique : un point par fusion, date française, 200 au plus", () => {
    const liste = Array.from({ length: 200 }, () => ({ lines: 1 }));
    const h = historique(
      liste,
      total(64.7),
      "910a749abc",
      new Date("2026-11-09T23:30:00Z"),
    );
    expect(h).toHaveLength(200);
    expect(h.at(-1)).toMatchObject({
      date: "10 nov.",
      sha: "910a749",
      lines: 64.7,
    });
    expect(historique(null, total(1), "x")).toHaveLength(1);
  });
});
