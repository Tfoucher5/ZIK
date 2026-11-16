// Régie de fin de partie : textes calculés à part pour être testés.

const s = (n) => (n > 1 ? "s" : "");
const pts = (n) => `${n.toLocaleString("fr-FR")} pts`;

/** Heure lisible au mur : « 22 h 15 ». */
export const heure = (t) =>
  new Date(t)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", " h ");

/**
 * En-tête de l'onglet Direct entre deux parties : fin de partie, entracte
 * ou podium de la soirée.
 * @param {{ players: any[], teams: any[]|null, rounds: number, night: any,
 *   intermission: { until: number|null }|null, finale: any, tambour?: boolean }} e
 */
export function finTete({
  players,
  teams,
  rounds,
  night,
  intermission,
  finale,
  tambour = true,
}) {
  if (finale) {
    const tete = night?.teams?.[0]?.name ?? night?.players?.[0]?.username;
    const n = night?.games ?? 0;
    return {
      kicker: `Fin de la soirée · ${n} partie${s(n)}`,
      titre: "Podium à l'écran",
      sous: tete ? `${tete} gagne la soirée` : "",
      tv: `Le 3e, le 2e, ${tambour ? "un roulement de tambour, " : ""}puis le vainqueur. Bravo pour la soirée !`,
    };
  }
  if (intermission)
    return {
      kicker: "Entracte en cours",
      titre: "Entracte",
      sous: intermission.until
        ? `Reprise affichée vers ${heure(intermission.until)}`
        : "Sans heure de reprise",
      tv: "« Entracte », l'heure de reprise et le code. Rien ne repart tout seul : c'est toi qui relances.",
    };
  const presents = players.filter((p) => !p.left);
  const kicker = `Partie terminée · ${rounds} manche${s(rounds)}`;
  const tv = "Le podium, le classement et le code pour les retardataires.";
  const effectif = `${presents.length} joueur${s(presents.length)}`;
  // Équipes : déjà triées par moyenne (serveur)
  const [a, b] = teams?.length
    ? teams
    : [...players]
        .sort((x, y) => y.score - x.score)
        .map((p) => ({ name: p.username, score: p.score }));
  if (!a?.score)
    return { kicker, titre: "Partie terminée", sous: effectif, tv };
  const egalite = b && b.score === a.score;
  return {
    kicker,
    titre: egalite ? "Égalité" : `${a.name} gagne`,
    sous: `${egalite ? `${a.name} et ${b.name} · ` : ""}${pts(a.score)}${teams?.length ? " en moyenne" : ""} · ${effectif}`,
    tv,
  };
}

/** « Une autre ! » : combien en redemandent parmi les joueurs encore là. */
export function encore(players) {
  const presents = players.filter((p) => !p.left);
  const n = presents.filter((p) => p.encore).length;
  return {
    n,
    sur: presents.length,
    p: presents.length ? n / presents.length : 0,
  };
}
