import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recordClientCrash } from "../clientCrash.js";

const nominal = {
  ecran: "host",
  code: "ABC234",
  essai: 2,
  message: "Cannot read properties of undefined",
  pile: "TypeError: x\n    at a (app.js:1:2)",
  version: "3.33.0",
};
let t = Date.UTC(2026, 10, 23);
let ipN = 0;
const ip = () => `10.0.0.${++ipN}`;
const noter = (payload, from = ip()) =>
  recordClientCrash(payload, { ip: from, userAgent: "Mozilla/5.0 Test" });

let errSpy;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  t += 300_000;
  vi.setSystemTime(t);
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errSpy.mockRestore();
  vi.useRealTimers();
});

describe("recordClientCrash", () => {
  it("cas nominal : une entrée, ligne d'en-tête, pile, version, navigateur", () => {
    expect(noter(nominal)).toBe(true);
    expect(errSpy).toHaveBeenCalledTimes(1);
    const [ligne, ...suite] = errSpy.mock.calls[0][0].split("\n");
    expect(ligne).toBe(
      "[ecran-salon] host ABC234 essai 2 : Cannot read properties of undefined",
    );
    expect(suite).toEqual([
      "    TypeError: x",
      "    at a (app.js:1:2)",
      "    version : 3.33.0",
      "    navigateur : Mozilla/5.0 Test",
    ]);
  });

  it("code absent : écrit avec un tiret", () => {
    expect(noter({ ecran: "play", essai: 1, message: "boum" })).toBe(true);
    expect(errSpy.mock.calls[0][0]).toBe(
      "[ecran-salon] play - essai 1 : boum\n    navigateur : Mozilla/5.0 Test",
    );
  });

  it.each([
    ["null", null],
    ["tableau", [nominal]],
    ["chaîne", "boum"],
    ["écran inconnu", { ...nominal, ecran: "admin" }],
    ["écran hérité", { ...nominal, ecran: "toString" }],
    ["code __proto__", { ...nominal, code: "__proto__" }],
    ["code minuscule", { ...nominal, code: "abc234" }],
    ["code avec retour", { ...nominal, code: "ABC\n234" }],
    ["code nombre", { ...nominal, code: 1234 }],
    ["essai texte", { ...nominal, essai: "2" }],
    ["essai décimal", { ...nominal, essai: 1.5 }],
    ["essai zéro", { ...nominal, essai: 0 }],
    ["message absent", { ...nominal, message: undefined }],
    ["message objet", { ...nominal, message: { a: 1 } }],
    ["message géant", { ...nominal, message: "x".repeat(20_001) }],
    ["pile géante", { ...nominal, pile: "x".repeat(50_001) }],
    ["version nombre", { ...nominal, version: 3 }],
  ])("refuse sans écrire : %s", (_, payload) => {
    expect(noter(payload)).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("refuse un JSON avec __proto__ propre", () => {
    expect(noter(JSON.parse('{"__proto__":{"ecran":"host"}}'))).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it("retours à la ligne injectés : aucune fausse ligne de journal", () => {
    noter({
      ...nominal,
      message: "a\n[ecran-salon] regie FAUX essai 1 : b\r\u2028c",
      pile: "p1\r\n[ecran-salon] faux",
      version: "1\n2",
    });
    const lignes = errSpy.mock.calls[0][0].split("\n");
    expect(lignes[0]).toBe(
      "[ecran-salon] host ABC234 essai 2 : a [ecran-salon] regie FAUX essai 1 : b c",
    );
    expect(lignes.slice(1).every((l) => l.startsWith("    "))).toBe(true);
    expect(lignes).toContain("    version : 1 2");
  });

  it("tronque message 300, pile 1500, version 40, navigateur 200", () => {
    recordClientCrash(
      {
        ...nominal,
        message: "m".repeat(5000),
        pile: "p".repeat(5000),
        version: "v".repeat(500),
      },
      { ip: ip(), userAgent: "u".repeat(5000) },
    );
    const [ligne, pile, version, nav] = errSpy.mock.calls[0][0].split("\n");
    expect(ligne.split(" : ")[1]).toHaveLength(300);
    expect(pile.trim()).toHaveLength(1500);
    expect(version).toBe(`    version : ${"v".repeat(40)}`);
    expect(nav).toBe(`    navigateur : ${"u".repeat(200)}`);
  });

  it("navigateur absent : rien ne casse", () => {
    expect(recordClientCrash(nominal, { ip: ip(), userAgent: null })).toBe(
      true,
    );
  });

  it("6 par minute et par IP, puis 429 ; les invalides comptent", () => {
    const from = ip();
    noter(null, from);
    for (let i = 0; i < 5; i++) expect(noter(nominal, from)).toBe(true);
    expect(() => noter(nominal, from)).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    expect(errSpy).toHaveBeenCalledTimes(5);
    vi.setSystemTime(t + 61_000);
    expect(noter(nominal, from)).toBe(true);
  });

  it("60 par minute au total, puis 429 ; les invalides ne comptent pas", () => {
    noter(null);
    for (let i = 0; i < 60; i++) expect(noter(nominal)).toBe(true);
    expect(() => noter(nominal)).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    expect(errSpy).toHaveBeenCalledTimes(60);
  });
});
