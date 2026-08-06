export { todayParis } from "../../zikle/shared.js";

import { getFetch } from "./fetch.js";
import { parseExpFromUrl } from "./deezer.js";

const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const DEEZER_CHART_URL = "https://api.deezer.com/chart/0/tracks?limit=100";
const PERMANENT_EXPIRY = "2099-01-01T00:00:00.000Z";

export function mapDeezerChartTracks(json) {
  const list = json?.data || [];
  return list
    .filter((t) => t?.preview && t?.artist?.name && t?.title)
    .map((t) => {
      const exp = parseExpFromUrl(t.preview);
      return {
        artist: t.artist.name,
        title: t.title,
        preview_url: t.preview,
        preview_expires_at: exp
          ? new Date(exp * 1000).toISOString()
          : PERMANENT_EXPIRY,
        cover_url: t.album?.cover_xl || t.album?.cover_big || null,
        external_id: String(t.id),
        source: "deezer",
      };
    });
}

export async function refreshZiklePool(sb, force = false) {
  if (!force) {
    const { data: latest } = await sb
      .from("zikle_pool")
      .select("added_at")
      .order("added_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latest &&
      Date.now() - new Date(latest.added_at).getTime() < REFRESH_INTERVAL_MS
    ) {
      return { refreshed: false, added: 0 };
    }
  }

  const fetchFn = await getFetch();
  const res = await fetchFn(DEEZER_CHART_URL, {
    headers: { "User-Agent": "ZIK-BlindTest/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const candidates = mapDeezerChartTracks(json);
  if (!candidates.length) return { refreshed: false, added: 0 };

  const { data: ids, error } = await sb.rpc("resolve_tracks", {
    p_tracks: candidates,
  });
  if (error) throw error;

  const rows = (ids || []).map((track_id) => ({ track_id }));
  if (!rows.length) return { refreshed: false, added: 0 };

  const { error: insErr } = await sb
    .from("zikle_pool")
    .upsert(rows, { onConflict: "track_id", ignoreDuplicates: true });
  if (insErr) throw insErr;

  return { refreshed: true, added: rows.length };
}

export async function getOrCreateDailySong(sb) {
  const { data, error } = await sb.rpc("pick_daily_song");
  if (error) throw error;
  const row = data?.[0];
  if (!row?.track_id) return null;
  return { date: row.date, trackId: row.track_id };
}

export async function getDayNumber(sb, date) {
  const { count, error } = await sb
    .from("daily_songs")
    .select("id", { count: "exact", head: true })
    .lte("date", date);
  if (error) throw error;
  return count;
}
