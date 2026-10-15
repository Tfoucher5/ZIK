import { createMatcher, normalize, search } from "guess-rater";

// Couche unique autour de guess-rater, côté serveur comme côté navigateur.
// Les scores vont de 0 à 100.
const matcher = createMatcher({});
const partialMatcher = createMatcher({ partial: true });

export const similarity = (a, b) => matcher.similarity(a, b);
export const partialSimilarity = (a, b) => partialMatcher.similarity(a, b);

// Index des réponses présentes dans le texte, en entier ou en passage
export const findParts = (text, answers) =>
  matcher.checkAll(text, { ...answers }).found.map(Number);

// Filtre de champ de recherche : garde l'ordre de la liste, accepte les
// fautes de frappe et les mots dans le désordre, sans perdre les recherches
// au milieu d'un mot (« ola » trouve « Tiakola »).
export function fuzzyFilter(items, query, keys) {
  const q = normalize(query || "");
  if (!q) return items;
  const texts = items.map((item) =>
    normalize(
      keys
        .map((k) => (typeof k === "function" ? k(item) : item[k]) ?? "")
        .join(" "),
    ),
  );
  const hits = new Set(
    search(q, texts, { preset: "search" }).map((h) => h.index),
  );
  return items.filter((_, i) => hits.has(i) || texts[i].includes(q));
}
