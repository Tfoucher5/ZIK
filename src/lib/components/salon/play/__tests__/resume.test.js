import { describe, it, expect } from "vitest";
import { forgetResume, readResume } from "../resume.js";

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
