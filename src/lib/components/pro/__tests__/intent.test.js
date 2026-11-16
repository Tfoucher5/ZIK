import { describe, it, expect, vi } from "vitest";
import {
  INTENT_KEY,
  loadIntent,
  saveIntent,
  forgetIntent,
  readIntent,
  stepOf,
  backToRegie,
  resendSignup,
  thanksRegie,
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

  it("date dans le futur : oubliée", () => {
    const s = store();
    saveIntent(s, { plan: "night", salon: "KZ4P2M" }, T + 10 * 3600_000);
    expect(loadIntent(s, T)).toBeNull();
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

describe("renvoi de l'e-mail de confirmation", () => {
  const opts = { origin: "https://www.zik-music.fr", captchaOn: true };

  it("Captcha actif sans jeton : aucun appel", async () => {
    const auth = { resend: vi.fn() };
    expect(await resendSignup(auth, "a@b.fr", { ...opts, token: null })).toBe(
      "Validez la vérification anti-robot.",
    );
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("jeton transmis, retour sur /pro", async () => {
    const auth = { resend: vi.fn(async () => ({ error: null })) };
    expect(await resendSignup(auth, "a@b.fr", { ...opts, token: "t" })).toBe(
      "E-mail renvoyé.",
    );
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.fr",
      options: {
        emailRedirectTo: "https://www.zik-music.fr/pro",
        captchaToken: "t",
      },
    });
  });

  it("Captcha absent : envoi sans jeton ; refus ou réseau coupé : message calme", async () => {
    const ok = { resend: vi.fn(async () => ({ error: null })) };
    await resendSignup(ok, "a@b.fr", { ...opts, captchaOn: false });
    expect(ok.resend.mock.calls[0][0].options.captchaToken).toBeUndefined();
    for (const resend of [
      async () => ({ error: { message: "rate limit" } }),
      async () => {
        throw new Error("Failed to fetch");
      },
    ])
      expect(
        await resendSignup({ resend }, "a@b.fr", { ...opts, token: "t" }),
      ).toBe("Envoi impossible pour le moment, réessayez dans une minute.");
  });
});

describe("merci : retour possible sur la régie", () => {
  const avec = () => {
    const s = store();
    saveIntent(s, { plan: "night", salon: "KZ4P2M" });
    return s;
  };

  it("soirée encore ouverte : la régie", async () => {
    const f = vi.fn(async () => ({ status: 200 }));
    expect(await thanksRegie(avec(), f)).toBe("KZ4P2M");
    expect(f).toHaveBeenCalledWith("/api/salon?code=KZ4P2M");
  });

  it("soirée finie (404), réseau coupé, pas d'intention : page normale", async () => {
    expect(await thanksRegie(avec(), async () => ({ status: 404 }))).toBeNull();
    expect(
      await thanksRegie(avec(), async () => {
        throw new Error("Failed to fetch");
      }),
    ).toBeNull();
    const f = vi.fn();
    expect(await thanksRegie(store(), f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
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
