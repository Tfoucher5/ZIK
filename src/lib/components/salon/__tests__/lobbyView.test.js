import { describe, it, expect } from "vitest";
import {
  lobbyShown,
  lobbyView,
  prepShown,
  teamCap,
} from "../host/lobbyView.js";

const joueurs = (n, extra = () => ({})) =>
  Array.from({ length: n }, (_, i) => ({ username: `J${i}`, ...extra(i) }));
const equipes = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: i, name: `Équipe ${i}` }));

describe("lobby de la TV", () => {
  it("salle vide", () => {
    expect(lobbyView([], null)).toEqual({
      count: 0,
      teams: null,
      names: [],
      more: 0,
    });
  });

  it("un joueur", () => {
    const v = lobbyView([{ username: "Léa" }], null);
    expect(v.count).toBe(1);
    expect(v.names).toEqual([{ key: "Léa", name: "Léa" }]);
    expect(v.more).toBe(0);
  });

  it("500 joueurs : les derniers arrivés, le plus récent en tête, et « et N autres »", () => {
    const v = lobbyView(joueurs(500), null);
    expect(v.count).toBe(500);
    expect(v.names).toHaveLength(12);
    expect(v.names[0].key).toBe("J499");
    expect(v.names.at(-1).key).toBe("J488");
    expect(v.more).toBe(488);
  });

  it("16 équipes de 30 : nom et effectif seulement", () => {
    const v = lobbyView(
      joueurs(480, (i) => ({ team: i % 16 })),
      equipes(16),
    );
    expect(v.teams).toHaveLength(16);
    expect(v.cols).toBe(4);
    for (const t of v.teams) {
      expect(t.size).toBe(30);
      expect(t.names).toEqual([]);
      expect(t.more).toBe(30);
    }
  });

  it("au-delà de 16 équipes, la TV s'arrête à 16", () => {
    expect(lobbyView([], equipes(20)).teams).toHaveLength(16);
  });

  it("plafond de pseudos selon le nombre d'équipes", () => {
    expect([1, 3, 4, 5, 6, 7, 8, 9, 16].map(teamCap)).toEqual([
      6, 6, 4, 3, 3, 2, 2, 0, 0,
    ]);
    const v = lobbyView(
      joueurs(30, (i) => ({ team: i % 3 })),
      equipes(3),
    );
    expect(v.teams.map((t) => [t.names.length, t.more])).toEqual([
      [6, 4],
      [6, 4],
      [6, 4],
    ]);
  });

  it("pseudos de 20 caractères tronqués", () => {
    const v = lobbyView([{ username: "A".repeat(20) }], null);
    expect(v.names[0].name).toBe("A".repeat(13) + "…");
    expect(v.names[0].key).toBe("A".repeat(20));
  });

  it("les joueurs partis ne sont pas affichés", () => {
    const v = lobbyView(
      [
        { username: "Sam", team: 0 },
        { username: "Tom", team: 0, left: true },
      ],
      equipes(2),
    );
    expect(v.count).toBe(1);
    expect(v.teams[0]).toMatchObject({ size: 1, names: [{ key: "Sam" }] });
    expect(v.teams[1].size).toBe(0);
  });
});

describe("lobby affiché ou non", () => {
  it("en lobby et pendant le décompte", () => {
    expect(lobbyShown({ phase: "lobby" })).toBe(true);
    expect(lobbyShown({ phase: "starting" })).toBe(true);
    expect(lobbyShown({ phase: "round" })).toBe(false);
  });

  it("jamais par-dessus l'entracte ni un message de panne", () => {
    for (const etat of [
      { intermission: { endsAt: 1 } },
      { restarting: true },
      { restored: { resumeIn: null } },
      { connLost: true },
      { videoOutage: 5 },
    ])
      expect(
        lobbyShown({ phase: "lobby", ...etat }),
        JSON.stringify(etat),
      ).toBe(false);
  });
});

describe("Prépare la TV", () => {
  const tv = { joined: true, phase: "lobby", prepDone: false };

  it("affichée au premier lobby", () => {
    expect(prepShown(tv)).toBe(true);
  });

  it("sautée hors lobby : jamais par-dessus une partie", () => {
    for (const phase of ["starting", "round", "summary", "gameover"])
      expect(prepShown({ ...tv, phase })).toBe(false);
  });

  it("sautée une fois le code affiché, ou avant la connexion", () => {
    expect(prepShown({ ...tv, prepDone: true })).toBe(false);
    expect(prepShown({ ...tv, joined: false })).toBe(false);
  });
});
