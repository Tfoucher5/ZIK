import { displayString } from "../services/music/trackText.js";
import {
  findParts,
  partialSimilarity,
  similarity,
} from "../../shared/fuzzy.js";

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
  const sim = similarity(input, target);
  return len <= 2 ? sim === 100 : sim >= 80;
}

export function checkClose(input, target) {
  if (!input || !target || input.length < 2) return false;
  if (similarity(input, target) >= 60) return true;
  return input.length >= 3 && partialSimilarity(input, target) >= 80;
}

const words = (s) => (s ? s.split(" ").filter(Boolean).length : 0);

// Parties encore à trouver, dans l'ordre où on les teste
function openParts(track, found) {
  return [
    !found.foundArtist && { kind: "artist", target: track.cleanArtist },
    ...track.cleanFeatArtists.map(
      (target, index) =>
        !found.foundFeats[index] && { kind: "feat", index, target },
    ),
    !found.foundTitle && { kind: "title", target: track.cleanTitle },
    ...(track.extraAnswers || []).map(
      (e, index) =>
        !found.foundExtras[index] && { kind: "extra", index, target: e.clean },
    ),
  ].filter((p) => p && p.target);
}

// Tout peut se donner d'un coup (« bohemian rhapsody queen ») : une partie est
// trouvée si elle ressemble à toute la réponse ou à un passage. Une réponse
// bien plus longue que le morceau ne ratisse rien.
export function gradeGuess(input, track, found) {
  const parts = openParts(track, found);
  const trackWords = [
    track.cleanArtist,
    ...track.cleanFeatArtists,
    track.cleanTitle,
    ...(track.extraAnswers || []).map((e) => e.clean),
  ].reduce((n, s) => n + words(s), 0);
  const inGuess =
    words(input) <= trackWords + 2
      ? findParts(
          input,
          parts.map((p) => p.target),
        )
      : [];
  const hits = parts.filter(
    (p, i) => inGuess.includes(i) || checkMatch(input, p.target),
  );
  const close = hits.length
    ? null
    : (parts.find((p) => checkClose(input, p.target)) ?? null);
  return { hits, close };
}

export function markFound(player, part) {
  if (part.kind === "artist") player.foundArtist = true;
  if (part.kind === "title") player.foundTitle = true;
  if (part.kind === "feat") player.foundFeats[part.index] = true;
  if (part.kind === "extra") player.foundExtras[part.index] = true;
}

const NAMES = { artist: "Artiste", feat: "Feat", title: "Titre" };
const CLOSE = { artist: "l'artiste", feat: "le feat", title: "le titre" };
export const partName = (part, track) =>
  NAMES[part.kind] ?? track.extraAnswers[part.index].label;
export const closeMsg = (part, track) =>
  `Tu chauffes sur ${CLOSE[part.kind] ?? track.extraAnswers[part.index].label} !`;

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
