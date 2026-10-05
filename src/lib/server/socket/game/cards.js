import { RARITIES } from "../../../components/card/rarity.js";

// Garde-fous d'attribution (spec docs/specs/cartes.md, section 1). Règle de
// conception : on bloque sur la structure de la partie (qui joue, combien, sur
// quelle playlist), jamais sur la performance. Vitesse et volume de réponses ne
// produisent que des signaux pour l'admin.

export const MIN_ROUNDS = 5;
// Petite playlist = titres connus par cœur : pas de cartes en dessous
export const MIN_TRACKS = 100;
const TRACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW = 3; // manches sans réponse avant de ne plus compter
const VERY_FAST_MS = 1_000;
const MANY_GUESSES = 40;

function isActive(p, round) {
  return (
    p.verified &&
    !p.disconnected &&
    p.lastAnswerRound != null &&
    round - p.lastAnswerRound < ACTIVE_WINDOW
  );
}

// Comptes actifs, une seule fois par adresse IP (garde-fou G3)
function activeCount(players, round, exceptUserId = null) {
  const ips = new Set();
  for (const p of Object.values(players))
    if (isActive(p, round) && p.userId !== exceptUserId) ips.add(p.ip);
  return ips.size;
}

/**
 * Désigne le joueur qui gagne la carte de la manche.
 * Fonction pure : toutes les données viennent de l'état serveur de la room.
 * Retourne { winner, delayed, guest, refusals, signals }.
 */
export function pickCardWinner({
  card,
  finders,
  players,
  round,
  maxRounds,
  playlistSize,
  mode,
  skipped,
  ownerIds,
  trackAddedAt,
  now = Date.now(),
}) {
  const result = {
    winner: null,
    delayed: false,
    guest: null,
    refusals: [],
    signals: [],
  };
  if (!card || skipped || maxRounds < MIN_ROUNDS || playlistSize < MIN_TRACKS)
    return result;
  if (
    trackAddedAt &&
    now - new Date(trackAddedAt).getTime() < TRACK_COOLDOWN_MS
  )
    return result;

  const exploit = RARITIES[card.rarity].exploit;
  const limitMs = exploit[mode === "qcm" ? "qcm" : "classic"] ?? null;

  for (const { name, ms } of finders) {
    const p = players[name];
    if (!p) continue;
    if (!p.verified) {
      result.guest ??= name;
      continue;
    }

    const ownPlaylist = ownerIds.has(p.userId);
    const others = activeCount(players, round, p.userId);
    const total = activeCount(players, round);
    const required = exploit.players;

    if (ownPlaylist && (exploit.notOwnPlaylist || others < 2)) {
      result.refusals.push({ name, reason: "own_playlist", others });
      continue;
    }
    if (total < required) {
      result.refusals.push({
        name,
        reason: "players",
        active: total,
        required,
      });
      continue;
    }
    if (limitMs != null && ms > limitMs) {
      result.refusals.push({ name, reason: "speed", ms, limitMs });
      continue;
    }

    if (mode !== "qcm" && ms < VERY_FAST_MS)
      result.signals.push({ name, reason: "very_fast", ms });
    if (p.guesses > MANY_GUESSES)
      result.signals.push({ name, reason: "many_guesses", guesses: p.guesses });

    result.winner = name;
    result.delayed = now - new Date(p.createdAt).getTime() < NEW_ACCOUNT_MS;
    break;
  }
  return result;
}
