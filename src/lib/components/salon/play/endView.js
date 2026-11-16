import { ord, pts } from "./podiumStory.js";

const MEDALS = ["or", "ar", "br"];
const points = (n) => `${pts(n)} point${n > 1 ? "s" : ""}`;

// Écart avec le voisin le plus parlant : le 2e pour le vainqueur, celui
// juste devant pour le podium, la 3e place au-delà
function gap(me, others, rank) {
  const other = others[rank === 1 ? 1 : rank > 3 ? 2 : rank - 2];
  if (!other) return null;
  const d = Math.abs(me.score - other.score);
  if (!d) return `À égalité avec ${other.name}.`;
  if (rank === 1) return `${points(d)} devant ${other.name}.`;
  if (rank > 3) return `Le podium était à ${points(d)}.`;
  return `À ${points(d)} de ${other.name}.`;
}

// Téléphone en fin de partie : sa place (ou celle de son équipe), avec
// finalRanking { top, me, count } et teams déjà reçus
export function endView({ finalRanking, teams, myTeam, night }) {
  const i = teams?.length ? teams.findIndex((t) => t.id === myTeam) : -1;
  const team = i >= 0;
  const me = finalRanking?.me;
  const rank = team ? i + 1 : (me?.rank ?? 0);
  const others = team
    ? teams.map((t) => ({ name: t.name, score: t.score }))
    : (finalRanking?.top ?? []).map((p) => ({
        name: p.username,
        score: p.score,
      }));
  const score = team ? teams[i].score : me?.score;
  let title = "Fin de partie";
  if (rank === 1) title = team ? "Ton équipe gagne !" : "Tu gagnes !";
  else if (rank && team) title = `Ton équipe finit ${ord(rank)}`;
  else if (rank) title = `${ord(rank)} sur ${finalRanking.count}`;
  return {
    rank,
    team,
    title,
    medal: MEDALS[rank - 1] ?? null,
    score: rank ? `${pts(score)} pts` : null,
    gap: rank ? gap({ score }, others, rank) : null,
    night: nightPlace(night, myTeam),
  };
}

// Soirée de plusieurs parties : la place au cumul
function nightPlace(night, myTeam) {
  if (!(night?.games > 1)) return null;
  const rank = night.teams
    ? night.teams.findIndex((t) => t.id === myTeam) + 1
    : (night.ranking?.me?.rank ?? 0);
  if (!rank) return null;
  return {
    games: night.games,
    team: !!night.teams,
    place: `${ord(rank)} place`,
    count: night.teams ? null : night.ranking.count,
  };
}
