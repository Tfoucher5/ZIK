import { ytdlAudioCache, audioKeyFor } from "$lib/server/ytdlCache.js";
import { getYtAudioUrl } from "$lib/server/ytdlAudio.js";
import { refreshPreview } from "$lib/server/socket/game/audio.js";

const TTL = 2 * 60 * 60 * 1000;

export async function GET({ url, request }) {
  const videoId = audioKeyFor(url.searchParams.get("v"));
  if (!videoId) return new Response("Unknown audio", { status: 404 });

  let entry = ytdlAudioCache.get(videoId);
  if (!entry || Date.now() - entry.fetchedAt > TTL) {
    return new Response("Audio not cached", { status: 404 });
  }

  const range = request.headers.get("range");

  let upstream = await fetch(entry.url, {
    headers: range ? { Range: range } : {},
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  // URL expirée (403 ou erreur réseau) — régénérer via Deezer/iTunes ou yt-dlp
  if (!upstream || upstream.status === 403) {
    try {
      ytdlAudioCache.delete(videoId);
      entry = videoId.startsWith("prev_")
        ? await refreshPreview(videoId, entry)
        : await getYtAudioUrl(videoId);
      upstream = await fetch(entry.url, {
        headers: range ? { Range: range } : {},
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      console.warn(`[audio] régénération KO pour ${videoId}`);
      return new Response("Audio unavailable", { status: 503 });
    }
  }

  if (!upstream || upstream.status >= 400) {
    console.warn(
      `[audio] ${videoId} indisponible — upstream ${upstream?.status ?? "injoignable"}, Range "${range ?? "aucun"}"`,
    );
    return new Response("Audio unavailable", { status: 503 });
  }

  const headers = new Headers({
    "Content-Type": entry.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  });
  const contentRange = upstream.headers.get("content-range");
  const contentLength = upstream.headers.get("content-length");
  if (contentRange) headers.set("Content-Range", contentRange);
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(upstream.body, { status: upstream.status, headers });
}
