import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { getAdminClient } from "../config.js";
import { getFetch } from "./fetch.js";
import { getSpotifyToken } from "./spotify.js";
import { cleanString, displayString, parseFeaturing } from "./playlist.js";
import { rarityFromRank } from "../../components/card/rarity.js";

// Enrichissement des cartes (spec docs/specs/cartes.md, section 6.4) : pour
// chaque titre du catalogue, retrouver la version originale sur Deezer,
// son album et son artiste, puis créer ou rattacher sa carte.
// Importé aussi par scripts/cards-backfill.mjs : pas d'alias $lib ici.

const require = createRequire(import.meta.url);
const stringSimilarity = require("string-similarity");

const DEEZER = "https://api.deezer.com";
const HEADERS = { "User-Agent": "ZIK-BlindTest/1.0" };
const MIN_GAP_MS = 130; // Deezer : 50 requêtes / 5 s, on reste sous 8 / s
const MB_GAP_MS = 1_100; // MusicBrainz : 1 requête / s au maximum
const MB_HEADERS = {
  "User-Agent": "ZIK-BlindTest/1.0 ( https://www.zik-music.fr )",
};
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

let nextSlot = 0;
async function deezer(path) {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(nextSlot, Date.now()) + MIN_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));

  const fetchFn = await getFetch();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchFn(`${DEEZER}${path}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    // Code 4 = quota dépassé : Deezer demande d'attendre quelques secondes
    if (data?.error?.code === 4) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    return data && !data.error ? data : null;
  }
  return null;
}

// Date de première sortie d'un enregistrement, d'après MusicBrainz. Une
// remasterisation y est rattachée au même enregistrement que l'original : sa
// date est donc celle de la sortie d'origine, contrairement aux albums Deezer
// qui datent souvent la réédition.
let mbNextSlot = 0;
async function firstReleaseFromIsrc(isrc) {
  if (!isrc) return null;
  const wait = Math.max(0, mbNextSlot - Date.now());
  mbNextSlot = Math.max(mbNextSlot, Date.now()) + MB_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn(
      `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?fmt=json`,
      { headers: MB_HEADERS, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;
    const dates = ((await res.json()).recordings || [])
      .map((r) => r["first-release-date"])
      .filter(Boolean)
      .sort();
    return dates[0] || null;
  } catch {
    return null;
  }
}

const albumCache = new Map();
const artistCache = new Map();

async function cached(cache, id, path) {
  if (!cache.has(id)) cache.set(id, deezer(path));
  return cache.get(id);
}

// « Titre - Remastered 2011 », « Titre - Live », « Titre - Radio Edit » → « Titre »
function stripVersion(title) {
  return String(title || "").replace(
    /\s+-\s+.*\b(remaster\w*|live|version|edit|mix|mono|stereo|acoustic|demo|single)\b.*$/i,
    "",
  );
}

const titleKey = (title) => cleanString(stripVersion(title));

// Version dérivée (live, remix, session…) : ignorée, seules les versions
// originales comptent. On teste la mention de version et le titre de l'album,
// jamais le titre lui-même (« Live Forever » est un original).
const DERIVED =
  /\b(live|remix|acoustic|acoustique|karaoke|instrumental|session|sessions|originals|unplugged|cover)\b/i;
function isDerived(c) {
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
function displayArtist(deezerName, zikArtist, titles) {
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
function stripFeat(title) {
  return String(title || "")
    .replace(/\s*[([](feat\.?|ft\.?|featuring|with|avec)\s[^)\]]*[)\]]/gi, "")
    .trim();
}

// Tolère les saisies approximatives : « J J GOLDMAN » / « Jean-Jacques Goldman »,
// « Johnny Halliday » / « Johnny Hallyday »
function sameArtist(a, b) {
  const x = cleanString(a);
  const y = cleanString(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x)))
    return true;
  if (stringSimilarity.compareTwoStrings(x, y) >= 0.75) return true;
  const lastX = x.split(" ").pop();
  return lastX.length >= 4 && lastX === y.split(" ").pop();
}

async function spotifyIsrc(id) {
  try {
    const token = await getSpotifyToken();
    const fetchFn = await getFetch();
    const res = await fetchFn(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()).external_ids?.isrc || null;
  } catch {
    return null;
  }
}

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

// Comparaison tolérante aux saisies approximatives : ponctuation, fautes
// légères, titre abrégé (« Gimme Gimme Gimme ») ou mention en plus (« - Remix »)
const compact = (s) =>
  cleanString(s)
    .replace(/&|\bet\b/g, "and")
    .replace(/[^a-z0-9]/g, "");
const digits = (s) => s.replace(/\D/g, "");
function looseTitle(a, b) {
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
  return stringSimilarity.compareTwoStrings(x, y) >= 0.75;
}
const titleOf = (v) => v.title_short || v.title;
const fullTitleMatch = (v, title) =>
  looseTitle(titleOf(v), title) || looseTitle(v.title, title);

// Titre YouTube saisi à la place de l'artiste et du titre : on récupère le nom
// de la vidéo
async function youtubeTitle(id) {
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const { title, author_name } = await res.json();
    const topic = String(author_name || "").match(/^(.+) - Topic$/);
    return topic ? `${topic[1]} - ${title}` : title;
  } catch {
    return null;
  }
}

const NOISE =
  /\b(official|music|lyrics?|paroles|clip|audio|video|hd|hq|4k|\d{3,4}p?|ost|soundtrack|theme song|full|opening|intro|op ?\d*|ed ?\d*|s\d+|season \d+|saison \d+|restored|extended|romaji|kanji|eng|english|subs|translations?|with|amv)\b/gi;

// « Shingeki no Kyojin S1 OP1 | Linked Horizon - Guren no Yumiya (Lyrics) »
// → ["Shingeki no Kyojin", "Linked Horizon", "Guren no Yumiya"]
function segments(text) {
  return String(text || "")
    .replace(/[([【][^)\]】]*[)\]】]/g, " ")
    .replace(/[『』「」•♫"/]/g, " | ")
    .split(/\s+[-–~|:]\s+|\s*[|~]\s*|:\s+|-\s+|\s+ll\s+/)
    .map((s) => s.replace(NOISE, " ").replace(/\s+/g, " ").trim())
    .filter((s) => compact(s).length >= 3);
}

function looseQueries(parts) {
  const queries = [parts.join(" ")];
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++)
      queries.push(`${parts[i]} ${parts[j]}`);
  queries.push(...parts);
  return [...new Set(queries)].slice(0, 6);
}

// Reprises d'un autre artiste : écartées quand on cherche sans l'artiste
const TRIBUTE =
  /\b(cover|covers|karaoke|tribute|emulation|in the style|made famous|8-bit|8 bit|lofi|lo-fi|piano version)\b/i;

// Artiste remplacé par une catégorie : seuls les génériques et bandes
// originales conviennent
const CATEGORY =
  /^(s[ée]ries?( tv)?|tv|t[ée]l[ée]|films?|cin[ée]ma|dessins?( anim[ée]s?)?|g[ée]n[ée]riques?( tv)?|musiques? de films?|bandes? originales?|ost)$/i;
const THEMED =
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
function closeArtist(deezerName, name) {
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

const isYoutubeId = (t) => t.artist === t.title && /^[\w-]{11}$/.test(t.artist);

// Versions Deezer d'un titre du catalogue, de la plus sûre à la plus tolérante.
// Les versions dérivées ne servent que s'il n'existe aucune version originale.
async function findVersions(track) {
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

/** Teinte moyenne d'une pochette, sans dépendance : resvg la réduit à 1 pixel. */
async function dominantColor(url) {
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><image href="data:image/jpeg;base64,${b64}" width="1" height="1" preserveAspectRatio="none"/></svg>`;
    const [r, g, b] = new Resvg(svg).render().pixels;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null;
  }
}

