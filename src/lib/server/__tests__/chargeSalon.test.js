import { describe, it, expect } from "vitest";
import {
  assertCibleAutorisee,
  lireArgs,
  percentile,
  verdict,
} from "../../../../scripts/charge-salon-outils.mjs";

const STAGING = "https://ieuknbblonybkiqknonn.supabase.co";
const DEV = "https://zik-dev-dev-developpement.up.railway.app";

describe("test de charge : garde-fous", () => {
  it("accepte le staging et le local", () => {
    expect(() => assertCibleAutorisee(DEV, STAGING)).not.toThrow();
    expect(() =>
      assertCibleAutorisee("http://localhost:3000", STAGING),
    ).not.toThrow();
  });

  it.each([
    "https://www.zik-music.fr",
    "https://zik-music.fr",
    "https://zik-dev-dev-developpement.up.railway.app.evil.fr",
    "http://localhost@www.zik-music.fr",
  ])("refuse %s", (url) => {
    expect(() => assertCibleAutorisee(url, STAGING)).toThrow(/Cible refusée/);
  });

  it("refuse un .env qui ne pointe pas sur le staging", () => {
    expect(() =>
      assertCibleAutorisee(DEV, "https://fbeubmwhxytniohodlgr.supabase.co"),
    ).toThrow(/staging/);
  });

  it("refuse localhost avec un .env de prod", () => {
    expect(() =>
      assertCibleAutorisee(
        "http://localhost:3000",
        "https://fbeubmwhxytniohodlgr.supabase.co",
      ),
    ).toThrow(/staging/);
  });

  it("renvoie l'origine vérifiée, pas l'adresse brute", () => {
    expect(assertCibleAutorisee(`${DEV}\\@www.zik-music.fr/..`, STAGING)).toBe(
      DEV,
    );
  });

  it("refuse une option mal tapée", () => {
    expect(() => lireArgs(["--joueur", "2000"])).toThrow(/inconnue/);
  });

  it("refuse des arguments invalides", () => {
    expect(() => lireArgs(["--joueurs", "abc"])).toThrow(/joueurs/);
    expect(() => lireArgs(["--manches", "2"])).toThrow(/manches/);
    expect(() => lireArgs(["--joueurs"])).toThrow(/invalide/);
    expect(() => lireArgs(["--deflate", "false"])).toThrow(/deflate/);
  });

  it("garde la compression sauf --deflate non", () => {
    expect(lireArgs([]).deflate).toBe(true);
    expect(lireArgs(["--deflate", "non"]).deflate).toBe(false);
  });
});

describe("percentile", () => {
  it("prend la bonne valeur, liste vide comprise", () => {
    const v = [5, 1, 4, 2, 3];
    expect(percentile(v, 50)).toBe(3);
    expect(percentile(v, 100)).toBe(5);
    expect(percentile([], 95)).toBeNull();
  });
});

describe("verdict", () => {
  const opts = { joueurs: 2, salons: 1, manches: 5 };
  const partie = (change = {}) => ({
    rejoints: [10, 20],
    podiums: [{ code: "ABC", rounds: 5, classes: 2, points: 30 }],
    finis: 2,
    coupures: [],
    erreurs: [],
    envoyes: 2,
    reponses: [10, 20],
    diffusion: [1, 2],
    lagMs: 40,
    ...change,
  });

  it("accepte une soirée complète", () => {
    expect(verdict(partie(), opts)).toEqual([]);
  });

  it("refuse une partie finie trop tôt", () => {
    const podiums = [{ code: "ABC", rounds: 2, classes: 2, points: 30 }];
    expect(verdict(partie({ podiums }), opts)).toContain(
      "salon ABC : 2/5 manches",
    );
  });

  it("refuse l'absence de mesures", () => {
    const motifs = verdict(partie({ diffusion: [], reponses: [] }), opts);
    expect(motifs).toContain("début de manche : aucune mesure");
    expect(motifs).toContain("réponse à un essai : aucune mesure");
  });

  it("refuse un salon à zéro point, même si un autre en a", () => {
    const podiums = [
      { code: "ABC", rounds: 5, classes: 1, points: 30 },
      { code: "DEF", rounds: 5, classes: 1, points: 0 },
    ];
    expect(verdict(partie({ podiums }), { ...opts, salons: 2 })).toEqual([
      "salon DEF : aucun point marqué",
    ]);
  });

  it.each([
    [{ rejoints: [10] }, "joueurs entrés : 1/2"],
    [{ podiums: [] }, "podiums : 0/1"],
    [
      { podiums: [{ code: "ABC", rounds: 5, classes: 1, points: 30 }] },
      "joueurs classés : 1/2",
    ],
    [{ finis: 1 }, "fins reçues : 1/2"],
    [{ coupures: ["TV"] }, "coupures : 1"],
    [{ erreurs: ["ETIMEDOUT"] }, "erreurs : 1"],
  ])("refuse %j", (change, motif) => {
    expect(verdict(partie(change), opts)).toContain(motif);
  });

  it("refuse des essais restés sans réponse", () => {
    expect(verdict(partie({ envoyes: 5 }), opts)).toContain(
      "essais sans réponse : 3",
    );
  });

  it("refuse une latence trop haute", () => {
    expect(verdict(partie({ diffusion: [5000] }), opts)).toContain(
      "début de manche : p95 au-dessus de 1000 ms",
    );
  });

  it("déclare non concluant un générateur saturé", () => {
    expect(verdict(partie({ lagMs: 900 }), opts)[0]).toMatch(/non concluantes/);
  });
});
