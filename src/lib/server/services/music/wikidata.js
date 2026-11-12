// Titre français d'un film ou d'une série à partir de son titre anglais
// (« The Aristocats » → « Les Aristochats »). Wikidata : gratuit, sans clé ;
// Wikimedia demande un User-Agent qui identifie le site.
export const WIKIDATA_UA = "ZIK-BlindTest/1.0 (https://www.zik-music.fr)";
export const wikidataSearchUrl = (q, limit = 10) =>
  `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&type=item&language=en&uselang=fr&limit=${limit}&search=${encodeURIComponent(q)}`;

// Sans le drapeau u, \b ne voit pas « é » comme une lettre : pas de \b après
const WORK = /\bfilm\b|\bséries?|dessin animé|\banim[ée]/i;
const NOT_WORK = /album|bande originale|soundtrack|chanson|single|jeu vidéo/i;
const cache = new Map();

// Premier résultat décrit comme un film ou une série, avec un libellé français
export function pickFrench(results) {
  const hit = (results ?? []).find((r) => {
    const desc = r.display?.description?.value ?? r.description ?? "";
    return (
      r.display?.label?.language === "fr" &&
      WORK.test(desc) &&
      !NOT_WORK.test(desc)
    );
  });
  return hit?.display.label.value ?? null;
}

// null si rien de sûr (on garde l'anglais), undefined si Wikidata est
// injoignable : l'appelant arrête alors de l'interroger pour ce passage
export async function frenchTitle(title, fetchFn = fetch) {
  const key = title.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let fr;
  try {
    const res = await fetchFn(wikidataSearchUrl(title), {
      headers: { "User-Agent": WIKIDATA_UA },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return undefined;
    fr = pickFrench((await res.json()).search);
  } catch {
    return undefined;
  }
  cache.set(key, fr);
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return fr;
}
