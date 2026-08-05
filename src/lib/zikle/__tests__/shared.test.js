import { describe, it, expect } from "vitest";
import {
  SNIPPET_DURATIONS,
  durationForAttempt,
  todayParis,
  computeStreak,
  buildShareGrid,
  escapeIlike,
  dedupById,
} from "../shared.js";

describe("durationForAttempt", () => {
  it("suit les paliers 1,2,4,7,11,16", () => {
    expect(SNIPPET_DURATIONS).toEqual([1, 2, 4, 7, 11, 16]);
    expect(durationForAttempt(0)).toBe(1);
    expect(durationForAttempt(5)).toBe(16);
  });
  it("clamp au dernier palier si index hors bornes", () => {
    expect(durationForAttempt(10)).toBe(16);
  });
});

describe("todayParis", () => {
  it("formate en YYYY-MM-DD", () => {
    const d = new Date("2026-08-04T22:30:00Z");
    expect(todayParis(d)).toBe("2026-08-05"); // 00h30 à Paris (UTC+2 en août)
  });
});

describe("computeStreak", () => {
  it("0 si jamais joué", () => {
    expect(computeStreak([], "2026-08-04")).toBe(0);
  });
  it("compte les jours consécutifs gagnés en remontant depuis aujourd'hui", () => {
    const results = [
      { date: "2026-08-04", won: true },
      { date: "2026-08-03", won: true },
      { date: "2026-08-02", won: true },
      { date: "2026-08-01", won: false },
    ];
    expect(computeStreak(results, "2026-08-04")).toBe(3);
  });
  it("si aujourd'hui pas encore joué, part d'hier", () => {
    const results = [
      { date: "2026-08-03", won: true },
      { date: "2026-08-02", won: true },
    ];
    expect(computeStreak(results, "2026-08-04")).toBe(2);
  });
  it("un trou casse la série", () => {
    const results = [
      { date: "2026-08-04", won: true },
      { date: "2026-08-02", won: true },
    ];
    expect(computeStreak(results, "2026-08-04")).toBe(1);
  });
});

describe("buildShareGrid", () => {
  // Les track_id sont des UUID : on vérifie que l'identifiant exact n'apparaît
  // pas, plutôt qu'une lettre isolée (qui se retrouve fatalement dans le texte).
  const ID_A = "11111111-1111-4111-8111-111111111111";
  const ID_B = "22222222-2222-4222-8222-222222222222";
  const ID_OK = "33333333-3333-4333-8333-333333333333";

  it("victoire au 3e essai", () => {
    const txt = buildShareGrid(47, [ID_A, ID_B, ID_OK], ID_OK, true);
    expect(txt).toContain("Zikle #47");
    expect(txt).toContain("3/6");
    expect(txt).toContain("🟥🟥🟩⬛⬛⬛");
    expect(txt).toContain("4s"); // 3e essai → palier de 4 s
    for (const id of [ID_A, ID_B, ID_OK]) expect(txt).not.toContain(id);
  });

  it("défaite : six carrés rouges, aucune case neutre", () => {
    const guesses = Array.from({ length: 6 }, (_, i) => `${ID_A}-${i}`);
    const txt = buildShareGrid(47, guesses, ID_OK, false);
    expect(txt).toContain("X/6");
    expect(txt).toContain("🟥🟥🟥🟥🟥🟥");
    expect(txt).toContain("16s");
  });

  it("mentionne la série seulement au-delà d'un jour", () => {
    const args = [47, [ID_OK], ID_OK, true];
    expect(buildShareGrid(...args, { streak: 4 })).toContain("Série de 4 jours");
    expect(buildShareGrid(...args, { streak: 1 })).not.toContain("Série");
    expect(buildShareGrid(...args)).not.toContain("Série");
  });

  it("un abandon complet reste lisible", () => {
    const txt = buildShareGrid(47, [], ID_OK, false);
    expect(txt).toContain("⬛⬛⬛⬛⬛⬛");
  });
});

describe("escapeIlike", () => {
  it("échappe % et _", () => {
    expect(escapeIlike("50% love_song")).toBe("50\\% love\\_song");
  });
});

describe("dedupById", () => {
  it("garde la première occurrence de chaque id", () => {
    const rows = [
      { id: "1", n: "a" },
      { id: "2", n: "b" },
      { id: "1", n: "c" },
    ];
    expect(dedupById(rows)).toEqual([
      { id: "1", n: "a" },
      { id: "2", n: "b" },
    ]);
  });
});
