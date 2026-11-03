import { describe, it, expect } from "vitest";
import { nextStreak, levelOf, worst, grade } from "../levels.js";
import { fingerprintOf, collectErrors } from "../errorJournal.js";
import {
  noteMediaMiss,
  mediaMissesSince,
  resetMediaMisses,
} from "../mediaMisses.js";

const suite = (results) =>
  results.reduce(
    (acc, r) => {
      const streak = nextStreak(acc.streak, r);
      return { streak, levels: [...acc.levels, levelOf(streak)] };
    },
    { streak: { warns: 0, fails: 0 }, levels: [] },
  ).levels;

describe("niveaux d'une sonde", () => {
  it("seuil approché deux fois de suite : suspicion", () => {
    expect(suite(["warn", "warn"])).toEqual(["ok", "suspect"]);
    expect(suite(["warn", "ok", "warn"])).toEqual(["ok", "ok", "ok"]);
  });

  it("trois échecs de suite : incident, et une mesure saine remet à zéro", () => {
    expect(suite(["fail", "fail", "fail", "ok"])).toEqual([
      "suspect",
      "suspect",
      "incident",
      "ok",
    ]);
  });

  it("le niveau global est le pire des sondes", () => {
    expect(worst(["ok", "incident", "suspect"])).toBe("incident");
    expect(worst([])).toBe("ok");
  });

  it("seuils", () => {
    expect([
      grade(50, 100, 500),
      grade(100, 100, 500),
      grade(600, 100, 500),
    ]).toEqual(["ok", "warn", "fail"]);
  });
});

describe("journal d'erreurs", () => {
  it("la même erreur avec d'autres nombres ou identifiants a la même empreinte", () => {
    const a = fingerprintOf(
      "error",
      "Salon ABC 12 : uuid 3f2a9c1e-1234-4abc-9def-0123456789ab introuvable",
    );
    const b = fingerprintOf(
      "error",
      "Salon ABC 98 : uuid 00000000-aaaa-4bbb-8ccc-111111111111 introuvable",
    );
    expect(a).toBe(b);
    expect(fingerprintOf("warn", "x")).not.toBe(fingerprintOf("error", "x"));
  });

  it("regroupe les erreurs récentes avec un compteur, sans les infos", () => {
    const log = [
      { ts: 3000, level: "error", msg: "boom 3\nstack" },
      { ts: 2000, level: "error", msg: "boom 2" },
      { ts: 1500, level: "info", msg: "rien" },
      { ts: 500, level: "error", msg: "boom ancien" },
    ];
    const rows = collectErrors(log, 1000);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      level: "error",
      count: 2,
      first_seen: new Date(2000).toISOString(),
      last_seen: new Date(3000).toISOString(),
    });
  });
});

describe("titres sans musique", () => {
  it("compte ceux des 5 dernières minutes", () => {
    resetMediaMisses();
    noteMediaMiss(0);
    noteMediaMiss(4 * 60_000);
    noteMediaMiss(6 * 60_000);
    expect(mediaMissesSince(5 * 60_000, 6 * 60_000)).toBe(2);
  });
});
