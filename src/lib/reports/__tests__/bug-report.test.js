import { describe, it, expect } from "vitest";
import {
  BUG_MOTIFS,
  buildTrackChoices,
  sanitizeReportTracks,
  asUuidOrNull,
} from "../bug-report.js";

describe("asUuidOrNull", () => {
  it("garde un uuid valide", () => {
    const u = "11111111-2222-3333-4444-555555555555";
    expect(asUuidOrNull(u)).toBe(u);
  });

  it("rejette l'identifiant local d'un invité", () => {
    expect(asUuidOrNull("guest_1712345678901")).toBe(null);
    expect(asUuidOrNull("dbg1")).toBe(null);
  });

  it("rejette les valeurs non textuelles", () => {
    expect(asUuidOrNull(null)).toBe(null);
    expect(asUuidOrNull(undefined)).toBe(null);
    expect(asUuidOrNull(42)).toBe(null);
  });
});

describe("BUG_MOTIFS", () => {
  it("propose le motif audio en premier", () => {
    expect(BUG_MOTIFS[0].value).toBe("audio");
  });

  it("contient les quatre motifs attendus", () => {
    expect(BUG_MOTIFS.map((m) => m.value)).toEqual([
      "audio",
      "mauvaise-reponse",
      "affichage",
      "autre",
    ]);
  });
});

describe("buildTrackChoices", () => {
  const history = [
    { round: 4, answer: "PLK - Pas de son", trackId: "t4", videoId: "v4" },
    { round: 3, answer: "Gazo - Drill FR", trackId: "t3", videoId: "v3" },
  ];

  it("place la manche en cours en tête, verrouillée et sans titre", () => {
    const c = buildTrackChoices({
      history,
      current: { round: 5, trackId: "t5", videoId: "v5" },
    });
    expect(c[0].locked).toBe(true);
    expect(c[0].round).toBe(5);
    expect(c[0].label).toBe("Manche 5 — en cours");
    expect(c[0].answer).toBe(null);
  });

  it("liste les manches terminées avec leur titre", () => {
    const c = buildTrackChoices({ history, current: null });
    expect(c).toHaveLength(2);
    expect(c[0].label).toBe("M4 · PLK - Pas de son");
    expect(c[0].locked).toBe(false);
    expect(c[0].trackId).toBe("t4");
  });

  it("renvoie une liste vide sans historique ni manche en cours", () => {
    expect(buildTrackChoices({ history: [], current: null })).toEqual([]);
  });

  it("donne une clé unique à chaque entrée", () => {
    const c = buildTrackChoices({
      history,
      current: { round: 5, trackId: "t5", videoId: "v5" },
    });
    expect(new Set(c.map((x) => x.key)).size).toBe(3);
  });
});

describe("sanitizeReportTracks", () => {
  it("garde une liste valide", () => {
    const v = [{ trackId: "t1", videoId: "v1", round: 2, answer: "A - B" }];
    expect(sanitizeReportTracks(v)).toEqual(v);
  });

  it("rejette ce qui n'est pas un tableau", () => {
    expect(sanitizeReportTracks("nope")).toBe(null);
    expect(sanitizeReportTracks({ a: 1 })).toBe(null);
    expect(sanitizeReportTracks(undefined)).toBe(null);
  });

  it("rejette au-delà de 50 entrées", () => {
    const gros = Array.from({ length: 51 }, () => ({ trackId: "t" }));
    expect(sanitizeReportTracks(gros)).toBe(null);
  });

  it("ne conserve que les champs attendus", () => {
    const v = [{ trackId: "t1", vole: "secret", round: 1 }];
    expect(sanitizeReportTracks(v)).toEqual([
      { trackId: "t1", videoId: null, round: 1, answer: null },
    ]);
  });
});