// Rareté provisoire : sortie de moins de 12 mois (elle peut encore monter) ou
// carte créée pendant les fêtes (pic des chansons de Noël).
function isProvisional(releaseDate, now = new Date()) {
  const released = releaseDate ? new Date(releaseDate) : null;
  if (released && now - released < 365 * 24 * 60 * 60 * 1000) return true;
  const m = now.getMonth();
  const d = now.getDate();
  return m === 11 || (m === 0 && d <= 6);
}

async function upsertArtist(sb, artist) {
  const full = await cached(artistCache, artist.id, `/artist/${artist.id}`);
  await sb.from("card_artists").upsert(
    {
      deezer_id: artist.id,
      name: full?.name || artist.name,
      nb_fan: full?.nb_fan ?? null,
    },
    { onConflict: "deezer_id" },
  );
  return full;
}

/**
 * Crée ou retrouve la carte d'un titre du catalogue.
 * track : { id, artist, title, source, external_id }
 * Retourne l'id de la carte, ou null si le titre est introuvable sur Deezer.
 */
export async function enrichTrack(sb, track) {
  const { start, candidates } = await findVersions(track);
  if (!candidates.length) return null;

  const rank = candidates[0].rank || 0;

  // Album de rattachement : album studio ou EP en priorité, sinon single,
  // jamais une compilation. La popularité reste celle de la meilleure version.
  const deezerDates = [];
  const fetched = [];
  for (const c of candidates.slice(0, 6)) {
    const a = c.album?.id
      ? await cached(albumCache, c.album.id, `/album/${c.album.id}`)
      : null;
    if (a?.release_date) deezerDates.push(a.release_date);
    if (a) fetched.push({ c, a });
  }
  const pick =
    fetched.find(
      ({ a }) => a.record_type === "album" || a.record_type === "ep",
    ) ||
    fetched.find(({ a }) => a.record_type !== "compile") ||
    fetched[0];
  const best = pick?.c || candidates[0];
  const album = pick?.a || null;

  // Titre officiel Deezer, sans mention de version ni d'invités
  const title = stripFeat(best.title_short || best.title);
  const cardKey = cleanString(title);

  // Un seul appel MusicBrainz dans le cas courant (1 requête / s chez eux)
  let mbDate = await firstReleaseFromIsrc(best.isrc);
  if (!mbDate && candidates[0].isrc !== best.isrc)
    mbDate = await firstReleaseFromIsrc(candidates[0].isrc);
  const firstRelease = mbDate || deezerDates.sort()[0] || null;

  await upsertArtist(sb, best.artist);
  if (album) {
    if (album.artist?.id && album.artist.id !== best.artist.id)
      await upsertArtist(sb, album.artist);
    const { data: known } = await sb
      .from("card_albums")
      .select("deezer_id")
      .eq("deezer_id", album.id)
      .maybeSingle();
    if (!known) {
      await sb.from("card_albums").insert({
        deezer_id: album.id,
        artist_id: album.artist?.id || best.artist.id,
        title: album.title,
        record_type: album.record_type || null,
        year: album.release_date
          ? Number(album.release_date.slice(0, 4))
          : null,
        genre: album.genres?.data?.[0]?.name || null,
        cover_url: album.cover_xl || null,
        cover_md_url: album.cover_medium || null,
        dominant_color: album.cover_small
          ? await dominantColor(album.cover_small)
          : null,
      });
    }
  }

  // Une carte existante n'est jamais modifiée : sa rareté est figée
  const { data: existing } = await sb
    .from("cards")
    .select("id")
    .eq("artist_id", best.artist.id)
    .eq("title_key", cardKey)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await sb
    .from("cards")
    .insert({
      deezer_track_id: best.id,
      artist_id: best.artist.id,
      album_id: album?.id ?? null,
      title_key: cardKey,
      title,
      artist: displayArtist(best.artist.name, track.artist, [
        track.title,
        best.title,
      ]),
      year: firstRelease ? Number(firstRelease.slice(0, 4)) : null,
      isrc: best.isrc || start?.isrc || null,
      deezer_rank: rank,
      rarity: rarityFromRank(rank),
      rarity_locked_at: isProvisional(firstRelease)
        ? null
        : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    // Créée entre-temps par un autre traitement (file en ligne ou backfill)
    const { data } = await sb
      .from("cards")
      .select("id")
      .eq("artist_id", best.artist.id)
      .eq("title_key", cardKey)
      .single();
    return data?.id ?? null;
  }
  if (error) throw error;
  return created.id;
}

async function enrichOne(sb, track) {
  let cardId = null;
  try {
    cardId = await enrichTrack(sb, track);
  } catch (e) {
    console.error(`[cards] ${track.artist} - ${track.title} :`, e.message);
  }
  await sb
    .from("tracks")
    .update({ card_id: cardId, card_checked_at: new Date().toISOString() })
    .eq("id", track.id);
  return cardId;
}

const TRACK_FIELDS = "id, artist, title, source, external_id";

/**
 * Traite tous les titres jamais vérifiés (ou en échec depuis plus de 30 jours).
 * onProgress({ done, found, total }) est appelé après chaque titre.
 */
export async function enrichPending({
  onProgress,
  concurrency = 4,
  retryMissing = false,
} = {}) {
  const sb = getAdminClient();
  const retryBefore = new Date(Date.now() - RECHECK_AFTER_MS).toISOString();
  const filter = retryMissing
    ? "card_checked_at.is.null,card_id.is.null"
    : `card_checked_at.is.null,and(card_id.is.null,card_checked_at.lt.${retryBefore})`;

  const { count: total } = await sb
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .or(filter);

  let done = 0;
  let found = 0;
  // Curseur sur l'id : un titre resté sans carte correspond toujours au filtre
  let lastId = null;
  for (;;) {
    let query = sb.from("tracks").select(TRACK_FIELDS).or(filter);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data: batch, error } = await query
      .order("id")
      .limit(concurrency * 10);
    if (error) throw error;
    if (!batch?.length) break;
    lastId = batch[batch.length - 1].id;

    for (let i = 0; i < batch.length; i += concurrency) {
      const ids = await Promise.all(
        batch.slice(i, i + concurrency).map((t) => enrichOne(sb, t)),
      );
      done += ids.length;
      found += ids.filter(Boolean).length;
      onProgress?.({ done, found, total });
    }
  }
  return { done, found, total };
}

// ── File d'attente en ligne : titres ajoutés au catalogue ────────────────────
const queue = new Set();
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    const sb = getAdminClient();
    while (queue.size) {
      const ids = [...queue].slice(0, 50);
      ids.forEach((id) => queue.delete(id));
      const { data: tracks } = await sb
        .from("tracks")
        .select(TRACK_FIELDS)
        .in("id", ids)
        .is("card_checked_at", null);
      for (const t of tracks || []) await enrichOne(sb, t);
    }
  } catch (e) {
    console.error("[cards] file d'enrichissement :", e.message);
  } finally {
    draining = false;
  }
}

/** Met en file des titres du catalogue fraîchement ajoutés. Ne bloque pas l'appelant. */
export function enqueueCardEnrichment(trackIds) {
  for (const id of trackIds || []) if (id) queue.add(id);
  drain();
}
