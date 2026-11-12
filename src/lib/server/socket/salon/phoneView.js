// À 2 000 joueurs, la liste complète pèse 100 Ko : envoyée à chaque téléphone
// jusqu'à une fois par seconde, elle saturait le serveur (compression) ou les
// téléphones (décodage). Un téléphone n'affiche que le podium, sa place,
// l'effectif et les dernières arrivées.

import { staff } from "./players.js";

const RECENT = 30;

// Classement trié vu d'un joueur : le podium, sa ligne avec sa place, l'effectif
export function ranker(list) {
  const at = new Map(list.map((p, i) => [p.username, i]));
  const top = list.slice(0, 3).map((p, i) => ({ ...p, rank: i + 1 }));
  return (username) => {
    const i = at.get(username);
    return {
      top,
      me: i === undefined ? null : { ...list[i], rank: i + 1 },
      count: list.length,
    };
  };
}

// Fin de manche : la place d'avant la manche, pour l'animation du classement
export function withPrevRank(scores) {
  const prev = [...scores].sort(
    (a, b) => b.score - (b.delta ?? 0) - (a.score - (a.delta ?? 0)),
  );
  const at = new Map(prev.map((p, i) => [p.username, i + 1]));
  return scores.map((p) => ({ ...p, prevRank: at.get(p.username) }));
}

export function phoneTeams(teams) {
  return (
    teams?.map(({ members, ...t }) => ({ ...t, size: members.length })) ?? null
  );
}

export function phoneNight(night) {
  if (!night) return null;
  const rank = ranker(night.players);
  return (username) => ({
    games: night.games,
    teams: phoneTeams(night.teams),
    ranking: rank(username),
  });
}

// Salle d'attente : effectif et dernières arrivées (partis exclus)
export function phoneRoster(players) {
  const here = players.filter((p) => !p.left);
  return {
    recent: here
      .slice(-RECENT)
      .map(({ username, team }) => ({ username, team })),
    count: here.length,
  };
}

// TV et régie reçoivent la liste complète, chaque téléphone sa propre vue
export function emitSplit(io, code, event, full, phone) {
  staff(code, io).emit(event, full);
  const ids = io.sockets.adapter.rooms.get(`salon:players:${code}`);
  for (const id of ids ?? []) {
    const s = io.sockets.sockets.get(id);
    if (s) s.emit(event, phone(s.salonUsername));
  }
}

// Podium de fin de partie : la TV garde tout (historique, soirée complète)
export function emitGameOver(io, code, over) {
  const rank = ranker(over.scores);
  const night = phoneNight(over.night);
  const teams = phoneTeams(over.teams);
  emitSplit(io, code, "salon_game_over", over, (u) => ({
    ranking: rank(u),
    teams,
    night: night?.(u) ?? null,
  }));
}

export function emitRoundEnd(io, code, summary) {
  const rank = ranker(withPrevRank(summary.scores));
  const phone = {
    ...summary,
    scores: undefined,
    teams: phoneTeams(summary.teams),
  };
  emitSplit(io, code, "salon_round_end", summary, (u) => ({
    ...phone,
    ranking: rank(u),
  }));
}
