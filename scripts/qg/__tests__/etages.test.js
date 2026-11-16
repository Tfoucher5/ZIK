import { describe, expect, it } from "vitest";
import { ETAGES, VILLE, cadrage, visibles } from "../public/etages.js";

const PLATEAU = [-29, 22, -11, 11];

describe("visibles", () => {
  it("masque les étages au-dessus de l'étage choisi", () => {
    expect(visibles(0)).toEqual([true, false, false]);
    expect(visibles(1)).toEqual([true, true, false]);
    expect(visibles(2)).toEqual([true, true, true]);
  });

  it("montre toute la tour depuis la ville", () => {
    expect(visibles(VILLE)).toEqual([true, true, true]);
  });
});

describe("cadrage", () => {
  it("pose la caméra à la hauteur de l'étage, dans ses bornes", () => {
    expect(cadrage(0, PLATEAU)).toEqual({ y: 0, bornes: PLATEAU, recul: 1 });
    expect(cadrage(2, PLATEAU)).toMatchObject({
      y: ETAGES[2].y,
      bornes: ETAGES[2].bornes,
    });
  });

  it("recule pour la vue de la ville", () => {
    const v = cadrage(VILLE, PLATEAU);
    expect(v.recul).toBeGreaterThan(1);
    expect(v.bornes).toEqual(PLATEAU);
  });

  it("empile les étages sans que les murs (2,6 m) traversent le sol du dessus", () => {
    for (let k = 1; k < ETAGES.length; k++)
      expect(ETAGES[k].y - ETAGES[k - 1].y).toBeGreaterThan(2.6 + 0.3);
  });
});
