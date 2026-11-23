import { describe, it, expect, vi, afterEach } from "vitest";
import { nextAttempt, refDe, screenOf, zikAnswers } from "../relance.js";

afterEach(() => vi.useRealTimers());

describe("relance : logique pure", () => {
  it("écran selon l'adresse", () => {
    expect(screenOf("/salon/host")).toBe("host");
    expect(screenOf("/salon/regie/")).toBe("regie");
    expect(screenOf("/salon/play")).toBe("play");
    expect(screenOf("/salon/new")).toBeNull();
    expect(screenOf("/salon/host/x")).toBeNull();
    expect(screenOf(undefined)).toBeNull();
  });

  it("3, 10, 30 puis 60 s sans fin ; zéro après 2 min", () => {
    const t = 1e6;
    expect(nextAttempt(null, t)).toEqual({ essai: 1, delai: 3 });
    expect(nextAttempt({ essai: 1, at: t - 1000 }, t).delai).toBe(10);
    expect(nextAttempt({ essai: 2, at: t - 1000 }, t).delai).toBe(30);
    expect(nextAttempt({ essai: 3, at: t - 1000 }, t).delai).toBe(60);
    expect(nextAttempt({ essai: 40, at: t - 1000 }, t).delai).toBe(60);
    expect(nextAttempt({ essai: 5, at: t - 120000 }, t).essai).toBe(1);
    expect(nextAttempt({ essai: 2, at: t + 5000 }, t).essai).toBe(1);
    expect(nextAttempt({ essai: "x", at: t }, t).essai).toBe(1);
  });

  it("healthz : < 500 répond ; 502, échec ou 4 s sans réponse non", async () => {
    vi.useFakeTimers();
    const ok = (status) => () => Promise.resolve({ status });
    expect(await zikAnswers(ok(404))).toBe(true);
    expect(await zikAnswers(ok(502))).toBe(false);
    expect(await zikAnswers(() => Promise.reject(new Error("x")))).toBe(false);
    const p = zikAnswers(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(4000);
    expect(await p).toBe(false);
  });

  it("réf. : code et heure", () => {
    expect(refDe("ABC123", new Date(2026, 10, 23, 9, 5).getTime())).toBe(
      "ABC123 · 09:05",
    );
  });
});
