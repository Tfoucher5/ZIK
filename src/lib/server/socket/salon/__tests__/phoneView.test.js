import { describe, it, expect } from "vitest";
import {
  emitSplit,
  phoneNight,
  phoneRoster,
  phoneTeams,
  ranker,
  withPrevRank,
} from "../phoneView.js";

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

  it("TV et régie reçoivent tout, chaque téléphone sa vue", () => {
    const envois = [];
    const tel = (id, nom) => ({
      salonUsername: nom,
      emit: (ev, d) => envois.push({ id, ev, d }),
    });
    const io = {
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
    emitSplit(io, "C", "ev", { tout: 1 }, (u) => ({ moi: u }));
    expect(envois).toEqual([
      { id: ["salon:screens:C", "salon:ctrl:C"], ev: "ev", d: { tout: 1 } },
      { id: "s1", ev: "ev", d: { moi: "alice" } },
      { id: "s2", ev: "ev", d: { moi: "bob" } },
    ]);
  });
});
