import { describe, it, expect, afterEach, vi } from "vitest";
import { shouldAutoStart } from "../onboarding.svelte.js";

describe("démarrage du tutoriel du jeu", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ne s'ouvre ni sur l'aiguillage ni sur ZIK Soirée, mais sur le jeu", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(shouldAutoStart("/")).toBe(false);
    expect(shouldAutoStart("/soiree")).toBe(false);
    expect(shouldAutoStart("/pro")).toBe(false);
    expect(shouldAutoStart("/vs/kahoot")).toBe(false);
    expect(shouldAutoStart("/jouer")).toBe(true);
  });
});
