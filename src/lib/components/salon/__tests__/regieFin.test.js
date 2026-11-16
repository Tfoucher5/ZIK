import { describe, it, expect, vi } from "vitest";
import { finTete, encore, heure } from "../regie/fin.js";

vi.mock("../../../client/salonClient.js", () => ({ forgetSalon: () => {} }));
const { listenRegie } = await import("../regie/regieEvents.js");

function regie() {
  const handlers = {};
  const r = { onglet: "joueurs", history: [], players: [] };
  listenRegie(r, { on: (evt, fn) => (handlers[evt] = fn), emit: () => {} });
  return { r, h: handlers };
}

describe("régie : événements de fin de partie", () => {
  it("le QR en grand suit le serveur, absent = fermé", () => {
    const { r, h } = regie();
    h.salon_evening({ intermission: null, finale: null, qr: true });
    expect(r.qrBig).toBe(true);
    h.salon_evening({ intermission: null, finale: null });
    expect(r.qrBig).toBe(false);
  });

  it("fin de partie : la régie reste sur l'onglet ouvert", () => {
    const { r, h } = regie();
    h.salon_game_over({ teams: null, night: null });
    expect(r.phase).toBe("gameover");
    expect(r.onglet).toBe("joueurs");
  });

  it("partie suivante : la régie passe au lancement, plus à « Partie terminée »", () => {
    const { r, h } = regie();
    r.mergeRoster = () => {};
    r.phase = "gameover";
    r.history = [{ answer: "A - 1" }];
    h.salon_restarted({ players: [] });
    expect(r).toMatchObject({ phase: "starting", round: 0, history: [] });
  });

  it("titre remplacé : barré sous sa manche", () => {
    const { r, h } = regie();
    r.history = [{ answer: "A - 1" }, { answer: "B - 2" }];
    h.salon_replaced({ round: 2, replaced: "C - 3" });
    expect(r.history).toEqual([
      { answer: "A - 1" },
      { answer: "B - 2", replaced: "C - 3" },
    ]);
  });
});

const j = (username, score, extra = {}) => ({ username, score, ...extra });
const base = {
  players: [j("Sam", 900), j("Léa", 1520), j("Tom", 300, { left: true })],
  teams: null,
  rounds: 10,
  night: null,
  intermission: null,
  finale: null,
};

describe("régie de fin de partie : l'en-tête", () => {
  it("chacun pour soi : le vainqueur, ses points, l'effectif présent", () => {
    const t = finTete(base);
    expect(t.kicker).toBe("Partie terminée · 10 manches");
    expect(t.titre).toBe("Léa gagne");
    expect(t.sous).toMatch(/^1\s520 pts · 2 joueurs$/);
    expect(t.tv).toBe(
      "Le podium, le classement et le code pour les retardataires.",
    );
  });

  it("égalité en tête, personne n'a marqué", () => {
    const egal = finTete({ ...base, players: [j("Sam", 50), j("Léa", 50)] });
    expect(egal.titre).toBe("Égalité");
    expect(egal.sous).toContain("Sam et Léa");
    const zero = finTete({ ...base, players: [j("Sam", 0)], rounds: 1 });
    expect(zero).toMatchObject({
      kicker: "Partie terminée · 1 manche",
      titre: "Partie terminée",
      sous: "1 joueur",
    });
  });

  it("en équipes : l'équipe en tête et sa moyenne", () => {
    const teams = [
      { id: 0, name: "Rouge", score: 377 },
      { id: 1, name: "Bleue", score: 220 },
    ];
    expect(finTete({ ...base, teams })).toMatchObject({
      titre: "Rouge gagne",
      sous: "377 pts en moyenne · 2 joueurs",
    });
    const vides = teams.map((t) => ({ ...t, score: 0 }));
    expect(finTete({ ...base, teams: vides }).titre).toBe("Partie terminée");
  });

  it("entracte avec ou sans heure de reprise", () => {
    const until = new Date(2026, 10, 16, 22, 15).getTime();
    expect(finTete({ ...base, intermission: { until } })).toMatchObject({
      titre: "Entracte",
      sous: "Reprise affichée vers 22 h 15",
    });
    expect(finTete({ ...base, intermission: { until: null } }).sous).toBe(
      "Sans heure de reprise",
    );
    expect(heure(until)).toBe("22 h 15");
  });

  it("podium de la soirée : qui gagne la soirée", () => {
    const night = { games: 3, players: [j("Sam", 3000)], teams: null };
    expect(finTete({ ...base, night, finale: night })).toMatchObject({
      kicker: "Fin de la soirée · 3 parties",
      titre: "Podium à l'écran",
      sous: "Sam gagne la soirée",
    });
    const sansTambour = finTete({
      ...base,
      night,
      finale: night,
      tambour: false,
    });
    expect(sansTambour.tv).toBe(
      "Le 3e, le 2e, puis le vainqueur. Bravo pour la soirée !",
    );
  });
});

describe("« Une autre ! »", () => {
  it("compte les demandes parmi les joueurs encore là", () => {
    const players = [
      j("A", 0, { encore: true }),
      j("B", 0),
      j("C", 0, { encore: true, left: true }),
      j("D", 0, { encore: true }),
    ];
    expect(encore(players)).toEqual({ n: 2, sur: 3, p: 2 / 3 });
    expect(encore([])).toEqual({ n: 0, sur: 0, p: 0 });
  });
});
