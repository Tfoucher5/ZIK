import { fetchAllRows } from "../admin/paginate.js";
import { deezerFetch } from "./deezerClient.js";
import {
  guessWork,
  isWork,
  workFromArtist,
} from "../../../shared/playlist/work.js";

// Titres examinés par passage (au plus autant d'appels Deezer de fond)
export const PAGE = 200;

// Le propriétaire de la playlist, ou un super admin
export async function canEditPlaylist(db, playlistId, userId) {
  const { data: pl } = await db
    .schema("catalog")
    .from("custom_playlists")
    .select("owner_id")
    .eq("id", playlistId)
    .maybeSingle();
  if (!pl) return false;
  if (pl.owner_id === userId) return true;
  const { data: me } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return me?.role === "super_admin";
}

const playlistRows = (db, playlistId) =>
  fetchAllRows(() =>
    db
      .schema("catalog")
      .from("custom_playlist_tracks")
      .select(
        "id, track_id, custom_artist, custom_title, tracks(artist, title, external_id, source), track_answers(value, answer_types(name))",
      )
      .eq("playlist_id", playlistId)
      .order("position")
      .order("id"),
  );

const noWork = (r) =>
  !(r.track_answers ?? []).some((a) => isWork(a.answer_types?.name));

// Œuvre déjà saisie pour la même chanson dans une autre playlist, publique,
// officielle ou à soi : jamais le texte d'une playlist privée d'un autre
async function knownWorks(db, trackIds, userId) {
  const known = new Map();
  for (let i = 0; i < trackIds.length; i += 100) {
    const rows = await fetchAllRows(() =>
      db
        .schema("catalog")
        .from("track_answers")
        .select(
          "id, value, answer_types(name), custom_playlist_tracks!inner(track_id, custom_playlists!inner(owner_id, is_public, is_official))",
        )
        .in("custom_playlist_tracks.track_id", trackIds.slice(i, i + 100))
        .order("id"),
    );
    for (const a of rows) {
      const pl = a.custom_playlist_tracks.custom_playlists ?? {};
      const visible = pl.is_public || pl.is_official || pl.owner_id === userId;
      if (visible && isWork(a.answer_types?.name))
        known.set(a.custom_playlist_tracks.track_id, a.value);
    }
  }
  return known;
}

async function deezerAlbum(id) {
  try {
    const t = await deezerFetch(`/track/${id}`, { bulk: true });
    return t?.album?.title ?? null;
  } catch {
    return null;
  }
}

// Titres de la playlist sans œuvre, par passages de PAGE à partir de `from`,
// avec le film proposé quand on en trouve un. next : début du passage suivant
export async function suggestWorks(db, playlistId, userId, from = 0) {
  const rows = await playlistRows(db, playlistId);
  const missing = rows.filter(noWork);
  const page = missing.slice(from, from + PAGE);
  const known = await knownWorks(
    db,
    page.map((r) => r.track_id).filter(Boolean),
    userId,
  );
  const suggestions = [];
  for (const r of page) {
    const meta = r.tracks ?? {};
    const artist = r.custom_artist || meta.artist || "";
    // Artiste d'origine « Cast - … » renommé à la main : c'est souvent le film
    const renamed =
      r.custom_artist && workFromArtist(meta.artist) ? r.custom_artist : null;
    const knownWork = known.get(r.track_id) ?? renamed;
    let album = null;
    if (!knownWork && meta.source === "deezer" && meta.external_id)
      album = await deezerAlbum(meta.external_id);
    suggestions.push({
      id: r.id,
      artist,
      title: r.custom_title || meta.title || "",
      value: guessWork({ known: knownWork, album, artist: meta.artist }),
    });
  }
  const next = from + PAGE < missing.length ? from + PAGE : null;
  return { suggestions, next, total: missing.length };
}

// Enregistre les œuvres validées, seulement sur les titres de cette playlist
// qui n'en ont pas encore (pas de doublon si on valide deux fois)
export async function saveWorks(db, playlistId, answers) {
  const rows = await playlistRows(db, playlistId);
  const ids = new Set(rows.filter(noWork).map((r) => r.id));
  const seen = new Set();
  const insert = answers
    .filter((a) => ids.has(a.id) && !seen.has(a.id) && seen.add(a.id))
    .map((a) => ({
      track_id: a.id,
      answer_type_id: a.type_id,
      value: a.value.trim(),
    }));
  if (!insert.length) return 0;
  const { error } = await db
    .schema("catalog")
    .from("track_answers")
    .insert(insert);
  if (error) throw error;
  return insert.length;
}
