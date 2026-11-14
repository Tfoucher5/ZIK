import { describe, it, expect } from "vitest";
import { barCalm } from "../host/hostCalm.js";

const manche = { phase: "round" };

describe("réglages de la TV cachés pendant les manches", () => {
  it("cachés en manche et au résumé après le délai sans geste", () => {
    expect(barCalm(manche, true)).toBe(true);
    expect(barCalm({ phase: "summary" }, true)).toBe(true);
    expect(barCalm(manche, false)).toBe(false);
  });

  it("toujours visibles hors des manches", () => {
    for (const phase of ["lobby", "starting", "gameover"])
      expect(barCalm({ phase }, true)).toBe(false);
  });

  it("gardés ouverts quand l'hôte en a besoin", () => {
    for (const besoin of [
      { paused: true },
      { helpOpen: true },
      { pickerOpen: true },
      { restarting: true },
      { restored: { resumeIn: 5 } },
      { videoOutage: { since: 1 } },
    ])
      expect(
        barCalm({ ...manche, ...besoin }, true),
        JSON.stringify(besoin),
      ).toBe(false);
  });
});
