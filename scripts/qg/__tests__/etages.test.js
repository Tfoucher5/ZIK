import { describe, expect, it } from "vitest";
import { VILLE, cadrage } from "../public/etages.js";
import { NIVEAUX } from "../public/tour/plan.js";

describe("cadrage", () => {
  it("pose la caméra au sol de chaque niveau de la tour", () => {
    for (const n of NIVEAUX) expect(cadrage(n.id).y).toBe(n.z);
  });

  it("recule pour la ville et garde les bornes autour de la tour", () => {
    const v = cadrage(VILLE);
    expect(v.recul).toBeGreaterThan(cadrage("n3").recul);
    expect(v.bornes).toEqual(cadrage("n0").bornes);
    expect(v.bornes[0]).toBeLessThan(-21.6);
    expect(v.bornes[1]).toBeGreaterThan(21.6);
  });
});
