import { execFile } from "child_process";
import { promisify } from "util";
import { ytdlAudioCache, audioUrlFor } from "../../ytdlCache.js";
import { YTDLP_BIN, getYtAudioUrl } from "../../ytdlAudio.js";
import { roomGames } from "../../state.js";
import { fetchDeezerTrackPreview } from "../../services/deezer.js";
import { pickStart } from "../../services/trackIssues.js";

const execFileAsync = promisify(execFile);

export async function ytsSearch(artist, title) {
  try {
    const { stdout } = await execFileAsync(
      YTDLP_BIN,
      [
        `ytsearch5:${artist} - ${title}`,
        "--flat-playlist",
        "-j",
        "--no-warnings",
        "--socket-timeout",
        "8",
      ],
      { timeout: 12000, maxBuffer: 2 * 1024 * 1024 },
    );
    const results = stdout
      .trim()
      .split("\n")
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (!results.length) return null;
    const topic = results.find(
      (v) => v.channel?.endsWith("- Topic") || v.uploader?.endsWith("- Topic"),
    );
    const picked = topic || results[0];
    return {
      id: picked.id,
      duration: (picked.duration || 0) * 1000,
      channel: { name: picked.channel || picked.uploader || "" },
    };
  } catch {
    return null;
  }
}

// Infos d'une vidéo précise, au format de `ytsSearch` pour être substituable.
// La durée sert à tirer le point de départ de l'extrait.
export async function ytVideoInfo(videoId) {
  const { stdout } = await execFileAsync(
    YTDLP_BIN,
    [
      `https://www.youtube.com/watch?v=${videoId}`,
      "-j",
      "--no-playlist",
      "--no-warnings",
      "--socket-timeout",
      "8",
    ],
    { timeout: 12000, maxBuffer: 20 * 1024 * 1024 },
  );
  const info = JSON.parse(stdout);
  return {
    id: info.id,
    duration: (info.duration || 0) * 1000,
    channel: { name: info.channel || info.uploader || "" },
  };
}

// Une vidéo épinglée court-circuite la recherche : c'est un choix humain, il
// prime sur l'heuristique. Si son interrogation échoue, on l'utilise quand même
// — l'extrait démarrera au début faute de connaître la durée.
export async function resolveVideo(artist, track) {
  if (track.youtube_id) {
    const info = await ytVideoInfo(track.youtube_id).catch(() => null);
    return info ?? { id: track.youtube_id, duration: 0, channel: { name: "" } };
  }
  return ytsSearch(artist, track.title);
}

// Départ de l'extrait : celui réglé dans l'admin pour une vidéo épinglée,
// sinon au hasard dans la vidéo.
export function videoStart(track, video, roundDuration) {
  return pickStart({
    pinned: track.youtube_id === video.id ? track.youtube_start : null,
    durationSec: Math.round((video.duration || 0) / 1000),
    roundDuration,
    minStart: 0,
  });
}

export function previewCacheKey(track) {
  return `prev_${(track.cleanArtist + track.cleanTitle).replace(/\W/g, "").slice(0, 32)}`;
}

// Seuls les CDN Deezer et iTunes servent un fichier audio : un lien YouTube ou
// Spotify stocké en preview_url n'est pas lisible par <audio>.
const PREVIEW_HOST_RE = /^https:\/\/[\w.-]+\.(dzcdn\.net|itunes\.apple\.com)\//;
// Un lien Deezer ne vit que ~15 min : il doit tenir jusqu'à la fin de la manche
const PREVIEW_MARGIN_MS = 2 * 60 * 1000;

export function validPreviewUrl(url) {
  if (!url || !PREVIEW_HOST_RE.test(url)) return null;
  const m = url.match(/hdnea=exp=(\d+)/);
  if (m && parseInt(m[1], 10) * 1000 < Date.now() + PREVIEW_MARGIN_MS)
    return null;
  return url;
}

export async function getDeezerPreview(artist, title) {
  const q = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=5`, {
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  return data.data?.[0]?.preview || null;
}

export async function getItunesPreview(artist, title) {
  const q = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(
    `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );
  const data = await res.json();
  return data.results?.[0]?.previewUrl || null;
}

async function findPreview({ artist, title, externalId }) {
  return (
    (externalId && (await fetchDeezerTrackPreview(externalId))) ||
    (await getDeezerPreview(artist, title).catch(() => null)) ||
    (await getItunesPreview(artist, title).catch(() => null))
  );
}

function cachePreview(pKey, query, url) {
  const entry = { url, mimeType: "audio/mpeg", fetchedAt: Date.now(), query };
  ytdlAudioCache.set(pKey, entry);
  return entry;
}

// Lien d'extrait lisible pour la manche. Résolu au dernier moment plutôt que
// stocké : un lien Deezer expire trop vite pour être rafraîchi à l'avance.
export async function getPreview(track) {
  const pKey = previewCacheKey(track);
  const cached = ytdlAudioCache.get(pKey);
  if (validPreviewUrl(cached?.url)) return { pKey, entry: cached };

  const query = {
    artist: track.mainArtist || track.artist,
    title: track.title,
    // Seuls les titres importés de Deezer ont un id numérique Deezer
    externalId: /^\d+$/.test(track.external_id ?? "")
      ? track.external_id
      : null,
  };
  const url = validPreviewUrl(track.preview_url) || (await findPreview(query));
  return url ? { pKey, entry: cachePreview(pKey, query, url) } : null;
}

// Lien expiré en cours de lecture (403) : on en redemande un frais
export async function refreshPreview(pKey, entry) {
  const url = await findPreview(entry.query);
  if (!url) throw new Error("Aucun extrait");
  return cachePreview(pKey, entry.query, url);
}

export async function prefetchNextRound(roomId, io) {
  const room = roomGames[roomId];
  if (!room) return;
  const game = room.game;
  if (game.sessionPlaylist.length === 0) return;

  const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
  if (!nextTrack) return;

  try {
    const artist = nextTrack.mainArtist || nextTrack.artist;
    const video = await resolveVideo(artist, nextTrack);

    let videoId = null,
      startSeconds = 0,
      ytAudio = null;

    if (video) {
      videoId = video.id;
      startSeconds = videoStart(nextTrack, video, game.roundDuration);
      ytAudio = await Promise.race([
        getYtAudioUrl(videoId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (ytAudio) ytdlAudioCache.set(videoId, ytAudio);
    }

    // yt-dlp KO : l'extrait est prêt avant la manche au lieu d'être cherché
    // pendant l'écran de chargement
    if (!ytAudio) {
      const preview = await getPreview(nextTrack);
      if (preview) {
        videoId = preview.pKey;
        startSeconds = 0;
        ytAudio = preview.entry;
      }
    }

    const room2 = roomGames[roomId];
    if (!room2 || room2.game !== game) return;
    if (game.sessionPlaylist[game.sessionPlaylist.length - 1] !== nextTrack)
      return;

    const audioUrl = ytAudio ? audioUrlFor(videoId) : null;
    game.prefetchedRound = {
      track: nextTrack,
      videoId,
      startSeconds,
      ytAudio,
      audioUrl,
    };
    // Les joueurs téléchargent l'extrait pendant la manche en cours : la
    // suivante démarre sans attendre le réseau.
    if (audioUrl) io.to(`room:${roomId}`).emit("next_audio", { audioUrl });
  } catch {
    // Échec silencieux — startNextRound fera le fetch normalement
  }
}
