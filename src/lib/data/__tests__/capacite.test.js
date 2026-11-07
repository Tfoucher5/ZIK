import { describe, it, expect } from "vitest";
import { BLIND_TEST_THEMES } from "../blindTestThemes.js";
import { FREE_MAX_PLAYERS, PRO_PERKS, TESTED_LABEL } from "../proPlans.js";

const reponses = BLIND_TEST_THEMES.flatMap((t) => t.faq ?? []).map((q) => q.a);

describe("capacité annoncée", () => {
  it("la limite gratuite des FAQ est la vraie limite", () => {
    const annonces = reponses.flatMap((a) => [
      ...a.matchAll(/jusqu'à (\d+) (?:téléphones|joueurs)/gi),
    ]);
    expect(annonces.length).toBeGreaterThan(0);
    for (const [, n] of annonces) expect(Number(n)).toBe(FREE_MAX_PLAYERS);
  });

  it("le chiffre testé dit toujours que les joueurs sont simulés", () => {
    expect(TESTED_LABEL).toMatch(/joueurs simulés$/);
    expect(PRO_PERKS.join()).toContain(TESTED_LABEL);
  });

  it("aucune FAQ de thème ne promet de joueurs illimités", () => {
    for (const a of reponses) expect(a).not.toMatch(/illimit/i);
  });
});
