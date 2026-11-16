import { describe, it, expect } from "vitest";
import { progress, smooth, pickSource, seekTarget } from "../scrub.js";

describe("progression de la scène", () => {
  it("reste entre 0 et 1", () => {
    expect(progress(300, 6000, 800)).toBe(0);
    expect(progress(0, 6000, 800)).toBe(0);
    expect(progress(-2600, 6000, 800)).toBe(0.5);
    expect(progress(-5200, 6000, 800)).toBe(1);
    expect(progress(-9000, 6000, 800)).toBe(1);
  });

  it("ne divise pas par zéro si la scène est plus courte que l'écran", () => {
    expect(progress(10, 600, 800)).toBe(0);
    expect(progress(-1, 600, 800)).toBe(1);
  });
});

describe("lissage", () => {
  it("avance de 1 - exp(-dt*k) vers la cible", () => {
    expect(smooth(0, 1, 0.1, 8)).toBeCloseTo(1 - Math.exp(-0.8));
  });

  it("ne bouge pas sans temps écoulé", () => {
    expect(smooth(0.2, 1, 0)).toBe(0.2);
  });

  it("donne le même résultat en une ou deux images", () => {
    const une = smooth(0, 1, 0.04);
    const deux = smooth(smooth(0, 1, 0.02), 1, 0.02);
    expect(deux).toBeCloseTo(une);
  });

  it("s'accroche à la cible quand l'écart est minuscule", () => {
    expect(smooth(0.9999, 1, 0.016)).toBe(1);
  });
});

describe("choix de la source", () => {
  const both = { portrait: "p.mp4", paysage: "l.mp4" };

  it("suit l'orientation", () => {
    expect(pickSource(both, true)).toBe("p.mp4");
    expect(pickSource(both, false)).toBe("l.mp4");
  });

  it("se rabat sur l'autre format s'il manque", () => {
    expect(pickSource({ paysage: "l.mp4" }, true)).toBe("l.mp4");
    expect(pickSource({ portrait: "p.mp4" }, false)).toBe("p.mp4");
  });
});

describe("instant visé", () => {
  it("attend les métadonnées", () => {
    expect(seekTarget(0.5, NaN, 0)).toBeNull();
    expect(seekTarget(0.5, 0, 0)).toBeNull();
  });

  it("ne dépasse pas la fin de la vidéo", () => {
    expect(seekTarget(1, 10, 0)).toBeCloseTo(9.95);
  });

  it("évite un seek pour un écart imperceptible", () => {
    expect(seekTarget(0.5, 10, 4.99)).toBeNull();
    expect(seekTarget(0.5, 10, 4)).toBe(5);
  });
});
