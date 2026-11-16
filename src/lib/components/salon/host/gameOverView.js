// Ce que la TV de fin de partie affiche : le podium (équipes ou joueurs), la
// suite du classement à droite et le compte des « Une autre ! ».
import { teamColor } from "../../../data/salonOptions.js";

const best = (list, k) =>
  list.reduce((top, p) => (p[k] > (top?.[k] ?? 0) ? p : top), null);

// Une étiquette par nom : meilleur joueur > le plus régulier > le plus rapide.
// Un prix déjà pris par un nom mieux étiqueté ne passe pas au suivant.
export function awards(scores = [], teams = false) {
  const tags = {};
  const give = (p, tag) => p && !tags[p.username] && (tags[p.username] = tag);
  if (teams && scores[0]?.score > 0) give(scores[0], "Meilleur joueur");
  give(best(scores, "found"), "Le plus régulier");
  give(best(scores, "first"), "Le plus rapide");
  return tags;
}

const row = (p, rank, tags, team) => ({
  key: p.username,
  rank,
  name: p.username,
  score: p.score,
  tag: tags[p.username] ?? (p.left ? "Parti" : null),
  color: team && p.team != null ? teamColor(p.team) : null,
});

function cap(rows, max) {
  return rows.length > max
    ? { rows: rows.slice(0, max), more: rows.length - max }
    : { rows, more: 0 };
}

export function gameOverView(over, players = [], max = 7) {
  const scores = over?.scores ?? [];
  const teams = !!over?.teams?.length;
  const tags = awards(scores, teams);

  const podium = teams
    ? over.teams.slice(0, 3).map((t, i) => ({
        key: "t" + t.id,
        rank: i + 1,
        name: t.name,
        score: t.score,
        color: teamColor(t.id),
        avg: true,
      }))
    : scores
        .slice(0, 3)
        .map((p, i) => ({ ...row(p, i + 1, tags), color: null }));

  // ZIK Pro, dès la 2e partie : la soirée cumulée remplace la partie
  const night = over?.night?.games >= 2 ? over.night : null;
  const list = night
    ? {
        title: `Soirée · ${night.games} parties`,
        count: null,
        ...cap(
          night.players.map((p, i) => row(p, i + 1, {}, true)),
          max,
        ),
      }
    : teams
      ? {
          title: "Les joueurs",
          count: scores.length,
          ...cap(
            scores.map((p, i) => row(p, i + 1, tags, true)),
            max,
          ),
        }
      : {
          title: "Classement",
          count: scores.length,
          ...cap(
            scores.slice(3).map((p, i) => row(p, i + 4, tags)),
            max,
          ),
        };

  const here = players.filter((p) => !p.left);
  return {
    teams,
    podium,
    list,
    encore: { n: here.filter((p) => p.encore).length, of: here.length },
  };
}

// Les messages de panne (mise à jour, connexion perdue) passent devant
const calm = (h) => !h.restarting && !h.restored && !h.connLost;

// Priorité de la TV : podium de soirée > QR en grand > entracte > fin de partie
export const qrBigShown = (h) => !!h.qrBig && !h.finale && calm(h);
// Pendant une relance (décompte « On remet ça. »), la phase reste gameover
export const gameOverShown = (h) =>
  h.phase === "gameover" &&
  !h.relaunching &&
  !h.intermission &&
  !qrBigShown(h) &&
  calm(h);

// TV rechargée en fin de partie : le serveur ne renvoie pas le résultat, on
// le refait avec la liste des joueurs (sans les prix, faute de statistiques)
export const endResult = (h) =>
  h.gameOver ?? {
    scores: [...(h.players ?? [])].sort((a, b) => b.score - a.score),
    teams: h.teams,
    night: h.night,
  };

// Commandes sur la TV seulement si aucune régie n'est connectée (null : pas encore su)
export const tvAlone = (h) => !h.controls;

// Un décompte de lancement reçu après une partie = on rejoue
export const isReplay = (phase) => phase === "gameover" || phase === "summary";
