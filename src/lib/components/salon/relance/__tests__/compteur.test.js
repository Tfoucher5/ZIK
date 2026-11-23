import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appareil, bloque, stockage } from "./appareil.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 23, 21, 30, 0));
});
afterEach(() => vi.useRealTimers());

describe("compteur d'essais", () => {
  it("stockage qui lève : 30 s d'emblée", () => {
    const r = appareil({ storage: bloque }).ouvrir();
    expect([r.essai, r.sec]).toEqual([3, 30]);
  });

  it("stockage qui lit mais n'écrit pas : 30 s, jamais de boucle à 3 s", async () => {
    const lit = {
      ...stockage(),
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    const a = appareil({ storage: lit });
    for (let i = 0; i < 3; i++) {
      const r = a.ouvrir();
      expect(r.essai).toBeGreaterThanOrEqual(3);
      const ms = (r.sec ?? 60) * 1000;
      expect(ms).toBeGreaterThanOrEqual(30000);
      await vi.advanceTimersByTimeAsync(ms - 100);
      expect(a.reload).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      expect(a.reload).toHaveBeenCalledOnce();
      a.reload.mockClear();
      r.destroy();
    }
  });

  it("stockage qui marche : l'essai est écrit dès l'ouverture", () => {
    const a = appareil();
    a.ouvrir();
    const [v] = Object.values(a.storage.v);
    expect(JSON.parse(v)).toEqual({ essai: 1, at: Date.now() });
  });
});
