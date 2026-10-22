import { randomBytes } from "crypto";

// Cache des URLs audio YouTube extraites via ytdl — survie au hot-reload
export const ytdlAudioCache = globalThis.__zik_ytdl_cache ?? new Map();
globalThis.__zik_ytdl_cache = ytdlAudioCache;
// entries: videoId -> { url, mimeType, fetchedAt }
// TTL 2h (les stream URLs YouTube expirent)

// Jeton opaque -> clé du cache. L'URL audio envoyée aux joueurs ne doit rien
// révéler : les clés d'extrait contiennent l'artiste et le titre, et un id
// YouTube se retrouve en une recherche. Indispensable depuis que le titre
// suivant est préchargé pendant la manche en cours.
const audioTokens = globalThis.__zik_audio_tokens ?? new Map();
globalThis.__zik_audio_tokens = audioTokens;
const TOKEN_TTL = 2 * 60 * 60 * 1000;

export function audioUrlFor(key) {
  const now = Date.now();
  for (const [t, v] of audioTokens) {
    if (now - v.at > TOKEN_TTL) audioTokens.delete(t);
  }
  const token = randomBytes(12).toString("base64url");
  audioTokens.set(token, { key, at: now });
  return `/api/game/audio?v=${token}`;
}

export function audioKeyFor(token) {
  return audioTokens.get(token)?.key ?? null;
}
