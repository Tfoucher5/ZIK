import { MIN_ROUNDS, MIN_TRACKS } from "../components/card/rules.js";

export const ROUNDS_MIN = 3;
export const ROUNDS_MAX = 50;

export const PRESETS = [
  {
    key: "quick",
    label: "Rapide",
    hint: "10 × 20 s",
    rounds: 10,
    duration: 20,
    pause: 5,
  },
  {
    key: "classic",
    label: "Classique",
    hint: "10 × 30 s",
    rounds: 10,
    duration: 30,
    pause: 7,
  },
  {
    key: "marathon",
    label: "Marathon",
    hint: "30 × 30 s",
    rounds: 30,
    duration: 30,
    pause: 7,
  },
];

export function presetOf({ rounds, duration, pause }) {
  return (
    PRESETS.find(
      (p) =>
        p.rounds === rounds && p.duration === duration && p.pause === pause,
    )?.key ?? null
  );
}

// Pas plus de manches que de titres : chaque manche joue un titre différent.
export function maxRounds(trackCount) {
  if (!trackCount) return ROUNDS_MAX;
  return Math.max(ROUNDS_MIN, Math.min(ROUNDS_MAX, trackCount));
}

export function estimateMinutes({ rounds, duration, pause }) {
  return Math.max(1, Math.round((rounds * (duration + pause)) / 60));
}

// Ce qu'il manque pour que la room permette de gagner des cartes.
export function cardsCheck(trackCount, rounds) {
  const missingTracks = Math.max(0, MIN_TRACKS - (trackCount || 0));
  const missingRounds = Math.max(0, MIN_ROUNDS - rounds);
  return { ok: !missingTracks && !missingRounds, missingTracks, missingRounds };
}
