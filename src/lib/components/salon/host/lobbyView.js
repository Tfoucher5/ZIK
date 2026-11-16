// Ce que le lobby de la TV affiche, lisible à 5 m même avec une salle pleine :
// les derniers arrivés seulement, « et N autres » pour le reste.
const MAX_TEAMS = 16;
const SOLO_MAX = 12;
const NAME_MAX = 14;

const clip = (s) => (s.length > NAME_MAX ? s.slice(0, NAME_MAX - 1) + "…" : s);

// Pseudos montrés par équipe : moins il y a d'équipes, plus chacune a de place
export const teamCap = (n) =>
  n <= 3 ? 6 : n === 4 ? 4 : n <= 6 ? 3 : n <= 8 ? 2 : 0;

const teamCols = (n) => (n <= 4 ? Math.max(n, 1) : n <= 6 ? 3 : 4);

// Les joueurs arrivent dans l'ordre : les derniers de la liste sont les plus
// récents. Le plus récent passe en tête, un écran trop petit coupe les anciens.
function latest(list, cap) {
  const names = list
    .slice(Math.max(0, list.length - cap))
    .reverse()
    .map((p) => ({ key: p.username, name: clip(p.username) }));
  return { names, more: list.length - names.length };
}

export function lobbyView(players = [], teams = null) {
  const here = players.filter((p) => !p.left);
  if (!teams?.length)
    return { count: here.length, teams: null, ...latest(here, SOLO_MAX) };
  const list = teams.slice(0, MAX_TEAMS);
  const cap = teamCap(list.length);
  return {
    count: here.length,
    cols: teamCols(list.length),
    cap,
    teams: list.map((t) => {
      const members = here.filter((p) => p.team === t.id);
      return {
        id: t.id,
        name: t.name,
        size: members.length,
        ...latest(members, cap),
      };
    }),
  };
}

// Barres d'égaliseur (prépa, décompte) : hauteur et décalage propres à chacune
export const eqBars = (n, k = 1.7) =>
  Array.from({ length: n }, (_, i) => {
    const h = 0.35 + 0.65 * Math.abs(Math.sin(i * k) * Math.cos(i * 0.45));
    return `--d:${((i * 0.137) % 0.5).toFixed(3)};--a:${(h * 0.25).toFixed(2)};--b:${h.toFixed(2)}`;
  });

// Lobby de la TV : il s'efface devant l'entracte et les messages de panne
// (mise à jour, connexion perdue, musique en panne), posés sous lui
export const lobbyShown = (h) =>
  (h.phase === "lobby" || h.phase === "starting") &&
  !h.intermission &&
  !h.restarting &&
  !h.restored &&
  !h.connLost &&
  !h.videoOutage;

// « Prépare la TV » : seulement avant la première partie, jamais par-dessus un jeu
export const prepShown = (h) => h.joined && h.phase === "lobby" && !h.prepDone;
