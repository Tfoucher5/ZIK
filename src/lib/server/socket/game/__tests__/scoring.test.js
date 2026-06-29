import { describe, it, expect } from "vitest";
import { calcQcmPoints } from "../scoring.js";

describe("calcQcmPoints", () => {
  it("retourne le score max pour une réponse immédiate", () => {
    expect(calcQcmPoints(0, 30)).toBe(1000);
  });
  it("retourne le score min pour une réponse en fin de timer", () => {
    expect(calcQcmPoints(30, 30)).toBe(200);
  });
  it("retourne une valeur intermédiaire pour une réponse à mi-temps", () => {
    const pts = calcQcmPoints(15, 30);
    expect(pts).toBeGreaterThan(200);
    expect(pts).toBeLessThan(1000);
  });
  it("ne dépasse jamais 1000", () => {
    expect(calcQcmPoints(-5, 30)).toBe(1000);
  });
  it("ne descend jamais sous 200", () => {
    expect(calcQcmPoints(99, 30)).toBe(200);
  });
});
