import { createRequire } from "module";
import { displayString } from "../services/playlist.js";

const require = createRequire(import.meta.url);
const stringSimilarity = require("string-similarity");

// Ressemblance globale, sans découper en mots : un seul mot juste ne suffit
// pas à valider une réponse
export function checkMatch(input, target) {
  if (!input || !target) return false;
  const len = input.length;
  const tLen = target.length;
  if (input === target) return true;
  // Réponse contenue dans la cible, si elle en couvre au moins 40 %
  if (len >= 3 && target.includes(input) && len / tLen >= 0.4) return true;
  // Cible contenue dans la réponse (mots en trop autour)
  if (tLen >= 3 && input.includes(target) && tLen / len >= 0.6) return true;
  const sim = stringSimilarity.compareTwoStrings(input, target);
  if (len <= 2) return sim >= 0.95;
  if (sim >= 0.72) return true;
  // Réponses longues : un peu plus tolérant aux fautes de frappe
  if (len >= 6 && sim >= 0.65) return true;
  return false;
}

export function checkClose(input, target) {
  if (!input || !target || input.length < 2) return false;
  const sim = stringSimilarity.compareTwoStrings(input, target);
  if (sim >= 0.42) return true;
  if (input.length >= 3 && target.length >= 3) {
    for (let i = 0; i <= target.length - input.length + 1; i++) {
      const chunk = target.slice(i, i + input.length);
      if (stringSimilarity.compareTwoStrings(input, chunk) >= 0.8) return true;
    }
  }
  return false;
}

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// 4 propositions dont la bonne. 40 % du temps, un autre titre du même artiste
// sert de leurre : il faut reconnaître le titre, pas seulement l'artiste.
export function makeChoices(correct, allTracks, sep = " — ") {
  const label = (t) =>
    `${displayString(t.mainArtist || t.artist)}${sep}${displayString(t.title)}`;
  const artistKey = (t) =>
    (t.mainArtist || t.artist || "").toLowerCase().trim();
  const correctLabel = label(correct);
  const correctArtist = artistKey(correct);

  const pool = allTracks.filter((t) => label(t) !== correctLabel);
  const sameArtist = pool.filter((t) => artistKey(t) === correctArtist);
  const otherArtists = pool.filter((t) => artistKey(t) !== correctArtist);

  const wrongTracks =
    sameArtist.length && Math.random() < 0.4
      ? shuffle([
          sameArtist[Math.floor(Math.random() * sameArtist.length)],
          ...shuffle(otherArtists).slice(0, 2),
        ])
      : shuffle(pool).slice(0, 3);

  const choices = shuffle([correctLabel, ...wrongTracks.map(label)]);
  return { choices, correctChoiceIndex: choices.indexOf(correctLabel) };
}

// Façon Kahoot : 1000 points à t=0, 200 à la fin du chrono
export function calcQcmPoints(timeTaken, roundDuration) {
  const MAX_PTS = 1000;
  const MIN_PTS = 200;
  const ratio = Math.min(
    1,
    Math.max(0, timeTaken / Math.max(1, roundDuration)),
  );
  return Math.round(MAX_PTS - (MAX_PTS - MIN_PTS) * ratio);
}
