// Équipes du mode salon. Le score d'une équipe est la moyenne de ses membres :
// une équipe de six ne bat pas une équipe de deux juste parce qu'elle est plus
// nombreuse (soirées de camping, bars : les tables n'ont jamais la même taille).

export const MAX_TEAMS = 8;
const DEFAULT_NAMES = [
  "Rouge",
  "Bleue",
  "Jaune",
  "Verte",
  "Violette",
  "Orange",
  "Turquoise",
  "Blanche",
];

/**
 * Construit la liste des équipes.
 *
 * `existantes` permet de conserver les noms déjà personnalisés : changer le
 * nombre d'équipes effaçait sinon tout ce que l'hôte avait saisi, puisque la
 * liste était reconstruite depuis les noms par défaut.
 */
export function makeTeams(count, existantes = null) {
  const n = Math.min(Math.max(Number(count) || 0, 0), MAX_TEAMS);
  if (n < 2) return null;
  const connues = new Map((existantes ?? []).map((t) => [t.id, t.name]));
  return Array.from({ length: n }, (_, id) => ({
    id,
    name: connues.get(id) ?? DEFAULT_NAMES[id],
  }));
}

export function cleanTeamName(name) {
  return String(name ?? "")
    .trim()
    .slice(0, 24);
}

// Équipe la moins remplie, pour qu'un nouvel arrivant ne déséquilibre rien
export function smallestTeam(teams, players) {
  if (!teams) return null;
  const sizes = teams.map((t) => players.filter((p) => p.team === t.id).length);
  return teams[sizes.indexOf(Math.min(...sizes))].id;
}

// Répartition à tour de rôle, dans l'ordre d'arrivée
export function spreadPlayers(teams, players) {
  players.forEach((p, i) => {
    p.team = teams ? teams[i % teams.length].id : null;
  });
}

export function teamStandings(teams, players) {
  if (!teams) return null;
  return teams
    .map((t) => {
      const members = players.filter((p) => p.team === t.id);
      const total = members.reduce((s, p) => s + p.score, 0);
      return {
        id: t.id,
        name: t.name,
        members: members.map((p) => p.username),
        total,
        score: members.length ? Math.round(total / members.length) : 0,
      };
    })
    .sort((a, b) => b.score - a.score || b.total - a.total);
}
