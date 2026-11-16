import { describe, it, expect } from "vitest";
import { nextIndex } from "../radioGroup.js";

describe("groupe de choix au clavier", () => {
  it("les flèches avancent et reculent en boucle", () => {
    expect(nextIndex(4, 0, "ArrowRight")).toBe(1);
    expect(nextIndex(4, 3, "ArrowDown")).toBe(0);
    expect(nextIndex(4, 0, "ArrowLeft")).toBe(3);
    expect(nextIndex(4, 2, "ArrowUp")).toBe(1);
  });

  it("Début et Fin vont aux extrémités", () => {
    expect(nextIndex(5, 2, "Home")).toBe(0);
    expect(nextIndex(5, 2, "End")).toBe(4);
  });

  it("autre touche, ou focus hors des choix : rien", () => {
    expect(nextIndex(4, 1, "Enter")).toBeNull();
    expect(nextIndex(4, -1, "ArrowRight")).toBeNull();
  });
});
