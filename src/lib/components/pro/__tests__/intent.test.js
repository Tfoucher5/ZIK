import { describe, it, expect, vi } from "vitest";
import {
  INTENT_KEY,
  loadIntent,
  saveIntent,
  forgetIntent,
  readIntent,
  stepOf,
  backToRegie,
} from "../intent.js";

function store(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    m,
  };
}
const blocked = {
  getItem() {
    throw new Error("bloqué");
  },
  setItem() {
    throw new Error("bloqué");
  },
  removeItem() {
    throw new Error("bloqué");
  },
};
const T = 1_000_000_000;
const withKey = () => "cle";
const noKey = () => null;

describe("intention gardée une heure", () => {
  it("59 min gardée, 61 min oubliée", () => {
    const s = store();
    saveIntent(s, { plan: "night", salon: "KZ4P2M" }, T);
    expect(loadIntent(s, T + 59 * 60_000)).toEqual({
      plan: "night",
      salon: "KZ4P2M",
    });
    expect(loadIntent(s, T + 61 * 60_000)).toBeNull();
  });

  it("JSON cassé, valeurs étrangères : rien", () => {
    for (const raw of [
      "{pas du json",
      "null",
      "42",
      '"x"',
      "[]",
      JSON.stringify({ plan: "night", salon: "KZ4P2M" }),
      JSON.stringify({ plan: "night", at: "hier" }),
      JSON.stringify({ plan: "__proto__", salon: "<b>", at: T }),
      JSON.stringify({ plan: "toString", salon: 42, at: T }),
    ])
      expect(loadIntent(store({ [INTENT_KEY]: raw }), T), raw).toBeNull();
  });

  it("stockage bloqué : ne lève jamais", () => {
    expect(loadIntent(blocked, T)).toBeNull();
    expect(() => saveIntent(blocked, { plan: "night" }, T)).not.toThrow();
    expect(() => forgetIntent(blocked)).not.toThrow();
    expect(
      readIntent("?formule=night&salon=KZ4P2M", blocked, withKey, T),
    ).toEqual({ plan: "night", salon: "KZ4P2M" });
  });

  it("oublier efface", () => {
    const s = store();
    saveIntent(s, { plan: "night", salon: null }, T);
    forgetIntent(s);
    expect(loadIntent(s, T)).toBeNull();
  });
});

describe("arrivée par la régie", () => {
  it("formule et soirée lues dans l'URL, gardées pour la suite", () => {
    const s = store();
    expect(readIntent("?formule=night&salon=KZ4P2M", s, withKey, T)).toEqual({
      plan: "night",
      salon: "KZ4P2M",
    });
    expect(readIntent("", s, withKey, T + 1000)).toEqual({
      plan: "night",
      salon: "KZ4P2M",
    });
  });

  it("par « Voir les abonnements » : soirée sans formule", () => {
    expect(readIntent("?salon=KZ4P2M", store(), withKey, T)).toEqual({
      plan: null,
      salon: "KZ4P2M",
    });
  });

  it("formule inconnue : ignorée, la soirée reste", () => {
    for (const f of ["gratuit", "__proto__", "constructor", ""])
      expect(
        readIntent(`?formule=${f}&salon=KZ4P2M`, store(), withKey, T),
      ).toEqual({ plan: null, salon: "KZ4P2M" });
  });

  it("code invalide : pas de bloc, rien de gardé", () => {
    for (const c of ["kz4p2m", "AB", "A".repeat(13), "KZ4-P2", "__proto__"]) {
      const s = store();
      expect(readIntent(`?formule=night&salon=${c}`, s, withKey, T), c).toBe(
        null,
      );
      expect(s.m.size).toBe(0);
    }
  });

  it("sans clé de régie sur ce navigateur : pas de bloc", () => {
    const s = store();
    expect(readIntent("?formule=night&salon=KZ4P2M", s, noKey, T)).toBeNull();
    expect(s.m.size).toBe(0);
    saveIntent(s, { plan: "night", salon: "KZ4P2M" }, T);
    expect(readIntent("", s, noKey, T)).toBeNull();
  });

  it("sans régie : la formule choisie avant de se connecter revient", () => {
    const s = store();
    saveIntent(s, { plan: "monthly", salon: null }, T);
    expect(readIntent("", s, noKey, T)).toEqual({
      plan: "monthly",
      salon: null,
    });
  });
});

describe("étapes du bloc", () => {
  const u = { id: "u1" };
  it("suit le parcours", () => {
    expect(stepOf({ plan: null })).toBe("formule");
    expect(stepOf({ plan: "night" })).toBe("compte");
    expect(stepOf({ plan: "night", pendingEmail: "a@b.fr" })).toBe("mail");
    expect(stepOf({ plan: "night", user: u })).toBe("payer");
    expect(stepOf({ plan: "night", user: u, activated: true })).toBe("actif");
    expect(stepOf({ plan: null, user: u, activated: true })).toBe("actif");
    expect(stepOf({ plan: null, user: u })).toBe("formule");
  });
});

describe("retour sur la régie", () => {
  it("ferme l'onglet, sinon ouvre la régie ici", () => {
    vi.useFakeTimers();
    const win = { close: vi.fn(), location: { assign: vi.fn() } };
    backToRegie("KZ4P2M", win);
    expect(win.close).toHaveBeenCalled();
    vi.runAllTimers();
    expect(win.location.assign).toHaveBeenCalledWith(
      "/salon/regie?code=KZ4P2M",
    );
    vi.useRealTimers();
  });
});
