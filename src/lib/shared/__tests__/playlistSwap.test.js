import { describe, it, expect } from "vitest";
import { roundsAfterSwap } from "../playlist/swap.js";

const playlists = [
  { id: "a", trackCount: 3 },
  { id: "b", trackCount: 40 },
  { id: "c" },
];

describe("roundsAfterSwap", () => {
  it("suit la nouvelle sélection quand elle a moins de titres que le reste", () => {
    expect(
      roundsAfterSwap({
        maxRounds: 10,
        round: 2,
        playlists,
        selectedIds: ["a"],
      }),
    ).toBe(3);
  });

  it("repart du choix de l'organisateur, pas de l'ancien total raccourci", () => {
    expect(
      roundsAfterSwap({
        maxRounds: 10,
        round: 2,
        playlists,
        selectedIds: ["b"],
      }),
    ).toBe(8);
  });

  it("additionne les playlists choisies", () => {
    expect(
      roundsAfterSwap({
        maxRounds: 50,
        round: 0,
        playlists,
        selectedIds: ["a", "b"],
      }),
    ).toBe(43);
  });

  it("ne descend jamais sous zéro", () => {
    expect(
      roundsAfterSwap({
        maxRounds: 5,
        round: 7,
        playlists,
        selectedIds: ["b"],
      }),
    ).toBe(0);
  });

  it("n'annonce pas 0 quand une playlist cochée n'a pas de compte connu", () => {
    expect(
      roundsAfterSwap({
        maxRounds: 5,
        round: 1,
        playlists,
        selectedIds: ["c"],
      }),
    ).toBe(4);
    expect(
      roundsAfterSwap({
        maxRounds: 5,
        round: 1,
        playlists: [],
        selectedIds: ["z"],
      }),
    ).toBe(4);
  });
});
