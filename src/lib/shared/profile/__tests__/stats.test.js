import { describe, it, expect } from "vitest";
import {
  fmtScore,
  fmtDate,
  pct,
  xpForLevel,
  xpForNextLevel,
  xpPercent,
  eloRatio,
  buildCurve,
  buildItinerary,
  rangOrdinal,
  rangDetail,
} from "../stats.js";

describe("fmtScore", () => {
  it("laisse les petits scores tels quels", () => {
    expect(fmtScore(0)).toBe("0");
    expect(fmtScore(999)).toBe("999");
  });

  it("abrège à partir du millier, sans décimale inutile", () => {
    expect(fmtScore(1000)).toBe("1k");
    expect(fmtScore(1480)).toBe("1.5k");
    expect(fmtScore(61000)).toBe("61k");
  });

  it("rend un tiret quand la valeur est absente", () => {
    expect(fmtScore(null)).toBe("—");
    expect(fmtScore(undefined)).toBe("—");
  });
});

describe("fmtDate", () => {
  const maintenant = new Date("2026-10-03T18:00:00Z");

  it("distingue aujourd'hui, hier et au-delà", () => {
    expect(fmtDate("2026-10-03T15:21:00Z", maintenant)).toMatch(/^Auj\./);
    expect(fmtDate("2026-10-02T15:21:00Z", maintenant)).toBe("Hier");
    expect(fmtDate("2026-10-01T15:21:00Z", maintenant)).toMatch(/oct/);
  });

  it("rend une chaîne vide sans date", () => {
    expect(fmtDate(null)).toBe("");
  });
});

describe("pct", () => {
  it("arrondit le pourcentage", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(18, 71)).toBe(25);
  });

  it("évite la division par zéro", () => {
    expect(pct(5, 0)).toBe(0);
  });
});

describe("niveau et XP", () => {
  it("suit les formules du serveur", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForNextLevel(1)).toBe(50);
    expect(xpForLevel(12)).toBe(xpForNextLevel(11));
  });

  it("borne la progression entre 0 et 100", () => {
    expect(xpPercent(0, 1)).toBe(0);
    expect(xpPercent(50, 1)).toBe(100);
    expect(xpPercent(10_000_000, 12)).toBe(100);
    expect(xpPercent(0, 12)).toBe(0);
  });

  it("place une XP intermédiaire au milieu", () => {
    const bas = xpForLevel(5);
    const haut = xpForNextLevel(5);
    expect(xpPercent(bas + (haut - bas) / 2, 5)).toBe(50);
  });
});

describe("eloRatio", () => {
  it("borne la plage 800-2200", () => {
    expect(eloRatio(800)).toBe(0);
    expect(eloRatio(2200)).toBe(1);
    expect(eloRatio(400)).toBe(0);
    expect(eloRatio(9000)).toBe(1);
    expect(eloRatio(1500)).toBeCloseTo(0.5, 2);
  });
});

describe("buildCurve", () => {
  it("rend une courbe vide sans partie", () => {
    expect(buildCurve([]).line).toBe("");
    expect(buildCurve(null).min).toBe(0);
  });

  it("expose min et max, qui servent de repères", () => {
    const c = buildCurve([{ score: 300 }, { score: 100 }, { score: 200 }]);
    expect(c.min).toBe(100);
    expect(c.max).toBe(300);
  });

  it("prend le dernier point dans l'ordre chronologique", () => {
    // L'API renvoie du plus récent au plus ancien : la courbe inverse.
    const c = buildCurve([{ score: 300 }, { score: 100 }]);
    expect(c.lastScore).toBe(300);
  });

  it("centre un point unique", () => {
    const c = buildCurve([{ score: 500 }]);
    expect(c.last[0]).toBe(320);
  });

  it("ne divise pas par zéro quand tous les scores sont égaux", () => {
    const c = buildCurve([{ score: 100 }, { score: 100 }]);
    expect(c.line).not.toContain("NaN");
  });
});

describe("buildItinerary", () => {
  const rooms = { a: { code: "a" }, b: { code: "b" }, c: { code: "c" } };

  it("trie par score décroissant", () => {
    const it = buildItinerary({ a: 100, b: 300, c: 200 }, rooms);
    expect(it.map((e) => e.score)).toEqual([300, 200, 100]);
  });

  it("écarte les rooms inconnues", () => {
    const it = buildItinerary({ a: 100, zzz: 999 }, rooms);
    expect(it).toHaveLength(1);
  });

  it("se limite à cinq entrées", () => {
    const many = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`r${i}`, i * 10]),
    );
    const info = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`r${i}`, { code: `r${i}` }]),
    );
    expect(buildItinerary(many, info)).toHaveLength(5);
  });
});

describe("rang", () => {
  it("écrit 1er puis Ne", () => {
    expect(rangOrdinal(1)).toBe("1er");
    expect(rangOrdinal(42)).toBe("42e");
    expect(rangOrdinal(null)).toBeNull();
  });

  it("compose le détail avec le dénominateur et le top", () => {
    expect(rangDetail(42, 751, 8)).toBe("sur 751 · top 8 %");
  });

  it("se contente de ce qui est connu", () => {
    expect(rangDetail(42, null, 8)).toBe("top 8 %");
    expect(rangDetail(42, 751, null)).toBe("sur 751");
    expect(rangDetail(42, null, null)).toBe("Classement");
    expect(rangDetail(null, 751, 8)).toBeNull();
  });
});
