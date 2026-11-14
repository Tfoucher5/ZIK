import { describe, it, expect } from "vitest";
import { cleanCode, codeTarget } from "../code.js";

const api = (known) => (url) =>
  Promise.resolve({ ok: known.some((k) => url.startsWith(k)) });

describe("champ « J'ai un code » de l'aiguillage", () => {
  it("garde 6 caractères en majuscules, sans espace ni symbole", () => {
    expect(cleanCode(" ab-c 12 3z9")).toBe("ABC123");
  });

  it("une soirée ouverte passe avant une room du même code", async () => {
    expect(await codeTarget("ABC123", api(["/api/salon", "/api/rooms"]))).toBe(
      "salon",
    );
  });

  it("une room connue part vers le jeu en ligne", async () => {
    expect(await codeTarget("ABC123", api(["/api/rooms/ABC123"]))).toBe("room");
  });

  it("code inconnu ou réseau en panne : la page soirée prend le relais", async () => {
    expect(await codeTarget("ABC123", api([]))).toBe("salon");
    expect(
      await codeTarget("ABC123", () => Promise.reject(new Error("x"))),
    ).toBe("salon");
  });
});
