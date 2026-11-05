import { describe, it, expect } from "vitest";
import {
  parisMidnight,
  incidentSpans,
  downtimeByDay,
  dayLevel,
  availabilityFrom,
  firstSeen,
} from "../downtime.js";

const t = (iso) => Date.parse(iso);

describe("temps d'incident", () => {
  it("minuit à Paris, en heure d'hiver comme d'été", () => {
    expect(parisMidnight("2026-11-05")).toBe(t("2026-11-04T23:00:00Z"));
    expect(parisMidnight("2026-07-01")).toBe(t("2026-06-30T22:00:00Z"));
  });

  it("un incident à cheval sur minuit est partagé entre les deux jours, même au changement d'heure", () => {
    const spans = [[t("2026-10-25T22:30:00Z"), t("2026-10-25T23:30:00Z")]];
    expect(downtimeByDay(spans, ["2026-10-25", "2026-10-26"])).toEqual([
      30, 30,
    ]);
  });

  it("deux sondes en panne en même temps ne comptent qu'une fois, perturbé ne compte pas", () => {
    const rows = [
      { probe: "db", level: "incident", checked_at: "2026-11-04T10:00:00Z" },
      { probe: "site", level: "incident", checked_at: "2026-11-04T10:05:00Z" },
      { probe: "db", level: "suspect", checked_at: "2026-11-04T10:10:00Z" },
      { probe: "site", level: "ok", checked_at: "2026-11-04T10:20:00Z" },
      { probe: "db", level: "ok", checked_at: "2026-11-04T11:00:00Z" },
    ];
    expect(incidentSpans(rows, ["db", "site"], 0)).toEqual([
      [t("2026-11-04T10:00:00Z"), t("2026-11-04T10:20:00Z")],
    ]);
  });

  it("un incident en cours court jusqu'à maintenant", () => {
    const rows = [
      { probe: "db", level: "incident", checked_at: "2026-11-04T10:00:00Z" },
    ];
    const now = t("2026-11-04T10:30:00Z");
    expect(incidentSpans(rows, ["db"], now)).toEqual([
      [t("2026-11-04T10:00:00Z"), now],
    ]);
  });

  it("couleur du jour selon la durée : vert, jaune, orange dès 20 min, rouge dès 1 h", () => {
    expect([0, 1, 19, 20, 59, 60].map((m) => dayLevel(m, 0, true))).toEqual([
      "ok",
      "minor",
      "minor",
      "major",
      "major",
      "incident",
    ]);
    expect(dayLevel(0, 0, false)).toBeNull();
  });

  it("site, base ou temps réel tombés : rouge, même pour un incident court", () => {
    expect(dayLevel(5, 5, true)).toBe("incident");
  });

  it("disponibilité : depuis la première mesure, jamais 100 % avec un incident", () => {
    const since = t("2026-11-01T00:00:00Z");
    const now = t("2026-11-04T00:00:00Z");
    const minute = [[since, since + 60_000]];
    expect(availabilityFrom(minute, since, now)).toBe(99.9);
    expect(availabilityFrom([], since, now)).toBe(100);
    expect(availabilityFrom([], null, now)).toBeNull();
    const rows = [
      { probe: "db", level: "ok", checked_at: "2026-10-01T00:00:00Z" },
    ];
    expect(firstSeen(rows, ["db"], since)).toBe(since);
    expect(firstSeen(rows, ["auth"], since)).toBeNull();
  });
});
