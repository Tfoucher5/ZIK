import { describe, it, expect } from "vitest";
import {
  presetOf,
  maxRounds,
  estimateMinutes,
  cardsCheck,
} from "../rooms/settings.js";

describe("presetOf", () => {
  it("reconnaît un préréglage", () => {
    expect(presetOf({ rounds: 10, duration: 30, pause: 7 })).toBe("classic");
    expect(presetOf({ rounds: 12, duration: 30, pause: 7 })).toBeNull();
  });
});

describe("maxRounds", () => {
  it("plafonne au nombre de titres, entre 3 et 50", () => {
    expect(maxRounds(7)).toBe(7);
    expect(maxRounds(2)).toBe(3);
    expect(maxRounds(400)).toBe(50);
    expect(maxRounds(0)).toBe(50);
  });
});

describe("estimateMinutes", () => {
  it("manches × (durée + pause)", () => {
    expect(estimateMinutes({ rounds: 10, duration: 30, pause: 7 })).toBe(6);
    expect(estimateMinutes({ rounds: 1, duration: 10, pause: 3 })).toBe(1);
  });
});

describe("cardsCheck", () => {
  it("indique ce qu'il manque", () => {
    expect(cardsCheck(120, 10)).toEqual({
      ok: true,
      missingTracks: 0,
      missingRounds: 0,
    });
    expect(cardsCheck(60, 3)).toEqual({
      ok: false,
      missingTracks: 40,
      missingRounds: 2,
    });
  });
});
