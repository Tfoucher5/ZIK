import { describe, it, expect } from "vitest";
import {
  detectInput,
  parseLine,
  parseList,
  isLikelyMatch,
  matchScore,
  guessFromVideo,
  coverThumb,
} from "../playlist/input.js";

describe("detectInput", () => {
  it.each([
    ["", { kind: "empty" }],
    ["daft punk", { kind: "search", q: "daft punk" }],
    [
      "https://www.deezer.com/fr/playlist/908622995",
      { kind: "deezer-playlist", id: "908622995" },
    ],
    [
      "Écoute ma playlist sur Deezer https://link.deezer.com/s/31VxXnMeXGYxGFUXblR1A",
      { kind: "deezer-short", id: "31VxXnMeXGYxGFUXblR1A" },
    ],
    [
      "https://www.deezer.com/track/738537602?host=1",
      { kind: "deezer-track", id: "738537602" },
    ],
    ["https://deezer.com/album/302127", { kind: "deezer-album", id: "302127" }],
    [
      "https://www.deezer.com/en/artist/27",
      { kind: "deezer-artist", id: "27" },
    ],
    [
      "https://open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x",
      { kind: "spotify-playlist", id: "37i9dQZF1DXcBWIGoYBM5M" },
    ],
    ["https://youtu.be/dQw4w9WgXcQ", { kind: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://vimeo.com/1", { kind: "unknown-link" }],
    ["a - b\nc - d", { kind: "list" }],
  ])("%s", (input, expected) => {
    expect(detectInput(input)).toEqual(expected);
  });
});

describe("parseLine", () => {
  it("lit « artiste - titre »", () => {
    expect(parseLine("Daft Punk - One More Time")).toMatchObject({
      artist: "Daft Punk",
      title: "One More Time",
    });
  });

  it("retire numéro et durée", () => {
    expect(parseLine("03. PNL – Au DD (3:47)")).toMatchObject({
      artist: "PNL",
      title: "Au DD",
    });
  });

  it("lit « titre by artiste »", () => {
    expect(parseLine("Bohemian Rhapsody by Queen")).toMatchObject({
      artist: "Queen",
      title: "Bohemian Rhapsody",
    });
  });

  it("garde la ligne brute sans séparateur", () => {
    expect(parseLine("1 bohemian rhapsody")).toEqual({
      artist: "",
      title: "",
      query: "bohemian rhapsody",
    });
  });
});

describe("parseList", () => {
  it("ignore lignes vides et doublons", () => {
    const list = parseList("A - B\n\n  a - b \nC - D");
    expect(list.map((p) => p.query)).toEqual(["A - B", "C - D"]);
  });
});

describe("isLikelyMatch", () => {
  const track = { artist: "Daft Punk", title: "One More Time (Radio Edit)" };

  it("accepte artiste et titre proches", () => {
    expect(
      isLikelyMatch({ artist: "daft punk", title: "one more time" }, track),
    ).toBe(true);
  });

  it("accepte l'ordre inversé", () => {
    expect(
      isLikelyMatch({ artist: "One More Time", title: "Daft Punk" }, track),
    ).toBe(true);
  });

  it("refuse un autre titre", () => {
    expect(
      isLikelyMatch({ artist: "Daft Punk", title: "Around the World" }, track),
    ).toBe(false);
  });

  it("ligne sans séparateur : artiste et titre présents", () => {
    expect(
      isLikelyMatch({ artist: "", query: "daft punk one more time" }, track),
    ).toBe(true);
  });
});

describe("guessFromVideo", () => {
  it("chaîne Topic", () => {
    expect(guessFromVideo("Get Lucky", "Daft Punk - Topic")).toEqual({
      artist: "Daft Punk",
      title: "Get Lucky",
    });
  });

  it("titre « artiste - titre » sans bruit", () => {
    expect(
      guessFromVideo("Stromae - Alors on danse (Official Video)", "x"),
    ).toEqual({ artist: "Stromae", title: "Alors on danse" });
  });

  it("repli sur la chaîne", () => {
    expect(guessFromVideo("Hello", "AdeleVEVO")).toEqual({
      artist: "Adele",
      title: "Hello",
    });
  });
});

describe("coverThumb", () => {
  it("réduit une pochette Deezer", () => {
    expect(
      coverThumb(
        "https://e-cdns-images.dzcdn.net/images/cover/abc/1000x1000-000000-80-0-0.jpg",
      ),
    ).toBe(
      "https://e-cdns-images.dzcdn.net/images/cover/abc/120x120-000000-80-0-0.jpg",
    );
  });
});

describe("matchScore", () => {
  const asked = { artist: "Queen", title: "Bohemian Rhapsody" };

  it("préfère la version studio à un live non demandé", () => {
    const live = matchScore(asked, {
      artist: "Queen",
      title: "Bohemian Rhapsody (Live Aid)",
    });
    const studio = matchScore(asked, {
      artist: "Queen",
      title: "Bohemian Rhapsody",
    });
    expect(studio).toBeGreaterThan(live);
  });

  it("garde le live quand la ligne le demande", () => {
    const p = { artist: "Queen", title: "Bohemian Rhapsody (Live)" };
    expect(
      matchScore(p, { artist: "Queen", title: "Bohemian Rhapsody (Live Aid)" }),
    ).toBeGreaterThan(1);
  });

  it("0 si ce n'est pas le bon titre", () => {
    expect(
      matchScore(asked, { artist: "Queen", title: "We Will Rock You" }),
    ).toBe(0);
  });
});
