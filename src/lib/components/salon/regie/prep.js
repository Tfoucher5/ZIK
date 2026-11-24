// Checklist d'avant-partie de la régie. Purement indicative : aucun contrôle
// ne bloque le lancement.

const s = (n) => (n > 1 ? "s" : "");
const check = (id, etat, titre, detail = "") => ({ id, etat, titre, detail });

function tvCheck(screens) {
  if (screens == null) return check("tv", "attente", "Recherche de l'écran TV");
  if (screens === 0)
    return check(
      "tv",
      "non",
      "Aucun écran TV connecté",
      "La musique ne jouera pas. Ouvre la soirée sur l'ordinateur de la TV.",
    );
  if (screens === 1) return check("tv", "ok", "TV connectée");
  return check(
    "tv",
    "non",
    `${screens} écrans TV ouverts`,
    "Le son va jouer en double. Fermes-en un.",
  );
}

function sonCheck(ok) {
  if (ok === true) return check("son", "ok", "Son testé");
  if (ok === false)
    return check(
      "son",
      "non",
      "Pas de son sur la TV",
      "Vérifie le volume et la sortie audio de l'ordinateur de la TV.",
    );
  return check(
    "son",
    "attente",
    "Son pas encore testé",
    "Le test se fait sur la TV.",
  );
}

/**
 * Manches que la partie fera vraiment (fiche du 23/11) : pas plus que de
 * titres, moins les introuvables qu'aucune réserve ne remplace.
 * @returns {{ t: number, m: number, perdus: number, court: boolean }}
 */
export function manchesJouables(settings, mc) {
  const m = settings?.maxRounds ?? 0;
  const fini = mc?.total && mc.video + mc.audio + mc.missing >= mc.total;
  const perdus = fini ? Math.max(0, mc.missing - (mc.spares ?? 0)) : 0;
  // Le serveur a déjà retiré les introuvables du total : perdus sert au message
  const t = settings?.rounds ?? m;
  return { t, m, perdus, court: t < m };
}

function musiqueCheck(m, j) {
  if (!m?.total)
    return check("musique", "attente", "Vérification de la musique");
  const done = m.video + m.audio + m.missing;
  if (done < m.total)
    return check(
      "musique",
      "attente",
      "Vérification de la musique",
      `${done} / ${m.total}`,
    );
  if (j?.court) {
    const suite = `La partie fera ${j.t} manche${s(j.t)}. Pour en jouer ${j.m}, ajoute une playlist.`;
    return check(
      "musique",
      "non",
      `${j.t} titre${s(j.t)} pour ${j.m} manches`,
      j.perdus
        ? `${j.perdus} titre${s(j.perdus)} introuvable${s(j.perdus)}, sans titre de réserve. ${suite}`
        : suite,
    );
  }
  if (m.video < m.total / 2)
    return check(
      "musique",
      "non",
      "Peu de clips disponibles",
      `${m.video} titre${s(m.video)} sur ${m.total} en vidéo, le reste en extrait audio. Tu peux changer de playlist dans Réglages.`,
    );
  const reste = [
    m.audio && `${m.audio} en extrait audio`,
    m.missing && `${m.missing} remplacé${s(m.missing)}`,
  ].filter(Boolean);
  return check(
    "musique",
    "ok",
    "Musique prête",
    `${m.video} titre${s(m.video)} sur ${m.total}` +
      (reste.length ? ` en vidéo, ${reste.join(", ")}` : ""),
  );
}

/**
 * @param {{ screens: number|null, tvSound: boolean|null, mediaCheck: any,
 *   players: any[], teams: { id: number, name: string }[]|null, settings?: any }} etat
 */
export function prepChecks({
  screens,
  tvSound,
  mediaCheck,
  players,
  teams,
  settings,
}) {
  const presents = players.filter((p) => !p.left);
  const joueurs = presents.length;
  const equipes =
    teams?.map((t) => ({
      id: t.id,
      name: t.name,
      size: presents.filter((p) => p.team === t.id).length,
    })) ?? null;
  return {
    joueurs,
    checks: [
      tvCheck(screens),
      // Sans TV, le test du son d'une TV fermée ne vaut plus
      sonCheck(screens === 0 ? null : tvSound),
      musiqueCheck(mediaCheck, manchesJouables(settings, mediaCheck)),
      joueurs
        ? check(
            "joueurs",
            "ok",
            `${joueurs} joueur${s(joueurs)} connecté${s(joueurs)}`,
          )
        : check(
            "joueurs",
            "attente",
            "Aucun joueur",
            "Ils scannent le QR affiché sur la TV.",
          ),
    ],
    equipes,
    vides:
      joueurs && equipes
        ? equipes.filter((e) => !e.size).map((e) => e.name)
        : [],
    // Le joueur choisit son équipe sur son téléphone : rien n'est imposé
    sansEquipe: equipes
      ? presents.filter((p) => !equipes.some((e) => e.id === p.team)).length
      : 0,
  };
}

export function videsTexte(noms) {
  if (noms.length === 1) return `L'équipe ${noms[0]} est vide.`;
  return `Les équipes ${noms.slice(0, -1).join(", ")} et ${noms.at(-1)} sont vides.`;
}
