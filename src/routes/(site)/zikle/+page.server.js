import { getAdminClient } from "$lib/server/config.js";
import { refreshExpiredPreviews } from "$lib/server/services/playlist.js";
import {
  refreshZiklePool,
  getOrCreateDailySong,
  getDayNumber,
} from "$lib/server/services/zikle.js";

export async function load() {
  const sb = getAdminClient();
  await refreshZiklePool(sb).catch((e) =>
    console.error("[zikle] refreshZiklePool:", e.message),
  );
  const daily = await getOrCreateDailySong(sb);
  if (!daily) return { date: null, dayNumber: null, previewUrl: null };

  const [{ data: track }, dayNumber] = await Promise.all([
    sb
      .from("tracks")
      .select("preview_url, preview_expires_at, external_id, artist, title")
      .eq("id", daily.trackId)
      .single(),
    getDayNumber(sb, daily.date),
  ]);
  if (track) await refreshExpiredPreviews([{ tracks: track }]);

  return {
    date: daily.date,
    dayNumber,
    previewUrl: track?.preview_url ?? null,
  };
}
