import { describe, it, expect } from "vitest";
import { topArtists, modeRules, artistFromRow } from "../room-content.js";

describe("artistFromRow", () => {
  it("prend l'artiste du catalogue tracks", () => {
    expect(
      artistFromRow({ custom_artist: null, tracks: { artist: "Ninho" } }),
    ).toBe("Ninho");
  });

  it("laisse custom_artist primer sur le catalogue", () => {
    expect(
      artistFromRow({
        custom_artist: "Ninho & Niska",
        tracks: { artist: "Ninho" },
      }),
    ).toBe("Ninho & Niska");
  });

  it("ignore un custom_artist vide", () => {
    expect(
      artistFromRow({ custom_artist: "", tracks: { artist: "PLK" } }),
    ).toBe("PLK");
  });

  it("renvoie null si la jointure tracks est absente", () => {
    expect(artistFromRow({ custom_artist: null, tracks: null })).toBe(null);
    expect(artistFromRow({})).toBe(null);
  });
});

describe("topArtists", () => {
  it("compte les titres par artiste et trie par fréquence", () => {
    const tracks = [
      { artist: "Booba" },
      { artist: "Nekfeu" },
      { artist: "Booba" },
      { artist: "Booba" },
      { artist: "Nekfeu" },
      { artist: "Orelsan" },
    ];
    expect(topArtists(tracks)).toEqual([
      { artist: "Booba", count: 3 },
      { artist: "Nekfeu", count: 2 },
      { artist: "Orelsan", count: 1 },
    ]);
  });

  it("départage les ex aequo par ordre alphabétique", () => {
    const tracks = [{ artist: "Zaho" }, { artist: "Alpha Wann" }];
    expect(topArtists(tracks).map((a) => a.artist)).toEqual([
      "Alpha Wann",
      "Zaho",
    ]);
  });

  it("ignore les artistes vides ou nuls", () => {
    const tracks = [
      { artist: "IAM" },
      { artist: "" },
      { artist: null },
      { artist: "   " },
    ];
    expect(topArtists(tracks)).toEqual([{ artist: "IAM", count: 1 }]);
  });

  it("normalise les espaces autour du nom", () => {
    const tracks = [{ artist: "NTM" }, { artist: " NTM " }];
    expect(topArtists(tracks)).toEqual([{ artist: "NTM", count: 2 }]);
  });

  it("limite le nombre de résultats", () => {
    const tracks = Array.from({ length: 20 }, (_, i) => ({ artist: `A${i}` }));
    expect(topArtists(tracks, 3)).toHaveLength(3);
  });

  it("renvoie un tableau vide si aucune donnée", () => {
    expect(topArtists([])).toEqual([]);
  });
});

describe("modeRules", () => {
  it("décrit le mode classique", () => {
    const r = modeRules("classic");
    expect(r.label).toBe("Mode Classique");
    expect(r.rules.length).toBeGreaterThan(0);
  });

  it("décrit le mode QCM", () => {
    const r = modeRules("qcm");
    expect(r.label).toBe("Mode QCM");
    expect(r.rules).not.toEqual(modeRules("classic").rules);
  });

  it("retombe sur le mode classique si le mode est inconnu ou absent", () => {
    expect(modeRules(undefined).label).toBe("Mode Classique");
    expect(modeRules("inexistant").label).toBe("Mode Classique");
  });
});
