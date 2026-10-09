export const GRANT_STATUSES = {
  pending: "En attente",
  granted: "Donnée",
  lost: "Perdue",
  revoked: "Retirée",
};

export const SIGNAL_REASONS = {
  very_fast: "Titre trouvé en moins de 1 s",
  many_guesses: "Plus de 40 réponses dans la manche",
};

export const SET_KINDS = { artist: "Artiste", album: "Album", theme: "Thème" };

export const seconds = (ms) =>
  `${((ms ?? 0) / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;

export function signalDetail(s) {
  const d = s.details || {};
  if (s.reason === "very_fast") return seconds(d.ms);
  if (s.reason === "many_guesses") return `${d.guesses} réponses`;
  return "";
}

/** Popularité Deezer affichée en note sur 100 (rank / 10 000). */
export const popularity = (rank) =>
  ((rank ?? 0) / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * Recherche de carte : un nombre (« 42 » ou « n°42 ») cherche le numéro,
 * sinon le texte cherche dans le titre et l'artiste. Les caractères qui
 * cassent un filtre PostgREST sont retirés.
 */
export function parseCardSearch(raw) {
  const q = String(raw ?? "").trim();
  const n = q.match(/^(?:n°|#)?\s*(\d+)$/i);
  if (n) return { number: Number(n[1]) };
  const text = q
    .replace(/[,()%*"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? { text } : null;
}
