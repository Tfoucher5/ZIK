import { describe, it, expect } from "vitest";
import { FINALE_END, FINALE_START, finaleSteps } from "../host/finaleSteps.js";
import { FINALE_WINNER_MS } from "../../../data/salonOptions.js";

// État affiché à un instant donné de la séquence
const at = (steps, ms) =>
  steps
    .filter((s) => s.at <= ms)
    .reduce((v, s) => ({ ...v, ...s.set }), { ...FINALE_START });

describe("podium de la soirée sur la TV", () => {
  it("le 3e, le 2e, le tambour, le vainqueur, le repli, puis la suite", () => {
    const s = finaleSteps({ count: 8 });
    expect(s.map((x) => x.at)).toEqual(
      [...s.map((x) => x.at)].sort((a, b) => a - b),
    );
    expect(at(s, 1500).step).toBe(1);
    expect(at(s, 3600).step).toBe(2);
    expect(at(s, 5700).drum).toBe(true);
    expect(at(s, FINALE_WINNER_MS).flood).toBe("in");
    expect(at(s, FINALE_WINNER_MS - 1).flood).toBeNull();
    const fin = at(s, 60000);
    expect(fin).toEqual(FINALE_END);
  });

  it("le vainqueur tombe au même instant que la place sur le téléphone", () => {
    const vainqueur = finaleSteps().find((s) => s.set.flood === "in");
    expect(vainqueur.at).toBe(FINALE_WINNER_MS);
  });

  it("confettis une seule fois, sur le vainqueur", () => {
    const c = finaleSteps().filter((s) => s.confetti);
    expect(c).toHaveLength(1);
    expect(c[0].at).toBe(FINALE_WINNER_MS);
  });

  it("places absentes sautées, le vainqueur reste à l'heure", () => {
    const deux = finaleSteps({ count: 2 });
    expect(deux.some((s) => s.set.step === 1)).toBe(false);
    expect(at(deux, 3600).step).toBe(2);
    const un = finaleSteps({ count: 1 });
    expect(un.some((s) => s.set.step === 1 || s.set.step === 2)).toBe(false);
    expect(un.find((s) => s.set.flood === "in").at).toBe(FINALE_WINNER_MS);
  });

  it("sans son : même séquence, pas de tambour joué", () => {
    const muet = finaleSteps({ sound: false });
    expect(muet.some((s) => s.drumroll)).toBe(false);
    expect(finaleSteps().filter((s) => s.drumroll)).toHaveLength(1);
    expect(muet.map((s) => s.at)).toEqual(finaleSteps().map((s) => s.at));
  });

  it("mouvements réduits : tout d'un coup, sans aplat ni confettis", () => {
    const s = finaleSteps({ count: 8, reduced: true });
    expect(s).toEqual([{ at: 0, set: FINALE_END }]);
    expect(s.some((x) => x.confetti || x.drumroll)).toBe(false);
  });
});
