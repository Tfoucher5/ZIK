import { displayString, parseFeaturing } from "../playlist.js";
import { deezer, spotifyIsrc, youtubeTitle } from "./deezerApi.js";
import {
  stripVersion,
  titleKey,
  isDerived,
  sameArtist,
  compact,
  looseTitle,
  titleOf,
  fullTitleMatch,
  segments,
  looseQueries,
  TRIBUTE,
  CATEGORY,
  THEMED,
  closeArtist,
  isYoutubeId,
} from "./matching.js";

async function startTrack(track) {
  if (track.source === "deezer" && /^\d+$/.test(track.external_id || ""))
    return deezer(`/track/${track.external_id}`);
  if (track.source === "spotify" && track.external_id) {
    const isrc = await spotifyIsrc(track.external_id);
    if (isrc) return deezer(`/track/isrc:${isrc}`);
  }
  return null;
}

async function searchVersions(artist, title) {
  const strict = await deezer(
    `/search?q=${encodeURIComponent(`artist:"${artist}" track:"${title}"`)}&limit=25`,
  );
  if (strict?.data?.length) return strict.data;
  return searchLoose(`${artist} ${title}`);
}

async function searchLoose(q) {
  const res = await deezer(`/search?q=${encodeURIComponent(q)}&limit=25`);
  return res?.data || [];
}

// Versions Deezer d'un titre du catalogue, de la plus sûre à la plus tolérante.
// Les versions dérivées ne servent que s'il n'existe aucune version originale.
export async function findVersions(track) {
  const { main } = parseFeaturing(track.artist);
  const title = stripVersion(displayString(track.title)).replace(
    /\s+(?:feat\.?|ft\.?|featuring)\s.*$/i,
    "",
  );
  const key = titleKey(track.title);
  const start = await startTrack(track);
  const pool = [...(start ? [start] : [])];
  const pick = (list) => {
    const originals = list.filter((c) => !isDerived(c));
    return (originals.length ? originals : list).sort(
      (a, b) => (b.rank || 0) - (a.rank || 0),
    );
  };

  const results = await searchVersions(main, title);
  const strict = results.filter(
    (v) => sameArtist(v.artist?.name, main) && titleKey(titleOf(v)) === key,
  );
  if (strict.length || start)
    return { start, candidates: pick([...pool, ...strict]) };

  const byArtist = results.filter(
    (v) => sameArtist(v.artist?.name, main) && fullTitleMatch(v, title),
  );
  if (byArtist.length) return { start, candidates: pick(byArtist) };

  const tribute = (v) =>
    TRIBUTE.test(`${v.artist?.name} ${v.title} ${v.album?.title}`);
  const video = isYoutubeId(track) && (await youtubeTitle(track.artist));
  const category = CATEGORY.test(main.trim());

  // Vrai artiste mal orthographié (« Quenn », « CINDY LAUPER ») : on exige un
  // artiste Deezer proche, sinon pas de carte plutôt que celle d'un autre
  if (!video && main !== title && !category) {
    const names = track.artist.split(/\s*(?:,|&|\bx\b|\bfeat\.?|\bft\.?)\s*/i);
    // Cas tordus : début du titre saisi comme artiste (« EVE - LEVE TOI »),
    // artiste et titre inversés (« Flowers - Miley cirus »)
    const merged = `${track.artist} ${title}`;
    for (const q of new Set([`${names[0]} ${title}`, title, merged])) {
      const matched = (await searchLoose(q)).filter(
        (v) =>
          !tribute(v) &&
          ((fullTitleMatch(v, title) &&
            names.some((n) => closeArtist(v.artist?.name, n))) ||
            (compact(merged).length >= 6 &&
              compact(titleOf(v)) === compact(merged)) ||
            (fullTitleMatch(v, track.artist) &&
              closeArtist(v.artist?.name, title))),
      );
      if (matched.length) return { start, candidates: pick(matched) };
    }
    return { start, candidates: [] };
  }

  // Catégorie (« SERIE TV »), nom du jeu en guise d'artiste, ou id YouTube
  const text = video || track.title;
  const parts = segments(text);
  if (!parts.length) return { start, candidates: [] };
  const whole = parts.join(" ");
  for (const q of looseQueries(parts)) {
    const matched = (await searchLoose(q)).filter(
      (v) =>
        !tribute(v) &&
        (!category ||
          THEMED.test(`${v.artist?.name} ${v.title} ${v.album?.title}`)) &&
        (parts.some((p) => compact(p).length >= 4 && fullTitleMatch(v, p)) ||
          looseTitle(`${v.artist?.name} ${titleOf(v)}`, whole)),
    );
    if (!matched.length) continue;
    const sameName = matched.filter((v) =>
      parts.some((p) => sameArtist(v.artist?.name, p)),
    );
    return { start, candidates: pick(sameName.length ? sameName : matched) };
  }
  return { start, candidates: [] };
}
