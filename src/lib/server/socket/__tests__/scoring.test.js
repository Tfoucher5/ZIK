import { describe, it, expect } from "vitest";
import {
  calcQcmPoints,
  checkClose,
  checkMatch,
  gradeGuess,
  makeChoices,
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

describe("œuvre (film, série…)", () => {
  const extra = (label, value) => ({
    label,
    value,
    clean: value.toLowerCase(),
    work: label === "Film",
  });
  const song = (artist, title, extras = []) => ({
    artist,
    mainArtist: artist,
    title,
    cleanArtist: artist.toLowerCase(),
    cleanFeatArtists: [],
    cleanTitle: title.toLowerCase(),
    extraAnswers: extras,
  });
  const tarzan = song("Phil Collins", "Jungle Jazz", [extra("Film", "Tarzan")]);
  const fresh = () => ({
    foundArtist: false,
    foundTitle: false,
    foundFeats: [],
    foundExtras: [false],
  });

  it("trouver le film valide toute la manche", () => {
    const kinds = gradeGuess("tarzan", tarzan, fresh()).hits.map((p) => p.kind);
    expect(kinds).toEqual(["artist", "title", "extra"]);
  });

  it("un personnage reste un bonus", () => {
    const t = song("Phil Collins", "Jungle Jazz", [
      extra("Personnage", "Tarzan"),
    ]);
    expect(gradeGuess("tarzan", t, fresh()).hits.map((p) => p.kind)).toEqual([
      "extra",
    ]);
  });

  it("le QCM propose des films quand la playlist en a assez", () => {
    const pool = ["Coco", "Vaiana", "Mulan", "Coco"].map((f) =>
      song("X", f, [extra("Film", f)]),
    );
    const { choices, correctChoiceIndex } = makeChoices(tarzan, [
      tarzan,
      ...pool,
    ]);
    expect(choices[correctChoiceIndex]).toBe("Tarzan");
    expect(new Set(choices)).toEqual(
      new Set(["Tarzan", "Coco", "Vaiana", "Mulan"]),
    );
  });

  it("le QCM garde artiste — titre s'il manque des films", () => {
    const pool = [song("A", "a"), song("B", "b"), song("C", "c")];
    const { choices, correctChoiceIndex } = makeChoices(tarzan, [
      tarzan,
      ...pool,
    ]);
    expect(choices[correctChoiceIndex]).toBe("Phil Collins — Jungle Jazz");
  });
});
