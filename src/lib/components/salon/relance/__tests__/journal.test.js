import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { knownSecrets, noteCrash, redact, sendCrash } from "../journal.js";
import { handleError } from "../../../../../hooks.client.js";

const local = (v) => ({
  getItem: (k) => v[k] ?? null,
  key: (i) => Object.keys(v)[i] ?? null,
  get length() {
    return Object.keys(v).length;
  },
});
const joueur = local({
  salon_user: "Ana",
  zik_salon_player_ABC123: "jeton-secret",
});
const envoi = (fetch) => JSON.parse(fetch.mock.calls[0][1].body);

describe("journal des plantages : rien de personnel", () => {
  it("retire les query strings et les valeurs connues", () => {
    const s = knownSecrets(joueur, "?code=ABC123&key=cle-regie");
    const t = redact(
      "Ana a planté sur https://zik/salon/regie?key=cle-regie:12:3 avec jeton-secret et cle-regie",
      s,
    );
    expect(t).not.toMatch(/Ana|jeton-secret|cle-regie|\?/);
    expect(t).toContain("/salon/regie:12:3");
  });

  it("masque aussi les clés de régie gardées par le navigateur", () => {
    const regie = local({ zik_salon_key_ABC123: "cle-de-regie-42" });
    const t = redact("boum cle-de-regie-42 ici", knownSecrets(regie, ""));
    expect(t).toBe("boum … ici");
  });

  it("mots entiers seulement : un pseudo court ne hache pas la pile", () => {
    const pile = "TypeError: at render (app.js:1:2) Al";
    expect(redact(pile, ["at", "Al"])).toBe(
      "TypeError: … render (app.js:1:2) …",
    );
    expect(redact("Éa Éaux a.b a.bc", ["Éa", "a.b"])).toBe("… Éaux … a.bc");
  });

  it("stockage ou adresse illisibles : on continue", () => {
    const bloque = {
      getItem() {
        throw new Error("SecurityError");
      },
    };
    expect(knownSecrets(bloque, "?key=k1")).toEqual(["k1"]);
    expect(redact(undefined)).toBe("");
    expect(redact({ toString: () => "x" })).toBe("x");
  });

  it("un seul envoi par plantage, tronqué, keepalive", () => {
    const fetch = vi.fn(() => Promise.resolve({ ok: true }));
    const error = new Error("a".repeat(400));
    error.stack = "b".repeat(2000);
    const p = { ecran: "regie", code: "ABC123", essai: 2, version: "3.34.0" };
    const deps = { fetch, local: joueur, search: "" };
    expect(sendCrash({ ...p, error }, deps)).toBe(true);
    expect(sendCrash({ ...p, error }, deps)).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/salon/crash");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    const b = envoi(fetch);
    expect(b).toMatchObject({ ecran: "regie", code: "ABC123", essai: 2 });
    expect(b.message).toHaveLength(300);
    expect(b.pile).toHaveLength(1500);
  });

  it.each([
    ["vide", ""],
    ["absent", undefined],
    ["minuscule", "abc123"],
    ["nombre", 1234],
    ["trop court", "AB"],
  ])("code %s : non envoyé", (_, code) => {
    const fetch = vi.fn(() => Promise.resolve({}));
    sendCrash(
      { ecran: "host", code, error: new Error(String(code)) },
      { fetch },
    );
    expect(envoi(fetch)).not.toHaveProperty("code");
  });

  it("fetch qui lève ou rejette : rien ne remonte", async () => {
    const lance = vi.fn(() => {
      throw new Error("hors ligne");
    });
    expect(() =>
      sendCrash({ ecran: "host", error: new Error("x") }, { fetch: lance }),
    ).not.toThrow();
    const rejette = vi.fn(() => Promise.reject(new Error("réseau")));
    sendCrash({ ecran: "host", error: new Error("y") }, { fetch: rejette });
    await Promise.resolve();
    expect(rejette).toHaveBeenCalledOnce();
  });
});

describe("hooks.client : handleError", () => {
  const ev = (pathname) => ({ url: new URL("https://zik" + pathname) });
  let console_;
  beforeEach(() => {
    console_ = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => console_.mockRestore());

  it("écrit toujours l'erreur en console, comme SvelteKit par défaut", () => {
    const e = new Error("partout");
    handleError({ error: e, event: ev("/") });
    handleError({ error: e, event: ev("/salon/host") });
    expect(console_).toHaveBeenCalledTimes(2);
    expect(console_).toHaveBeenCalledWith(e);
  });

  it("note l'exception brute d'un écran du salon (kit 2 et kit 3)", () => {
    const brute = new Error("brute");
    expect(handleError({ error: brute, event: ev("/salon/host") })).toBe(
      undefined,
    );
    const fetch = vi.fn(() => Promise.resolve({}));
    sendCrash({ ecran: "host", error: { message: "nettoyée" } }, { fetch });
    expect(envoi(fetch).message).toBe("brute");

    const kit3 = new Error("kit3");
    handleError({
      error: kit3,
      event: ev("/salon/play"),
      status: 500,
      message: "Internal Error",
    });
    const f2 = vi.fn(() => Promise.resolve({}));
    sendCrash({ ecran: "play", error: null }, { fetch: f2 });
    expect(envoi(f2).message).toBe("kit3");
  });

  it("ignore les autres pages", () => {
    handleError({ error: new Error("ailleurs"), event: ev("/salon/new") });
    handleError({ error: new Error("ailleurs"), event: ev("/") });
    const fetch = vi.fn(() => Promise.resolve({}));
    sendCrash({ ecran: "host", error: new Error("propre") }, { fetch });
    expect(envoi(fetch).message).toBe("propre");
  });

  it("ne lève jamais", () => {
    const piege = {
      get url() {
        throw new Error("piège");
      },
    };
    expect(() => handleError({ error: 1, event: piege })).not.toThrow();
    expect(() => handleError({})).not.toThrow();
    expect(() => handleError(undefined)).not.toThrow();
  });
});

describe("noteCrash", () => {
  it("garde la dernière exception notée", () => {
    noteCrash(new Error("une"));
    noteCrash(new Error("deux"));
    const fetch = vi.fn(() => Promise.resolve({}));
    sendCrash({ ecran: "regie" }, { fetch });
    expect(envoi(fetch).message).toBe("deux");
  });
});
