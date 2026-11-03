import { describe, it, expect, afterEach, vi } from "vitest";
import { countdown } from "../countdown.js";

describe("chrono affiché sur les écrans", () => {
  afterEach(() => vi.useRealTimers());

  it("compte seul jusqu'à 0 puis s'arrête", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const vus = [];
    const c = countdown((v) => vus.push(v));
    c.start(3000, 0);
    vi.advanceTimersByTime(5000);
    expect([...new Set(vus)]).toEqual([3, 2, 1, 0]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("corrige l'écart d'horloge entre le téléphone et le serveur", () => {
    vi.useFakeTimers();
    // Téléphone en avance de 7 s sur le serveur
    vi.setSystemTime(107_000);
    let affiche;
    const c = countdown((v) => (affiche = v));
    c.start(130_000, 100_000);
    expect(affiche).toBe(30);
    c.stop();
  });

  it("page reprise en cours de manche : affiche le temps qui reste", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let affiche;
    const c = countdown((v) => (affiche = v));
    // Reconnexion 4 s après le début de la manche (horloges égales)
    vi.setSystemTime(4000);
    c.start(30_000, 4000);
    expect(affiche).toBe(26);
    c.stop();
  });

  it("une latence qui varie ne fait pas remonter l'affichage", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const vus = [];
    const c = countdown((v) => vus.push(v));
    c.start(30_000, 0);
    vi.advanceTimersByTime(18_050);
    // Tick suivant reçu avec 600 ms de latence en plus
    c.start(30_000, 17_450);
    vi.advanceTimersByTime(100);
    expect(vus.at(-1)).toBe(12);
    expect(Math.min(...vus.slice(-3))).toBe(12);
    c.stop();
  });

  it("stop fige l'affichage (pause)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let affiche;
    const c = countdown((v) => (affiche = v));
    c.start(30_000, 0);
    vi.advanceTimersByTime(2000);
    c.stop();
    vi.advanceTimersByTime(10_000);
    expect(affiche).toBe(28);
  });
});
