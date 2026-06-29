import { execFile } from "child_process";
import { promisify } from "util";
import { ytdlAudioCache } from "../../ytdlCache.js";
import { YTDLP_BIN, getYtAudioUrl } from "../../ytdlAudio.js";
import { roomGames } from "../../state.js";

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

export function previewCacheKey(track) {
  return `prev_${(track.cleanArtist + track.cleanTitle).replace(/\W/g, "").slice(0, 32)}`;
}

export function validPreviewUrl(url) {
  if (!url) return null;
  const m = url.match(/hdnea=exp=(\d+)/);
  if (m && parseInt(m[1], 10) * 1000 < Date.now()) return null;
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

export async function prefetchNextRound(roomId) {
  const room = roomGames[roomId];
  if (!room) return;
  const game = room.game;
  if (game.sessionPlaylist.length === 0) return;

  const nextTrack = game.sessionPlaylist[game.sessionPlaylist.length - 1];
  if (!nextTrack) return;

  try {
    const artist = nextTrack.mainArtist || nextTrack.artist;
    const video = await ytsSearch(artist, nextTrack.title);

    let videoId = null,
      startSeconds = 0,
      ytAudio = null;

    if (video) {
      videoId = video.id;
      const durationSec = Math.round((video.duration || 0) / 1000);
      startSeconds = Math.max(
        0,
        Math.floor(
          Math.random() * Math.max(1, durationSec - game.roundDuration - 10),
        ),
      );
      ytAudio = await Promise.race([
        getYtAudioUrl(videoId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (ytAudio) ytdlAudioCache.set(videoId, ytAudio);
    }

    // Preview seulement si pas de videoId du tout
    if (!ytAudio && !videoId) {
      const previewUrl =
        validPreviewUrl(nextTrack.preview_url) ||
        (await getDeezerPreview(artist, nextTrack.title).catch(() => null)) ||
        (await getItunesPreview(artist, nextTrack.title).catch(() => null));
      if (previewUrl) {
        const pKey = previewCacheKey(nextTrack);
        ytdlAudioCache.set(pKey, {
          url: previewUrl,
          mimeType: "audio/mpeg",
          fetchedAt: Date.now(),
        });
        videoId = pKey;
        startSeconds = 0;
        ytAudio = { url: previewUrl };
      }
    }

    const room2 = roomGames[roomId];
    if (!room2 || room2.game !== game) return;
    if (game.sessionPlaylist[game.sessionPlaylist.length - 1] !== nextTrack)
      return;

    game.prefetchedRound = { track: nextTrack, videoId, startSeconds, ytAudio };
  } catch {
    // Échec silencieux — startNextRound fera le fetch normalement
  }
}
