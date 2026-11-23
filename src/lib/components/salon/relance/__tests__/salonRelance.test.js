import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "svelte/server";
import SalonRelance from "../SalonRelance.svelte";
import { REPLI_MS, creerSecours } from "../relance.js";

describe("SalonRelance rendu serveur, vraie Relance", () => {
  it.each(["host", "regie", "play"])(
    "%s : rendu sans window, une seule annonce",
    (ecran) => {
      expect(globalThis.window).toBeUndefined();
      const { body } = render(SalonRelance, {
        props: { ecran, code: "K7M2QX", version: "3.34.0", error: null },
      });
      expect((body.match(/role="status"/g) ?? []).length).toBe(1);
      expect(body).not.toContain("recharge");
    },
  );
});

describe("creerSecours", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const monter = (relance = { destroy: vi.fn() }) => {
    const nav = { onLine: true };
    const location = { reload: vi.fn() };
    const s = creerSecours(relance, { timers: globalThis, nav, location });
    return { s, nav, location, relance };
  };

  it("arrête la relance, puis recharge toutes les 30 s si en ligne", () => {
    const { s, nav, location, relance } = monter();
    s.declencher();
    s.declencher();
    expect(relance.destroy).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(REPLI_MS - 1);
    expect(location.reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(location.reload).toHaveBeenCalledOnce();
    nav.onLine = false;
    vi.advanceTimersByTime(REPLI_MS);
    expect(location.reload).toHaveBeenCalledOnce();
    nav.onLine = true;
    vi.advanceTimersByTime(REPLI_MS);
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it("arreter coupe le repli", () => {
    const { s, location } = monter();
    s.declencher();
    s.arreter();
    vi.advanceTimersByTime(REPLI_MS * 3);
    expect(location.reload).not.toHaveBeenCalled();
  });

  it("ne lève jamais : relance cassée, rechargement qui lève", () => {
    const casse = {
      destroy() {
        throw new Error("x");
      },
    };
    const { s, location } = monter(casse);
    location.reload.mockImplementation(() => {
      throw new Error("bloqué");
    });
    expect(() => s.declencher()).not.toThrow();
    expect(() => vi.advanceTimersByTime(REPLI_MS)).not.toThrow();
    expect(location.reload).toHaveBeenCalledOnce();
    expect(() => s.arreter()).not.toThrow();
  });
});
