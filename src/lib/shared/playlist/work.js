// Réponses qui désignent une œuvre : la trouver vaut toute la manche, et c'est
// elle qu'on affiche en premier (musique de film, générique de série…)
const WORK_TYPES = new Set(["Film", "Série", "Jeu vidéo", "Animé"]);
export const isWork = (label) => WORK_TYPES.has(label);

const MARKER =
  /bande originale|soundtrack|motion picture|\bost\b|\bb\.?o\.?\b/i;
const TAIL =
  /\s*[-–:]?\s*(?:the\s+)?(?:original\s+)?(?:motion picture\s+)?(?:soundtrack|bande originale|ost)\b.*$/i;
// « Cast - Aristocats », « Chœurs - Alice au Pays des Merveilles », « Cast of Bambi »
const CAST = /^(?:cast|ch(?:œ|oe)urs?|chorus)(?:\s+of\s+|\s*[-–:]\s*)(.+)$/i;

// Nom de l'œuvre lu dans un album de bande originale, sinon null
export function workFromAlbum(album) {
  if (!album || !MARKER.test(album)) return null;
  const name = album
    .replace(/\s*[([][^)\]]*[)\]]/g, (g) => (MARKER.test(g) ? "" : g))
    .replace(TAIL, "")
    .trim();
  return name || null;
}

export const workFromArtist = (artist) =>
  artist?.trim().match(CAST)?.[1].trim() || null;

// Œuvre proposée pour un titre : déjà saisie ailleurs pour la même chanson,
// sinon une bande originale française, le nom de la troupe, l'album en anglais
export function guessWork({ known, album, artist }) {
  if (known) return known;
  const fromAlbum = workFromAlbum(album);
  if (fromAlbum && /bande originale/i.test(album)) return fromAlbum;
  return workFromArtist(artist) ?? fromAlbum;
}
