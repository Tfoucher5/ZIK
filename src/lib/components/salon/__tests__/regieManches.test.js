import { describe, it, expect } from "vitest";
import { manchesJouables, prepChecks } from "../regie/prep.js";
import { resumeReglages } from "../regie/onglets.js";

// Signalement du 21/11 : 3 titres pour 5 manches, la régie disait « Musique
// prête : 3 titres sur 3 » et la partie s'arrêtait net à la manche 3.
const fini = (total, missing = 0, spares = 0) => ({
  total,
  video: total - missing,
  audio: 0,
  missing,
  spares,
});
const musique = (settings, mediaCheck) =>
  prepChecks({
    screens: 1,
    tvSound: true,
    mediaCheck,
    players: [],
    teams: null,
    settings,
  }).checks.find((c) => c.id === "musique");

describe("manches jouables avant le lancement", () => {
  it("3 titres pour 5 manches : 3 manches, contrôle Musique en orange", () => {
    const s = { maxRounds: 5, rounds: 3 };
    expect(manchesJouables(s, fini(3))).toEqual({
      t: 3,
      m: 5,
      perdus: 0,
      court: true,
    });
    expect(musique(s, fini(3))).toEqual({
      id: "musique",
      etat: "non",
      titre: "3 titres pour 5 manches",
      detail: "La partie fera 3 manches. Pour en jouer 5, ajoute une playlist.",
    });
  });

  it("introuvables sans réserve : total déjà baissé par le serveur, la régie le dit", () => {
    const s = { maxRounds: 10, rounds: 8 };
    expect(manchesJouables(s, fini(10, 3, 1)).t).toBe(8);
    expect(musique(s, fini(10, 3, 1)).detail).toBe(
      "2 titres introuvables, sans titre de réserve. La partie fera 8 manches. Pour en jouer 10, ajoute une playlist.",
    );
  });

  it("introuvables remplacés par la réserve : rien ne change", () => {
    const s = { maxRounds: 10, rounds: 10 };
    expect(manchesJouables(s, fini(10, 2, 5)).court).toBe(false);
    expect(musique(s, fini(10, 2, 5)).etat).toBe("ok");
  });

  it("vérification en cours : comme avant, pas d'alerte", () => {
    const s = { maxRounds: 5, rounds: 3 };
    const enCours = { total: 3, video: 1, audio: 0, missing: 0, spares: 0 };
    expect(musique(s, enCours).etat).toBe("attente");
  });

  it("assez de titres : aucune alerte (pas de régression)", () => {
    const s = { maxRounds: 10, rounds: 10 };
    expect(manchesJouables(s, fini(10)).court).toBe(false);
    expect(musique(s, fini(10)).titre).toBe("Musique prête");
  });

  it("en partie après un titre tombé : pas de double soustraction (relecture)", () => {
    expect(manchesJouables({ maxRounds: 5, rounds: 2 }, fini(3, 1, 0)).t).toBe(
      2,
    );
  });

  it("une seule manche : singulier", () => {
    expect(musique({ maxRounds: 5, rounds: 1 }, fini(1)).titre).toBe(
      "1 titre pour 5 manches",
    );
  });

  it("ancien serveur sans `rounds` : le choix de l'organisateur", () => {
    expect(manchesJouables({ maxRounds: 5 }, null)).toMatchObject({
      t: 5,
      court: false,
    });
  });
});

describe("résumé des Réglages", () => {
  const s = { maxRounds: 5, roundDuration: 30, manualNext: false };
  it("donne le vrai total quand la sélection est trop courte", () => {
    expect(resumeReglages(s, [], 3).manches).toBe(
      "3 manches (3 titres) · 30 s · suite automatique",
    );
  });
  it("garde le choix quand il y a assez de titres", () => {
    expect(resumeReglages(s, [], null).manches).toBe(
      "5 manches · 30 s · suite automatique",
    );
  });
});
