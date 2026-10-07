import { getAdminClient } from "../config.js";
import { playlistCache, customRooms, dbRooms } from "../state.js";
import { CARD_SELECT, toCardView } from "../../components/card/cardView.js";
import {
  fetchDeezerTrackPreview,
  iTunesPreviewSearch,
  parseExpFromUrl,
} from "./deezer.js";

// ─── String helpers ───────────────────────────────────────────────────────────

export function cleanString(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ *\([^)]*\) */g, "")
    .replace(/ *\[[^\]]*\] */g, "")
    .replace(/[''`]/g, "'")
    .replace(/[-\u2013\u2014]/g, " ")
    .trim()
    .toLowerCase();
}

export function displayString(str) {
  if (!str) return "";
  return str
    .replace(/ *\([^)]*\) */g, " ")
    .replace(/ *\[[^\]]*\] */g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeaturing(artistStr) {
  if (!artistStr) return { main: "", feats: [] };

  // 1. Explicit feat keyword in parentheses: "Artist (feat. X, Y)"
  const mParen = artistStr.match(
    /^(.+?)\s*\((?:feat\.?|ft\.?|featuring|with|avec)\s+([^)]+)\)\s*$/i,
  );
  if (mParen) {
    const feats = mParen[2]
      .split(/\s*[,&]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { main: mParen[1].trim(), feats };
  }

  // 2. Explicit feat keyword without parentheses: "Artist feat. X & Y"
  const mFeat = artistStr.match(
    /^(.+?)\s+(?:feat\.?|ft\.?|featuring|with|avec)\s+(.+)$/i,
  );
  if (mFeat) {
    const feats = mFeat[2]
      .split(/\s*[,&]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { main: mFeat[1].trim(), feats };
  }

  // 3. Comma-separated artists (Spotify format: "Artist1, Artist2, Artist3")
  //    Only split if 3+ artists, or exactly 2 but neither contains & (to avoid
  //    splitting duo names like "Earth, Wind & Fire" incorrectly won't appear
  //    since the comma format is from APIs that list separate artists).
  //    Require 2+ artists without & in either part to be safe.
  const commaParts = artistStr
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
  if (commaParts.length >= 3) {
    return { main: commaParts[0], feats: commaParts.slice(1) };
  }
  if (
    commaParts.length === 2 &&
    !commaParts[0].includes("&") &&
    !commaParts[1].includes("&")
  ) {
    return { main: commaParts[0], feats: [commaParts[1]] };
  }

  // 4. No feat found — treat the whole string as one artist
  //    (handles duos like "Bigflo & Oli", "Macklemore & Ryan Lewis")
  return { main: artistStr, feats: [] };
}

export function buildTrack({
  artist,
  title,
  cover,
  preview_url,
  custom_artist,
  custom_title,
  custom_feats,
  extraAnswers,
  id,
  external_id,
  youtube_id,
  card = null,
  addedAt = null,
}) {
  const effectiveArtist = custom_artist || artist;
  const { main, feats: parsedFeats } = parseFeaturing(effectiveArtist || "");
  const effectiveFeats = Array.isArray(custom_feats)
    ? custom_feats
    : parsedFeats;
  const effectiveTitle = custom_title || title || "";
  const extras = (extraAnswers || []).map((e) => ({
    label: e.label,
    value: e.value,
    clean: cleanString(e.value),
  }));
  return {
    artist: effectiveArtist,
    mainArtist: main,
    featArtists: effectiveFeats,
    title: effectiveTitle,
    cleanArtist: cleanString(main),
    cleanFeatArtists: effectiveFeats.map(cleanString),
    cleanTitle: cleanString(effectiveTitle),
    cover: cover || "",
    preview_url: preview_url || null,
    id,
    external_id,
    youtube_id,
    extraAnswers: extras,
    // Jamais envoyés au client pendant la manche (règle anti-spoiler)
    card,
    addedAt,
  };
}

// Métadonnées canoniques d'une ligne de liaison : catalogue `tracks` joint.
export function trackMeta(row) {
  return row.tracks;
}

export function buildTrackFromRow(row) {
  const meta = trackMeta(row);
  return buildTrack({
    artist: meta.artist,
    title: meta.title,
    cover: meta.cover_url,
    preview_url: meta.preview_url,
    custom_artist: row.custom_artist || null,
    custom_title: row.custom_title || null,
    custom_feats: row.custom_feats || null,
    extraAnswers: (row.track_answers || []).map((a) => ({
      label: a.answer_types?.name || "",
      value: a.value,
    })),
    id: meta.id,
    external_id: meta.external_id,
    youtube_id: meta.youtube_id,
    card: toCardView(meta.cards),
    addedAt: row.created_at,
  });
}

export const TRACK_ROW_SELECT = `id, position, created_at, custom_artist, custom_title, custom_feats, tracks(id, artist, title, cover_url, preview_url, external_id, youtube_id, source, preview_expires_at, cards(${CARD_SELECT})), track_answers(value, answer_types(name))`;

export function calcSpeedBonus(timeTaken) {
  if (timeTaken < 10) return 2;
  if (timeTaken < 20) return 1;
  return 0;
}

export function makeCache(ttlMs) {
  let _data = null,
    _exp = 0;
  return {
    get() {
      return _exp > Date.now() ? _data : null;
    },
    set(v) {
      _data = v;
      _exp = Date.now() + ttlMs;
    },
    clear() {
      _exp = 0;
    },
  };
}

// ─── Deezer preview refresh ───────────────────────────────────────────────────

const PREVIEW_REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours de marge
const PREVIEW_PERMANENT_EXPIRY = "2099-01-01T00:00:00.000Z"; // iTunes & URLs sans token
const REFRESH_CONCURRENCY = 8;

// Reçoit des lignes de liaison jointes (row.tracks) ou des lignes brutes du
// catalogue enveloppées ({ tracks: row }). Déduplique par titre canonique :
// 1 update par titre, quel que soit le nombre de playlists qui le contiennent.
export async function refreshExpiredPreviews(trackRows) {
  const now = Date.now();

  const targets = new Map();
  for (const row of trackRows) {
    const meta = trackMeta(row);
    if (!meta.preview_url) continue;
    const expiresAt = meta.preview_expires_at
      ? new Date(meta.preview_expires_at).getTime()
      : (parseExpFromUrl(meta.preview_url) ?? 0) * 1000;
    if (expiresAt >= now + PREVIEW_REFRESH_MARGIN_MS) continue;

    const key = meta.id;
    if (!targets.has(key)) targets.set(key, { meta, row, metas: [] });
    targets.get(key).metas.push(meta);
  }

  const toRefresh = [...targets.values()];
  if (!toRefresh.length) return;

  console.log(`Refresh preview_url: ${toRefresh.length} titres expirés...`);
  let updated = 0;

  for (let i = 0; i < toRefresh.length; i += REFRESH_CONCURRENCY) {
    const batch = toRefresh.slice(i, i + REFRESH_CONCURRENCY);
    await Promise.allSettled(
      batch.map(async ({ meta, row, metas }) => {
        try {
          let freshUrl = meta.external_id
            ? await fetchDeezerTrackPreview(meta.external_id)
            : null;

          if (!freshUrl) {
            const artist = row.custom_artist || meta.artist;
            const title = row.custom_title || meta.title;
            freshUrl = await iTunesPreviewSearch(artist, title);
          }

          if (!freshUrl) return;

          const exp = parseExpFromUrl(freshUrl);
          await getAdminClient()
            .from("tracks")
            .update({
              preview_url: freshUrl,
              preview_expires_at: exp
                ? new Date(exp * 1000).toISOString()
                : PREVIEW_PERMANENT_EXPIRY,
            })
            .eq("id", meta.id);
          for (const m of metas) m.preview_url = freshUrl;
          updated++;
        } catch {
          /* skip */
        }
      }),
    );
  }

  console.log(
    `Refresh terminé: ${updated}/${toRefresh.length} titres mis à jour`,
  );
}

// ─── Playlist loading ─────────────────────────────────────────────────────────

function dedup(tracks) {
  const seen = new Set();
  return tracks.filter((t) => {
    const key = t.cleanArtist + "|" + t.cleanTitle;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// fresh : relit la base (lancement de partie). Les playlists sont modifiées
// depuis le navigateur, le serveur ne voit pas passer ces changements.
export async function loadPlaylist(roomId, { fresh = false } = {}) {
  if (customRooms[roomId]) return customRooms[roomId].tracks;
  const cached = playlistCache[roomId];
  if (cached?.length > 0 && !fresh) return cached;
  const tracks = await fetchPlaylist(roomId);
  // Base indisponible : la dernière version connue plutôt qu'une partie bloquée
  return tracks.length ? tracks : (cached ?? []);
}

async function fetchPlaylist(roomId) {
  // Client service : les playlists d'une room privée sont invisibles en anonyme
  const db = getAdminClient();
  const dbRoom = dbRooms[roomId];
  if (!dbRoom) {
    console.warn(`Room "${roomId}": aucun fallback disponible`);
    return [];
  }

  // Essayer d'abord room_playlists (multi-playlist)
  try {
    const { data: links } = await db
      .from("room_playlists")
      .select("playlist_id, position")
      .eq("room_id", dbRoom.id)
      .order("position");

    if (links?.length > 0) {
      const playlistIds = links.map((l) => l.playlist_id);
      const { data: trackRows } = await db
        .from("custom_playlist_tracks")
        .select(TRACK_ROW_SELECT)
        .in("playlist_id", playlistIds)
        .order("position");

      if (trackRows?.length >= 3) {
        const tracks = dedup(trackRows.map(buildTrackFromRow));
        playlistCache[roomId] = tracks;
        console.log(
          `Room DB "${roomId}": ${tracks.length} titres chargés (${playlistIds.length} playlist(s))`,
        );
        return tracks;
      }
    }
  } catch {
    /* fallback vers playlist_id legacy */
  }

  // Fallback : playlist_id unique (legacy)
  if (dbRoom.playlist_id) {
    try {
      const { data: trackRows } = await db
        .from("custom_playlist_tracks")
        .select(TRACK_ROW_SELECT)
        .eq("playlist_id", dbRoom.playlist_id)
        .order("position");
      if (trackRows?.length >= 3) {
        const tracks = dedup(trackRows.map(buildTrackFromRow));
        playlistCache[roomId] = tracks;
        console.log(
          `Room DB "${roomId}": ${tracks.length} titres chargés (legacy)`,
        );
        return tracks;
      }
    } catch {
      /* rien */
    }
    return [];
  }

  console.warn(`Room "${roomId}": aucune playlist configurée`);
  return [];
}
