import { describe, it, expect } from "vitest";
import {
  forgetResume,
  markAutoResume,
  readResume,
  takeAutoResume,
} from "../resume.js";

const H = 60 * 60 * 1000;
const NOW = 100 * H;
const stockage = (v) => ({ getItem: (k) => v[k] ?? null });
const joue = {
  salon_code: "ABC123",
  salon_user: "Ana",
  salon_at: String(NOW - H),
  zik_salon_player_ABC123: "jeton",
};

describe("reprise de place sur le téléphone", () => {
  it("propose de reprendre après une partie récente, par QR code ou sans", () => {
    for (const url of ["", "ABC123"])
      expect(readResume(stockage(joue), url, NOW).resume).toEqual({
        code: "ABC123",
        username: "Ana",
      });
  });

  it("ne propose rien pour un autre salon, mais garde le pseudo", () => {
    const r = readResume(stockage(joue), "ZZZ999", NOW);
    expect(r).toEqual({ code: "ZZZ999", username: "Ana", resume: null });
  });

  it("ne propose rien après 12 h, sans jeton ou sans historique", () => {
    expect(readResume(stockage(joue), "", NOW + 12 * H)).toMatchObject({
      code: "",
      resume: null,
    });
    const sansJeton = { ...joue, zik_salon_player_ABC123: undefined };
    expect(readResume(stockage(sansJeton), "", NOW).resume).toBeNull();
    expect(readResume(stockage({}), "", NOW)).toEqual({
      code: "",
      username: "",
      resume: null,
    });
  });
});

describe("« Ce n'est pas moi »", () => {
  it("efface le jeton et le pseudo : plus de reprise proposée", () => {
    const v = { ...joue };
    const s = { getItem: (k) => v[k] ?? null, removeItem: (k) => delete v[k] };
    forgetResume(s, "ABC123");
    expect(v.zik_salon_player_ABC123).toBeUndefined();
    expect(readResume(s, "ABC123", NOW)).toEqual({
      code: "ABC123",
      username: "",
      resume: null,
    });
  });
});

describe("reprise sans appui après une relance automatique", () => {
  const session = () => {
    const v = {};
    return {
      v,
      getItem: (k) => v[k] ?? null,
      setItem: (k, x) => (v[k] = String(x)),
      removeItem: (k) => delete v[k],
    };
  };

  it("vaut une seule fois, pour ce salon", () => {
    const s = session();
    markAutoResume("ABC123", s, NOW);
    expect(takeAutoResume("ABC123", s, NOW + 1000)).toBe(true);
    expect(takeAutoResume("ABC123", s, NOW + 1000)).toBe(false);
  });

  it("ignore un marqueur expiré, d'un autre salon, illisible ou absent", () => {
    const s = session();
    markAutoResume("ABC123", s, NOW);
    expect(takeAutoResume("ABC123", s, NOW + 2 * 60 * 1000)).toBe(false);
    markAutoResume("ABC123", s, NOW);
    expect(takeAutoResume("ZZZ999", s, NOW)).toBe(false);
    expect(s.v.salon_auto_resume).toBeUndefined();
    expect(takeAutoResume("ABC123", s, NOW)).toBe(false);
    s.v.salon_auto_resume = "{pas du json";
    expect(takeAutoResume("ABC123", s, NOW)).toBe(false);
  });

  it("stockage bloqué ou absent : rien ne lève, carte « Re-bonjour »", () => {
    const bloque = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
    };
    expect(() => markAutoResume("ABC123", bloque, NOW)).not.toThrow();
    expect(takeAutoResume("ABC123", bloque, NOW)).toBe(false);
    expect(() => markAutoResume("ABC123", undefined, NOW)).not.toThrow();
    expect(takeAutoResume("ABC123", undefined, NOW)).toBe(false);
  });
});
