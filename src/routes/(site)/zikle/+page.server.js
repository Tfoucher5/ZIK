import { getAdminClient } from "$lib/server/config.js";
import {
  refreshZiklePool,
  getOrCreateDailySong,
  getDayNumber,
} from "$lib/server/services/zikle.js";

export async function load() {
  const sb = getAdminClient();
  await refreshZiklePool(sb);
  const daily = await getOrCreateDailySong(sb);
  if (!daily) return { date: null, dayNumber: null, previewUrl: null };

  const [{ data: track }, dayNumber] = await Promise.all([
    sb.from("tracks").select("preview_url").eq("id", daily.trackId).single(),
    getDayNumber(sb, daily.date),
  ]);

  return {
    date: daily.date,
    dayNumber,
    previewUrl: track?.preview_url ?? null,
  };
}
