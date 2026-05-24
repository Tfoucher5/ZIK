import { ytdlAudioCache } from "$lib/server/ytdlCache.js";
import { getYtAudioUrl } from "$lib/server/ytdlAudio.js";

const TTL = 2 * 60 * 60 * 1000;

export async function GET({ url, request }) {
  const videoId = url.searchParams.get("v");
  if (!videoId) return new Response("Missing video ID", { status: 400 });

  let entry = ytdlAudioCache.get(videoId);
  if (!entry || Date.now() - entry.fetchedAt > TTL) {
    return new Response("Audio not cached", { status: 404 });
  }

  const range = request.headers.get("range");

  let upstream = await fetch(entry.url, {
    headers: range ? { Range: range } : {},
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  // URL expirée (403 ou erreur réseau) — régénérer via yt-dlp si ce n'est pas un preview
  if ((!upstream || upstream.status === 403) && !videoId.startsWith("prev_")) {
    try {
      ytdlAudioCache.delete(videoId);
      entry = await getYtAudioUrl(videoId);
      upstream = await fetch(entry.url, {
        headers: range ? { Range: range } : {},
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return new Response("Audio unavailable", { status: 503 });
    }
  }

  if (!upstream || upstream.status >= 400) {
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
