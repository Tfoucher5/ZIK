import { describe, it, expect, vi, afterEach } from "vitest";
import { watchConnection } from "../connection.js";

function fauxSocket() {
  const h = {};
  return { on: (e, f) => (h[e] = f), h };
}

afterEach(() => vi.useRealTimers());

describe("perte de connexion d'un écran", () => {
  it("signalée après le délai, effacée au retour", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("transport close");
    vi.advanceTimersByTime(2999);
    expect(etats).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(etats).toEqual([true]);
    s.h.connect();
    expect(etats).toEqual([true, false]);
  });

  it("micro-coupure : rien ne s'affiche", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("ping timeout");
    vi.advanceTimersByTime(1000);
    s.h.connect();
    vi.advanceTimersByTime(5000);
    expect(etats).toEqual([false]);
  });

  it("déconnexion voulue (quitter la soirée) : jamais signalée", () => {
    vi.useFakeTimers();
    const s = fauxSocket();
    const etats = [];
    watchConnection(s, (v) => etats.push(v), 3000, null);
    s.h.disconnect("io client disconnect");
    vi.advanceTimersByTime(10_000);
    expect(etats).toEqual([]);
  });
});

describe("réseau coupé annoncé par le navigateur", () => {
  it("signalé sans attendre que le serveur ne réponde plus", () => {
    vi.useFakeTimers();
    const s = { ...fauxSocket(), connected: true };
    const ecoute = {};
    const win = {
      addEventListener: (e, f) => (ecoute[e] = f),
      removeEventListener: (e) => delete ecoute[e],
    };
    const etats = [];
    const stop = watchConnection(s, (v) => etats.push(v), 3000, win);
    ecoute.offline();
    vi.advanceTimersByTime(3000);
    expect(etats).toEqual([true]);
    ecoute.online();
    expect(etats).toEqual([true, false]);
    stop();
    expect(ecoute).toEqual({});
  });
});
