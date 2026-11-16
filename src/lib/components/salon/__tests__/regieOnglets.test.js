import { describe, it, expect } from "vitest";
import { etatManche, resumeReglages, statutJoueur } from "../regie/onglets.js";

const manche = {
  phase: "round",
  paused: false,
  round: 4,
  maxRounds: 10,
  timerVal: 18,
  timerMax: 30,
  timerOn: true,
  joueurs: 7,
  repondu: 5,
  buzzer: null,
  nextSec: 0,
};

describe("onglet Direct : où en est la manche", () => {
  it("manche en cours : chrono, réponses, jauge", () => {
    expect(etatManche(manche)).toMatchObject({
      kicker: "Manche en cours · 4 / 10",
      titre: "18 s",
      sous: "5 sur 7 ont répondu",
      chrono: "18 s",
      p: 0.6,
    });
  });

  it("chrono pas encore lancé : pas de faux chiffre", () => {
    const e = etatManche({ ...manche, timerOn: false });
    expect(e.titre).toBe("Ça démarre");
    expect(e.chrono).toBe("");
    expect(e.p).toBe(0);
  });

  it("buzzer : le pseudo est dans le titre, pas dans le bouton", () => {
    const e = etatManche({ ...manche, buzzer: { username: "Sam" } });
    expect(e.titre).toBe("Sam a buzzé");
    expect(e.note).toBe("Sam répond à voix haute : à toi de trancher.");
  });

  it("pause, lancement", () => {
    expect(etatManche({ ...manche, paused: true }).titre).toBe("En pause");
    expect(
      etatManche({ ...manche, phase: "starting", startSec: 3 }),
    ).toMatchObject({ kicker: "Lancement", titre: "3 s" });
  });

  it("réponse affichée : décompte vers la manche suivante ou le podium", () => {
    const suite = { ...manche, phase: "summary", nextSec: 5 };
    expect(etatManche(suite)).toMatchObject({
      titre: "5 s",
      sous: "avant la manche 5",
      note: "La manche 5 démarre toute seule dans 5 secondes.",
    });
    expect(etatManche({ ...suite, round: 10 }).sous).toBe("avant le podium");
    expect(etatManche({ ...suite, nextSec: 0 }).note).toBe(
      "Touche « Manche suivante » pour lancer la manche 5.",
    );
  });
});

describe("onglet Réglages : résumé des quatre lignes", () => {
  const settings = {
    maxRounds: 10,
    roundDuration: 30,
    manualNext: false,
    answerMode: "multiple",
    specials: false,
    teams: [
      { id: 0, name: "Rouge" },
      { id: 1, name: "Bleue" },
      { id: 2, name: "Jaune" },
    ],
  };

  it("comme la maquette", () => {
    expect(
      resumeReglages(settings, ["Chanson française", "Années 80"]),
    ).toEqual({
      musique: "Chanson française, Années 80",
      manches: "10 manches · 30 s · suite automatique",
      reponses: "4 choix · sans manche spéciale",
      mode: "4 choix",
      equipes: "3 équipes : Rouge, Bleue, Jaune",
    });
  });

  it("chacun pour soi, buzzer, suite manuelle, beaucoup d'équipes", () => {
    const r = resumeReglages(
      { ...settings, teams: null, answerMode: "buzzer", manualNext: true },
      [],
    );
    expect(r.equipes).toBe("Chacun pour soi");
    expect(r.mode).toBe("Buzzer");
    expect(r.manches).toContain("suite quand tu cliques");
    expect(r.musique).toBe("Sélection en cours");
    const seize = Array.from({ length: 16 }, (_, id) => ({ id, name: "E" }));
    expect(resumeReglages({ ...settings, teams: seize }, []).equipes).toBe(
      "16 équipes",
    );
  });
});

describe("onglet Joueurs : pastille d'état", () => {
  it("a décroché, a quitté, a répondu, en attente, rien hors manche", () => {
    expect(statutJoueur({ offline: true }, "round").label).toBe("a décroché");
    expect(statutJoueur({ offline: true, left: true }, "lobby").label).toBe(
      "a quitté",
    );
    expect(statutJoueur({ answeredThisRound: true }, "round").cls).toBe("ok");
    expect(statutJoueur({}, "round").label).toBe("en attente");
    expect(statutJoueur({}, "summary")).toBeNull();
  });
});
