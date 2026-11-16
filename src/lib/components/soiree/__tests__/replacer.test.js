import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { replacer } from "../soireePins.js";

// ScrollTrigger simulé : garde ses écouteurs « refresh »
function faux() {
  const ecoute = new Set();
  return {
    addEventListener: (_, f) => ecoute.add(f),
    removeEventListener: (_, f) => ecoute.delete(f),
    refresh: () => ecoute.forEach((f) => f()),
    ecoute,
  };
}

function monde() {
  const gestes = {};
  const cible = { scrollIntoView: vi.fn() };
  vi.stubGlobal("document", {
    getElementById: (id) => (id === "offres" ? cible : null),
  });
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("addEventListener", (g, f) => (gestes[g] = f));
  vi.stubGlobal("removeEventListener", (g) => delete gestes[g]);
  return { cible, gestes };
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("replacer", () => {
  it("repose l'ancre à chaque recalcul tardif de l'épinglage", () => {
    const { cible } = monde();
    const st = faux();
    replacer(null, "#offres", st);
    st.refresh();
    st.refresh();
    expect(cible.scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("s'arrête dès que le visiteur fait défiler lui-même", () => {
    const { cible, gestes } = monde();
    const st = faux();
    replacer(null, "#offres", st);
    gestes.wheel();
    st.refresh();
    expect(cible.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(st.ecoute.size).toBe(0);
  });

  it("s'arrête au bout de 5 s", () => {
    vi.useFakeTimers();
    const { cible } = monde();
    const st = faux();
    replacer(null, "#offres", st);
    vi.advanceTimersByTime(5000);
    st.refresh();
    expect(cible.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("retour arrière : repose la position notée", () => {
    monde();
    const st = faux();
    replacer(1234, "", st);
    st.refresh();
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 1234,
      behavior: "instant",
    });
  });

  it("sans ancre ni position : n'écoute rien", () => {
    monde();
    const st = faux();
    replacer(null, "", st);
    expect(st.ecoute.size).toBe(0);
  });

  it("démontage : la fonction rendue retire tous les écouteurs", () => {
    const { cible, gestes } = monde();
    const st = faux();
    const lacher = replacer(null, "#offres", st);
    lacher();
    st.refresh();
    expect(cible.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(st.ecoute.size).toBe(0);
    expect(Object.keys(gestes)).toEqual([]);
  });

  it("ancre mal formée : ne lève pas", () => {
    monde();
    expect(() => replacer(null, "#%E0%", faux())).not.toThrow();
  });
});
