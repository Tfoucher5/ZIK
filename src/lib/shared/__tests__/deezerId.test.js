import { describe, it, expect } from "vitest";
import { deezerIdOf } from "../playlist/deezerId.js";

describe("identifiant Deezer d'un titre", () => {
  it("identifiant complété en base : prioritaire", () => {
    expect(deezerIdOf({ deezer_id: "42", external_id: "7" })).toBe("42");
  });
  it("import Deezer : id numérique repris", () => {
    expect(deezerIdOf({ external_id: "7" })).toBe("7");
  });
  it.each([
    [{ external_id: "4uLU6hMCjMI75M1A2tKUQC" }],
    [{ external_id: null }],
    [{}],
  ])("id Spotify, absent ou vide : aucun (%o)", (t) => {
    expect(deezerIdOf(t)).toBeNull();
  });
});
