import { describe, it, expect } from "vitest";
import {
  emitRoundEnd,
  emitSplit,
  phoneNight,
  phoneRoster,
  phoneTeams,
  ranker,
  withPrevRank,
} from "../phoneView.js";

// TV et régie via io.to, téléphones alice (s1) et bob (s2) un par un
const ioFactice = (envois) => {
  const tel = (id, nom) => ({
    salonUsername: nom,
    emit: (ev, d) => envois.push({ id, ev, d }),
  });
  return {
    to: (cible) => ({
      emit: (ev, d) => envois.push({ id: cible, ev, d }),
    }),
    sockets: {
      adapter: {
        rooms: new Map([["salon:players:C", new Set(["s1", "s2", "parti"])]]),
      },
      sockets: new Map([
        ["s1", tel("s1", "alice")],
        ["s2", tel("s2", "bob")],
      ]),
    },
  };
};

const joueurs = (n) =>
  Array.from({ length: n }, (_, i) => ({
    username: `j${i}`,
    score: (n - i) * 10,
    team: i % 2,
  }));

describe("vue téléphone", () => {
  it("podium, sa ligne avec sa place, l'effectif", () => {
    const rank = ranker(joueurs(2000));
    const v = rank("j1500");
    expect(v.top.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(v.me).toMatchObject({ username: "j1500", rank: 1501 });
    expect(v.count).toBe(2000);
    expect(JSON.stringify(v).length).toBeLessThan(500);
    expect(rank("inconnu").me).toBeNull();
  });

  it("place d'avant la manche, pour l'animation", () => {
    const fin = withPrevRank([
      { username: "a", score: 30, delta: 30 },
      { username: "b", score: 20, delta: 0 },
    ]);
    expect(fin.map((p) => p.prevRank)).toEqual([2, 1]);
  });

  it("équipes sans la liste des membres", () => {
    const t = phoneTeams([{ id: 0, name: "A", members: ["x", "y"], score: 3 }]);
    expect(t).toEqual([{ id: 0, name: "A", size: 2, score: 3 }]);
    expect(phoneTeams(null)).toBeNull();
  });

  it("salle d'attente : 30 dernières arrivées, partis exclus", () => {
    const liste = [...joueurs(100), { username: "parti", left: true }];
    const r = phoneRoster(liste);
    expect(r.count).toBe(100);
    expect(r.recent).toHaveLength(30);
    expect(r.recent.at(-1)).toEqual({ username: "j99", team: 1 });
  });

  it("« Une autre ! » : un nombre, partis exclus, jamais les noms", () => {
    const liste = [
      ...joueurs(3).map((p, i) => ({ ...p, encore: i < 2 })),
      { username: "parti", left: true, encore: true },
    ];
    const r = phoneRoster(liste);
    expect(r.encore).toBe(2);
    expect(r.recent.every((p) => !("encore" in p))).toBe(true);
  });

  it("soirée : rang de chacun sans la liste", () => {
    const n = phoneNight({ games: 2, players: joueurs(5), teams: null })("j4");
    expect(n).toEqual({
      games: 2,
      teams: null,
      ranking: expect.objectContaining({ count: 5 }),
    });
    expect(n.ranking.me.rank).toBe(5);
    expect(phoneNight(null)).toBeNull();
  });

  it("fin de manche QCM : chaque téléphone sa case, jamais celle des autres", () => {
    const envois = [];
    const io = ioFactice(envois);
    const summary = {
      answer: "X - Y",
      correctChoiceIndex: 1,
      scores: [
        { username: "alice", score: 10, delta: 10 },
        { username: "bob", score: 0, delta: 0 },
      ],
      teams: null,
    };
    const players = { alice: { _choiceIndex: 1 }, bob: { _choiceIndex: 3 } };
    emitRoundEnd(io, "C", summary, players);
    const vue = (id) => envois.find((e) => e.id === id).d;
    expect(vue("s1").chosenIndex).toBe(1);
    expect(vue("s2").chosenIndex).toBe(3);
    expect(JSON.stringify(vue("s1"))).not.toContain('"chosenIndex":3');
    expect(vue("s1").scores).toBeUndefined();
    expect(envois[0].d).not.toHaveProperty("chosenIndex");
  });

  it("fin de manche : sans réponse comptée, null ; hors QCM, pas de champ", () => {
    const envois = [];
    const summary = { scores: [], teams: null, correctChoiceIndex: 0 };
    emitRoundEnd(ioFactice(envois), "C", summary, {});
    expect(envois[1].d.chosenIndex).toBeNull();
    envois.length = 0;
    const texte = { scores: [], teams: null, correctChoiceIndex: undefined };
    emitRoundEnd(ioFactice(envois), "C", texte, {});
    expect(envois[1].d).not.toHaveProperty("chosenIndex");
  });

  it("TV et régie reçoivent tout, chaque téléphone sa vue", () => {
    const envois = [];
    emitSplit(ioFactice(envois), "C", "ev", { tout: 1 }, (u) => ({ moi: u }));
    expect(envois).toEqual([
      { id: ["salon:screens:C", "salon:ctrl:C"], ev: "ev", d: { tout: 1 } },
      { id: "s1", ev: "ev", d: { moi: "alice" } },
      { id: "s2", ev: "ev", d: { moi: "bob" } },
    ]);
  });
});
