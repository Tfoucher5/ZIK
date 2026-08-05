import { error, redirect } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { refreshExpiredPreviews } from "$lib/server/services/playlist.js";
import { getDayNumber, todayParis } from "$lib/server/services/zikle.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function load({ params }) {
  if (!DATE_RE.test(params.date)) throw error(400, "Date invalide");
  const today = todayParis();
  if (params.date >= today) throw redirect(302, "/zikle");

  const sb = getAdminClient();
  const { data: song, error: songErr } = await sb
    .from("daily_songs")
    .select(
      "track_id, tracks(preview_url, preview_expires_at, external_id, artist, title)",
    )
    .eq("date", params.date)
    .single();
  if (songErr || !song) throw error(404, "Pas de Zikle pour cette date");
  if (song.tracks) await refreshExpiredPreviews([{ tracks: song.tracks }]);

  const dayNumber = await getDayNumber(sb, params.date);
  return {
    date: params.date,
    dayNumber,
    previewUrl: song.tracks?.preview_url ?? null,
  };
}
