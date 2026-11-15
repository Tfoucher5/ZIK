import { describe, it, expect, vi } from "vitest";
import { cleanCode, codeTarget, joinCode, CODE_INCOMPLET } from "../code.js";

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

  it("code incomplet : message, aucune navigation", async () => {
    const d = { joinRoom: vi.fn(), goto: vi.fn(), fetchFn: api([]) };
    expect(await joinCode("ABC", d)).toBe(CODE_INCOMPLET);
    expect(d.goto).not.toHaveBeenCalled();
    expect(d.joinRoom).not.toHaveBeenCalled();
  });

  it("rejoindre : soirée vers le téléphone, room vers le jeu en ligne", async () => {
    const s = {
      joinRoom: vi.fn(),
      goto: vi.fn(),
      fetchFn: api(["/api/salon"]),
    };
    expect(await joinCode("ABC123", s)).toBe("");
    expect(s.goto).toHaveBeenCalledWith("/salon/play?code=ABC123");
    const r = {
      joinRoom: vi.fn(),
      goto: vi.fn(),
      fetchFn: api(["/api/rooms"]),
    };
    await joinCode("ABC123", r);
    expect(r.joinRoom).toHaveBeenCalledWith("ABC123");
    expect(r.goto).not.toHaveBeenCalled();
  });

  it("code inconnu ou réseau en panne : la page soirée prend le relais", async () => {
    expect(await codeTarget("ABC123", api([]))).toBe("salon");
    expect(
      await codeTarget("ABC123", () => Promise.reject(new Error("x"))),
    ).toBe("salon");
  });
});
