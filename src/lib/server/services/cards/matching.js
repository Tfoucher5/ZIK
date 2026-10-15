import { cleanString, parseFeaturing } from "../playlist.js";
import { similarity } from "../../../fuzzy.js";

// « Titre - Remastered 2011 », « Titre - Live », « Titre - Radio Edit » → « Titre »
export function stripVersion(title) {
  return String(title || "").replace(
    /\s+-\s+.*\b(remaster\w*|live|version|edit|mix|mono|stereo|acoustic|demo|single)\b.*$/i,
    "",
  );
}

export const titleKey = (title) => cleanString(stripVersion(title));

// Version dérivée (live, remix, session…) : ignorée, seules les versions
// originales comptent. On teste la mention de version et le titre de l'album,
// jamais le titre lui-même (« Live Forever » est un original).
const DERIVED =
  /\b(live|remix|acoustic|acoustique|karaoke|instrumental|session|sessions|originals|unplugged|cover)\b/i;
export function isDerived(c) {
  const version =
    c.title_version || String(c.title || "").replace(c.title_short || "", "");
  return DERIVED.test(version) || DERIVED.test(c.album?.title || "");
}

const FEAT_IN_TITLE =
  /[([](?:feat\.?|ft\.?|featuring|with|avec)\s([^)\]]*)[)\]]/gi;

// « Titre (feat. A & B) » → ["A", "B"]
function featsFromTitle(title) {
  return [...String(title || "").matchAll(FEAT_IN_TITLE)].flatMap((m) =>
    m[1].split(/\s*(?:,|&|\band\b|\bet\b)\s*/i).filter(Boolean),
  );
}

// Nom officiel Deezer de l'artiste principal, suivi des invités. Ils peuvent
// être notés dans l'artiste ou dans le titre, côté playlist comme côté Deezer :
// en jeu, chacun est une réponse qui rapporte des points.
export function displayArtist(deezerName, zikArtist, titles) {
  const seen = new Set([cleanString(deezerName)]);
  const feats = [
    ...parseFeaturing(zikArtist).feats,
    ...titles.flatMap(featsFromTitle),
  ].filter((name) => {
    const k = cleanString(name);
    // « Ray Parker, Jr. » : « Jr. » fait partie du nom, pas un invité
    if (!k || seen.has(k) || cleanString(deezerName).includes(k)) return false;
    seen.add(k);
    return true;
  });
  return feats.length
    ? `${deezerName} (feat. ${feats.join(", ")})`
    : deezerName;
}

// « Titre (feat. X) » → « Titre » : les invités vont dans le champ artiste
export function stripFeat(title) {
  return String(title || "")
    .replace(/\s*[([](feat\.?|ft\.?|featuring|with|avec)\s[^)\]]*[)\]]/gi, "")
    .trim();
}

// Tolère les saisies approximatives : « J J GOLDMAN » / « Jean-Jacques Goldman »,
// « Johnny Halliday » / « Johnny Hallyday »
export function sameArtist(a, b) {
  const x = cleanString(a);
  const y = cleanString(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x)))
    return true;
  if (similarity(x, y) >= 80) return true;
  const lastX = x.split(" ").pop();
  return lastX.length >= 4 && lastX === y.split(" ").pop();
}

// Comparaison tolérante aux saisies approximatives : ponctuation, fautes
// légères, titre abrégé (« Gimme Gimme Gimme ») ou mention en plus (« - Remix »)
export const compact = (s) =>
  cleanString(s)
    .replace(/&|\bet\b/g, "and")
    .replace(/[^a-z0-9]/g, "");
const digits = (s) => s.replace(/\D/g, "");
export function looseTitle(a, b) {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // « Persona 5 » n'est pas « Personal »
  if (digits(x) !== digits(y)) return false;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  if (
    short.length >= 4 &&
    short.length / long.length >= 0.4 &&
    long.includes(short)
  )
    return true;
  return similarity(x, y) >= 80;
}
export const titleOf = (v) => v.title_short || v.title;
export const fullTitleMatch = (v, title) =>
  looseTitle(titleOf(v), title) || looseTitle(v.title, title);

const NOISE =
  /\b(official|music|lyrics?|paroles|clip|audio|video|hd|hq|4k|\d{3,4}p?|ost|soundtrack|theme song|full|opening|intro|op ?\d*|ed ?\d*|s\d+|season \d+|saison \d+|restored|extended|romaji|kanji|eng|english|subs|translations?|with|amv)\b/gi;

// « Shingeki no Kyojin S1 OP1 | Linked Horizon - Guren no Yumiya (Lyrics) »
// → ["Shingeki no Kyojin", "Linked Horizon", "Guren no Yumiya"]
export function segments(text) {
  return String(text || "")
    .replace(/[([【][^)\]】]*[)\]】]/g, " ")
    .replace(/[『』「」•♫"/]/g, " | ")
    .split(/\s+[-–~|:]\s+|\s*[|~]\s*|:\s+|-\s+|\s+ll\s+/)
    .map((s) => s.replace(NOISE, " ").replace(/\s+/g, " ").trim())
    .filter((s) => compact(s).length >= 3);
}

export function looseQueries(parts) {
  const queries = [parts.join(" ")];
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++)
      queries.push(`${parts[i]} ${parts[j]}`);
  queries.push(...parts);
  return [...new Set(queries)].slice(0, 6);
}

// Reprises d'un autre artiste : écartées quand on cherche sans l'artiste
export const TRIBUTE =
  /\b(cover|covers|karaoke|tribute|emulation|in the style|made famous|8-bit|8 bit|lofi|lo-fi|piano version)\b/i;

// Artiste remplacé par une catégorie : seuls les génériques et bandes
// originales conviennent
export const CATEGORY =
  /^(s[ée]ries?( tv)?|tv|t[ée]l[ée]|films?|cin[ée]ma|dessins?( anim[ée]s?)?|g[ée]n[ée]riques?( tv)?|musiques? de films?|bandes? originales?|ost)$/i;
export const THEMED =
  /g[ée]n[ée]rique|theme|th[èe]me|\btv\b|t[ée]l[ée]|s[ée]rie|series|film|movie|soundtrack|\bost\b|bande originale|score|cin[ée]ma|orchestr|from "/i;

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    prev = cur;
  }
  return prev[b.length];
}

// sameArtist, plus les fautes de frappe (« Idr », « Quenn ») et les sigles (« OMD »)
export function closeArtist(deezerName, name) {
  if (sameArtist(deezerName, name)) return true;
  const x = compact(deezerName);
  const y = compact(name);
  if (!x || !y) return false;
  if (
    y.length >= 3 &&
    editDistance(x, y) <= Math.max(1, Math.floor(y.length / 5))
  )
    return true;
  const initials = cleanString(deezerName)
    .split(/\s+/)
    .filter((w) => !["the", "in", "of", "and", "le", "la", "les"].includes(w))
    .map((w) => w[0])
    .join("");
  return y.length >= 2 && initials === y;
}

export const isYoutubeId = (t) =>
  t.artist === t.title && /^[\w-]{11}$/.test(t.artist);
