// Textes des onglets de la régie, calculés à part pour être testés.

const MODES = { multiple: "4 choix", free: "Texte libre", buzzer: "Buzzer" };

/**
 * Où en est la manche : gros titre de l'onglet Direct, bandeau des autres
 * onglets et phrase de la barre d'actions.
 * @param {{ phase: string, paused: boolean, round: number, maxRounds: number,
 *   timerVal: number, timerMax: number, timerOn: boolean, joueurs: number,
 *   repondu: number, buzzer: { username: string }|null, nextSec: number,
 *   startSec?: number }} e
 */
export function etatManche(e) {
  const pos = `${e.round} / ${e.maxRounds}`;
  const chrono = e.timerOn ? `${e.timerVal} s` : "";
  const reponses = `${e.repondu} sur ${e.joueurs} ont répondu`;
  const p = e.timerOn && e.timerMax ? e.timerVal / e.timerMax : 0;
  if (e.phase === "starting")
    return {
      kicker: "Lancement",
      titre: e.startSec ? `${e.startSec} s` : "Ça démarre",
      sous: "avant la manche 1",
      chrono: "",
      p: 0,
      note: "",
    };
  if (e.paused)
    return {
      kicker: `En pause · ${pos}`,
      titre: "En pause",
      sous: reponses,
      chrono,
      p,
      note: "Rien n'avance tant que tu ne reprends pas.",
    };
  if (e.phase === "round" && e.buzzer)
    return {
      kicker: `Buzzer · ${pos}`,
      titre: `${e.buzzer.username} a buzzé`,
      sous: "Réponse à voix haute",
      chrono,
      p,
      note: `${e.buzzer.username} répond à voix haute : à toi de trancher.`,
    };
  if (e.phase === "round")
    return {
      kicker: `Manche en cours · ${pos}`,
      titre: chrono || "Ça démarre",
      sous: reponses,
      chrono,
      p,
      note: "Révéler affiche la réponse sur la TV sans attendre la fin du chrono.",
    };
  const derniere = e.round >= e.maxRounds;
  const suite = derniere ? "le podium" : `la manche ${e.round + 1}`;
  if (e.nextSec)
    return {
      kicker: `Réponse affichée · ${pos}`,
      titre: `${e.nextSec} s`,
      sous: `avant ${suite}`,
      chrono: `${e.nextSec} s`,
      p: 0,
      note: `${derniere ? "Le podium arrive tout seul" : `La manche ${e.round + 1} démarre toute seule`} dans ${e.nextSec} secondes.`,
    };
  return {
    kicker: `Réponse affichée · ${pos}`,
    titre: "À toi",
    sous: `quand tu veux pour ${suite}`,
    chrono: "",
    p: 0,
    note: `Touche « Manche suivante » pour lancer ${suite}.`,
  };
}

/** Résumé de chaque ligne des Réglages, comme à la création. `t` : manches
 * jouables quand la sélection a moins de titres que de manches choisies. */
export function resumeReglages(settings, playlistNames, t = null) {
  const teams = settings.teams ?? [];
  const noms = teams.map((t) => t.name);
  return {
    musique: playlistNames.join(", ") || "Sélection en cours",
    manches: [
      t != null && t < settings.maxRounds
        ? `${t} manches (${t} titres)`
        : `${settings.maxRounds} manches`,
      `${settings.roundDuration} s`,
      settings.manualNext ? "suite quand tu cliques" : "suite automatique",
    ].join(" · "),
    reponses: `${MODES[settings.answerMode] ?? MODES.multiple} · ${settings.specials ? "manches spéciales" : "sans manche spéciale"}`,
    mode: MODES[settings.answerMode] ?? MODES.multiple,
    equipes: !teams.length
      ? "Chacun pour soi"
      : teams.length > 6
        ? `${teams.length} équipes`
        : `${teams.length} équipes : ${noms.join(", ")}`,
  };
}

/** Pastille d'état d'un joueur dans l'onglet Joueurs (null : rien à dire). */
export function statutJoueur(p, phase) {
  if (p.left) return { cls: "off", label: "a quitté" };
  if (p.offline) return { cls: "off", label: "a décroché" };
  if (phase !== "round") return null;
  return p.foundThisRound || p.answeredThisRound
    ? { cls: "ok", label: "a répondu" }
    : { cls: "", label: "en attente" };
}
