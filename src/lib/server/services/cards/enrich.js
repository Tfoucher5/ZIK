import { Resvg } from "@resvg/resvg-js";
import { getAdminClient } from "../../config.js";
import { getFetch } from "../fetch.js";
import { cleanString } from "../playlist.js";
import { rarityFromRank } from "../../../components/card/rarity.js";
import {
  albumCache,
  artistCache,
  cached,
  firstReleaseFromIsrc,
} from "./deezerApi.js";
import { displayArtist, stripFeat } from "./matching.js";
import { findVersions } from "./versions.js";

// Enrichissement des cartes (spec docs/specs/cartes.md, section 6.4) : pour
// chaque titre du catalogue, retrouver la version originale sur Deezer,
// son album et son artiste, puis créer ou rattacher sa carte.
// Importé aussi par scripts/cards-backfill.mjs : pas d'alias $lib ici.

const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

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

export async function enrichOne(sb, track) {
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

export const TRACK_FIELDS = "id, artist, title, source, external_id";

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
