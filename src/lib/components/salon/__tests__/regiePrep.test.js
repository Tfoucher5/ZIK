import { describe, it, expect } from "vitest";
import { prepChecks, videsTexte } from "../regie/prep.js";

const base = {
  screens: 1,
  tvSound: true,
  mediaCheck: { total: 10, video: 10, audio: 0, missing: 0 },
  players: [],
  teams: null,
};
const etat = (patch, id) =>
  prepChecks({ ...base, ...patch }).checks.find((c) => c.id === id);
const teams = [
  { id: 0, name: "Rouge" },
  { id: 1, name: "Bleue" },
  { id: 2, name: "Jaune" },
];

describe("checklist d'avant-partie de la régie", () => {
  it("écran TV : en recherche, absent, connecté, en double", () => {
    expect(etat({ screens: null }, "tv").etat).toBe("attente");
    expect(etat({ screens: 0 }, "tv")).toMatchObject({
      etat: "non",
      titre: "Aucun écran TV connecté",
    });
    expect(etat({ screens: 1 }, "tv")).toMatchObject({
      etat: "ok",
      titre: "TV connectée",
    });
    expect(etat({ screens: 2 }, "tv")).toMatchObject({
      etat: "non",
      titre: "2 écrans TV ouverts",
    });
  });

  it("son : testé, pas de son, pas encore testé (morceau serveur absent)", () => {
    expect(etat({ tvSound: true }, "son").etat).toBe("ok");
    expect(etat({ tvSound: false }, "son").etat).toBe("non");
    expect(etat({ tvSound: null }, "son").titre).toBe("Son pas encore testé");
    expect(etat({ tvSound: undefined }, "son").etat).toBe("attente");
  });

  it("son : un test d'une TV fermée ne compte plus", () => {
    expect(etat({ screens: 0, tvSound: true }, "son").etat).toBe("attente");
  });

  it("musique : rien, en cours, prête, extraits, peu de clips", () => {
    expect(etat({ mediaCheck: null }, "musique").etat).toBe("attente");
    expect(
      etat(
        { mediaCheck: { total: 10, video: 5, audio: 1, missing: 0 } },
        "musique",
      ),
    ).toMatchObject({ etat: "attente", detail: "6 / 10" });
    expect(etat({}, "musique")).toMatchObject({
      etat: "ok",
      titre: "Musique prête",
      detail: "10 titres sur 10",
    });
    expect(
      etat(
        { mediaCheck: { total: 10, video: 8, audio: 1, missing: 1 } },
        "musique",
      ),
    ).toMatchObject({
      etat: "ok",
      detail: "8 titres sur 10 en vidéo, 1 en extrait audio, 1 remplacé",
    });
    expect(
      etat(
        { mediaCheck: { total: 10, video: 3, audio: 7, missing: 0 } },
        "musique",
      ).etat,
    ).toBe("non");
  });

  it("joueurs : aucun, puis présents, sans compter les partis", () => {
    expect(etat({}, "joueurs")).toMatchObject({
      etat: "attente",
      titre: "Aucun joueur",
    });
    const p = prepChecks({
      ...base,
      players: [{ username: "a" }, { username: "b", left: true }],
    });
    expect(p.joueurs).toBe(1);
    expect(p.checks[3]).toMatchObject({
      etat: "ok",
      titre: "1 joueur connecté",
    });
  });

  it("équipes : effectif par équipe et alerte d'équipe vide", () => {
    const p = prepChecks({
      ...base,
      teams,
      players: [
        { username: "a", team: 0 },
        { username: "b", team: 0 },
        { username: "c", team: 1 },
        { username: "d", team: 2, left: true },
      ],
    });
    expect(p.equipes.map((e) => e.size)).toEqual([2, 1, 0]);
    expect(p.vides).toEqual(["Jaune"]);
    expect(videsTexte(p.vides)).toBe("L'équipe Jaune est vide.");
  });

  it("équipes : compte les joueurs qui n'ont pas encore choisi", () => {
    const p = prepChecks({
      ...base,
      teams,
      players: [
        { username: "a", team: 0 },
        { username: "b", team: null },
        { username: "c" },
        { username: "d", left: true },
      ],
    });
    expect(p.sansEquipe).toBe(2);
    expect(p.vides).toEqual(["Bleue", "Jaune"]);
  });

  it("équipes : pas d'alerte tant que personne n'est arrivé", () => {
    expect(prepChecks({ ...base, teams }).vides).toEqual([]);
  });

  it("chacun pour soi : pas d'équipes", () => {
    const p = prepChecks({ ...base, players: [{ username: "a" }] });
    expect(p.equipes).toBeNull();
    expect(p.vides).toEqual([]);
  });

  it("plusieurs équipes vides au pluriel", () => {
    expect(videsTexte(["Jaune", "Verte", "Orange"])).toBe(
      "Les équipes Jaune, Verte et Orange sont vides.",
    );
  });
});
