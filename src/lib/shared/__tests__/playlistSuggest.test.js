import { describe, it, expect } from "vitest";
import { rankSuggestions, pickSeeds } from "../playlist/suggest.js";

const t = (id, artist, rank = 0) => ({ external_id: id, artist, rank });

describe("rankSuggestions", () => {
  it("met devant les titres proposés par plusieurs radios", () => {
    const out = rankSuggestions([
      [t("1", "A", 900), t("2", "B", 100)],
      [t("2", "B", 100), t("3", "C", 500)],
    ]);
    expect(out.map((x) => x.external_id)).toEqual(["2", "1", "3"]);
  });

  it("exclut les titres déjà dans la playlist", () => {
    const out = rankSuggestions([[t("1", "A"), t("2", "B")]], ["1"]);
    expect(out.map((x) => x.external_id)).toEqual(["2"]);
  });

  it("limite à 2 titres par artiste", () => {
    const out = rankSuggestions([[t("1", "A"), t("2", "A"), t("3", "A")]]);
    expect(out).toHaveLength(2);
  });
});

describe("pickSeeds", () => {
  it("un titre Deezer par artiste, les plus présents d'abord", () => {
    const tracks = [
      { source: "deezer", external_id: "10", artist: "PNL" },
      { source: "deezer", external_id: "20", artist: "Daft Punk" },
      { source: "deezer", external_id: "21", artist: "Daft Punk" },
      { source: "manual", external_id: null, artist: "X" },
    ];
    expect(pickSeeds(tracks)).toEqual(["20", "10"]);
  });
});
