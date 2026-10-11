import { getAdminClient } from "../config.js";
import { ytsCandidates, ytVideoInfo } from "../socket/game/audio.js";
import { extractYoutubeId } from "../../youtube.js";

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map();

// Même clé que la colonne générée `tracks.norm_key`.
function normKey(artist, title) {
  return `${artist.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
}

async function catalogTrack(artist, title) {
  const { data } = await getAdminClient()
    .from("tracks")
    .select("id, youtube_id")
    .eq("norm_key", normKey(artist, title))
    .maybeSingle();
  return data;
}

// Versions proposées au joueur. Une vidéo déjà fixée au catalogue verrouille
// le titre : le choix d'un joueur n'écrase jamais celui d'un autre.
export async function listVersions(artist, title) {
  const track = await catalogTrack(artist, title);
  if (track?.youtube_id)
    return { locked: true, trackId: track.id, video: { id: track.youtube_id } };

  const key = normKey(artist, title);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  const { results, autoIndex } = await ytsCandidates(artist, title);
  const value = {
    locked: false,
    candidates: results.map((v) => ({
      id: v.id,
      title: v.title,
      channel: v.channel.name,
      duration: Math.round(v.duration / 1000),
    })),
    autoId: results[autoIndex]?.id ?? null,
  };
  if (results.length) cache.set(key, { value, exp: Date.now() + CACHE_TTL });
  for (const [k, v] of cache) if (v.exp < Date.now()) cache.delete(k);
  return value;
}

// ID validé et vidéo existante, sinon null.
export async function checkVideo(input) {
  const id = extractYoutubeId(input);
  if (!id) return null;
  const info = await ytVideoInfo(id).catch(() => null);
  return info?.id ?? null;
}

export async function pinVideoIfEmpty(trackId, youtubeId) {
  const { data, error } = await getAdminClient()
    .from("tracks")
    .update({ youtube_id: youtubeId })
    .eq("id", trackId)
    .is("youtube_id", null)
    .select("id");
  if (error) throw new Error(error.message);
  return data.length > 0;
}
