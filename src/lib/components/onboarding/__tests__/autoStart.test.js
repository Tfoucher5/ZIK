import { describe, it, expect, afterEach, vi } from "vitest";
import { shouldAutoStart } from "../onboarding.svelte.js";

describe("démarrage du tutoriel du jeu", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ne s'ouvre pas sur la vitrine ZIK Soirée, mais sur le jeu", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(shouldAutoStart("/soiree")).toBe(false);
    expect(shouldAutoStart("/jouer")).toBe(true);
  });
});
