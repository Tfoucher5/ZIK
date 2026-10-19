import { describe, it, expect } from "vitest";
import {
  calcQcmPoints,
  checkClose,
  checkMatch,
  gradeGuess,
} from "../scoring.js";

describe("calcQcmPoints", () => {
  it("retourne le score max pour une réponse immédiate", () => {
    expect(calcQcmPoints(0, 30)).toBe(1000);
  });
  it("retourne le score min pour une réponse en fin de timer", () => {
    expect(calcQcmPoints(30, 30)).toBe(200);
  });
  it("retourne une valeur intermédiaire pour une réponse à mi-temps", () => {
    const pts = calcQcmPoints(15, 30);
    expect(pts).toBeGreaterThan(200);
    expect(pts).toBeLessThan(1000);
  });
  it("ne dépasse jamais 1000", () => {
    expect(calcQcmPoints(-5, 30)).toBe(1000);
  });
  it("ne descend jamais sous 200", () => {
    expect(calcQcmPoints(99, 30)).toBe(200);
  });
});

describe("checkMatch", () => {
  it("accepte les fautes de frappe et les mots collés", () => {
    expect(checkMatch("stroame", "stromae")).toBe(true);
    expect(checkMatch("bohemian rapsody", "bohemian rhapsody")).toBe(true);
    expect(checkMatch("daftpunk", "daft punk")).toBe(true);
    expect(checkMatch("two become one", "2 become 1")).toBe(true);
  });
  it("accepte une partie suffisante de la réponse", () => {
    expect(checkMatch("beatles", "the beatles")).toBe(true);
    expect(checkMatch("goldman", "jean jacques goldman")).toBe(false);
  });
  it("refuse une autre réponse proche", () => {
    expect(checkMatch("gaza", "gazo")).toBe(false);
    expect(checkMatch("with me", "without me")).toBe(false);
    expect(checkMatch("jl", "jul")).toBe(false);
  });
});

describe("checkClose", () => {
  it("signale une réponse partielle", () => {
    expect(checkClose("bohemian", "bohemian rhapsody")).toBe(true);
    expect(checkClose("goldman", "jean jacques goldman")).toBe(true);
  });
  it("ignore une réponse sans rapport", () => {
    expect(checkClose("queen", "bohemian rhapsody")).toBe(false);
  });
});

describe("gradeGuess", () => {
  const track = {
    cleanArtist: "queen",
    cleanFeatArtists: ["david bowie"],
    cleanTitle: "under pressure",
    extraAnswers: [],
  };
  const fresh = () => ({
    foundArtist: false,
    foundTitle: false,
    foundFeats: [false],
    foundExtras: [],
  });
  const kinds = (input, found = fresh()) =>
    gradeGuess(input, track, found).hits.map((p) => p.kind);

  it("trouve tout en une seule réponse", () => {
    expect(kinds("under presure de queen et david bowie")).toEqual([
      "artist",
      "feat",
      "title",
    ]);
    expect(kinds("queen")).toEqual(["artist"]);
  });
  it("ignore les parties déjà trouvées", () => {
    expect(
      kinds("queen under pressure", { ...fresh(), foundArtist: true }),
    ).toEqual(["title"]);
  });
  it("ne valide rien avec une réponse fleuve", () => {
    expect(kinds("queen a b c d e f g h")).toEqual([]);
  });
  it("signale une réponse proche sans la valider", () => {
    const r = gradeGuess("under", track, fresh());
    expect(r.hits).toEqual([]);
    expect(r.close?.kind).toBe("title");
  });
});
