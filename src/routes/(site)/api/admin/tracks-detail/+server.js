import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { loadAnswerTypes } from "$lib/admin/contenu.server.js";

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Titre manquant" }, { status: 400 });

  const sb = getAdminClient();
  const [track, entries, stats, issues, zikle, types] = await Promise.all([
    sb
      .from("tracks")
      .select(
        "id, artist, title, cover_url, preview_url, preview_expires_at, youtube_id, youtube_start, source, external_id, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    sb
      .from("custom_playlist_tracks")
      .select(
        "id, playlist_id, custom_artist, custom_title, custom_feats, custom_playlists(name, emoji, is_official), track_answers(id, answer_type_id, value)",
      )
      .eq("track_id", id),
    sb
      .from("track_stats")
      .select("rounds_played, players_exposed, found_full, last_played_at")
      .eq("track_id", id)
      .maybeSingle(),
    sb
      .from("track_issues")
      .select("kind, count, note, updated_at")
      .eq("track_id", id)
      .eq("status", "open"),
    sb
      .from("daily_songs")
      .select("date")
      .eq("track_id", id)
      .order("date", { ascending: false }),
    loadAnswerTypes(),
  ]);

  if (!track.data) return json({ error: "Titre introuvable" }, { status: 404 });

  return json({
    track: track.data,
    entries: entries.data ?? [],
    stats: stats.data ?? null,
    issues: issues.data ?? [],
    zikle: (zikle.data ?? []).map((d) => d.date),
    types,
  });
}
