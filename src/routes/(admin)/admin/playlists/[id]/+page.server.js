import { error, redirect } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { forgetPlaylists, loadAnswerTypes } from "$lib/admin/contenu.server.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id) {
  if (!UUID_RE.test(id)) throw error(400, "ID invalide");
}

export async function load({ params }) {
  assertUuid(params.id);
  const sb = getAdminClient();

  const [playlistRes, tracksRes, types] = await Promise.all([
    sb
      .from("custom_playlists")
      .select(
        "id, name, emoji, owner_id, is_public, is_official, linked_room_id, track_count, created_at, updated_at, profiles!owner_id(username)",
      )
      .eq("id", params.id)
      .single(),
    sb
      .from("custom_playlist_tracks")
      .select(
        "id, position, custom_artist, custom_title, custom_feats, track_answers(id, answer_type_id, value), tracks(id, artist, title, preview_url, cover_url, source, youtube_id, youtube_start)",
      )
      .eq("playlist_id", params.id)
      .order("position", { ascending: true }),
    loadAnswerTypes(),
  ]);

  if (playlistRes.error || !playlistRes.data)
    throw error(404, "Playlist introuvable");
  const playlist = playlistRes.data;
  const rows = tracksRes.data ?? [];

  const trackIds = rows.map((r) => r.tracks?.id).filter(Boolean);
  const [issuesRes, playsRes] = await Promise.all([
    trackIds.length
      ? sb
          .from("track_issues")
          .select("track_id")
          .eq("status", "open")
          .in("track_id", trackIds)
      : Promise.resolve({ data: [] }),
    playlist.linked_room_id
      ? sb
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("room_id", playlist.linked_room_id)
      : Promise.resolve({ count: null }),
  ]);
  const reported = new Set((issuesRes.data ?? []).map((i) => i.track_id));

  return {
    playlist,
    plays: playsRes.count,
    types,
    tracks: rows.map(({ tracks: track, track_answers, ...entry }) => ({
      ...entry,
      answers: track_answers ?? [],
      track,
      reported: reported.has(track?.id),
    })),
  };
}

export const actions = {
  addTrack: async ({ request, params, locals }) => {
    assertUuid(params.id);
    const fd = await request.formData();
    const trackId = fd.get("track_id");
    if (!trackId) return { success: false, error: "Choisis un titre." };
    const sb = getAdminClient();

    const { data: last } = await sb
      .from("custom_playlist_tracks")
      .select("position")
      .eq("playlist_id", params.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: track } = await sb
      .from("tracks")
      .select("artist, title")
      .eq("id", trackId)
      .single();

    const { error: err } = await sb.from("custom_playlist_tracks").insert({
      playlist_id: params.id,
      track_id: trackId,
      position: (last?.position ?? -1) + 1,
    });
    if (err) return { success: false, error: err.message };
    await forgetPlaylists([params.id]);
    await logAdminAction(locals.adminId, "add_track", params.id, "playlist", {
      track_id: trackId,
      artist: track?.artist,
      title: track?.title,
    });
    return { success: true };
  },

  deleteTrack: async ({ request, params, locals }) => {
    assertUuid(params.id);
    const fd = await request.formData();
    const entryId = fd.get("track_id");
    const sb = getAdminClient();
    const { data: row } = await sb
      .from("custom_playlist_tracks")
      .select("tracks(artist, title)")
      .eq("id", entryId)
      .single();
    const { error: err } = await sb
      .from("custom_playlist_tracks")
      .delete()
      .eq("id", entryId);
    if (err) return { success: false, error: err.message };
    await forgetPlaylists([params.id]);
    await logAdminAction(
      locals.adminId,
      "delete_track",
      params.id,
      "playlist",
      {
        track_id: entryId,
        artist: row?.tracks?.artist,
        title: row?.tracks?.title,
      },
    );
    return { success: true };
  },

  reorderTrack: async ({ request, params, locals }) => {
    assertUuid(params.id);
    const fd = await request.formData();
    const entryId = fd.get("track_id");
    const direction = fd.get("direction");
    if (!["up", "down"].includes(direction))
      throw error(400, "Direction invalide");
    const sb = getAdminClient();
    const { data: rows } = await sb
      .from("custom_playlist_tracks")
      .select("id, position")
      .eq("playlist_id", params.id)
      .order("position", { ascending: true });
    if (!rows) return { success: false, error: "Titres introuvables" };

    const idx = rows.findIndex((t) => t.id === entryId);
    if (idx === -1) return { success: false, error: "Titre introuvable" };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= rows.length) return { success: true };

    const a = rows[idx];
    const b = rows[swapIdx];
    await sb
      .from("custom_playlist_tracks")
      .update({ position: b.position })
      .eq("id", a.id);
    await sb
      .from("custom_playlist_tracks")
      .update({ position: a.position })
      .eq("id", b.id);
    await forgetPlaylists([params.id]);
    await logAdminAction(
      locals.adminId,
      "reorder_tracks",
      params.id,
      "playlist",
      {
        moved_track_id: entryId,
        direction,
        old_position: a.position,
        new_position: b.position,
      },
    );
    return { success: true };
  },

  editTrackMeta: async ({ request, params, locals }) => {
    assertUuid(params.id);
    const fd = await request.formData();
    const entryId = fd.get("track_id");
    const custom_artist = fd.get("custom_artist")?.trim() || null;
    const custom_title = fd.get("custom_title")?.trim() || null;
    const featsRaw = fd.get("custom_feats")?.trim() || "";
    const custom_feats = featsRaw
      ? featsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const { error: err } = await getAdminClient()
      .from("custom_playlist_tracks")
      .update({ custom_artist, custom_title, custom_feats })
      .eq("id", entryId);
    if (err) return { success: false, error: err.message };
    await forgetPlaylists([params.id]);
    await logAdminAction(
      locals.adminId,
      "edit_track_meta",
      params.id,
      "playlist",
      { track_id: entryId, custom_artist, custom_title, custom_feats },
    );
    return { success: true };
  },

  deletePlaylist: async ({ params, locals }) => {
    assertUuid(params.id);
    const sb = getAdminClient();
    const { data: playlist } = await sb
      .from("custom_playlists")
      .select("name, track_count")
      .eq("id", params.id)
      .single();
    await forgetPlaylists([params.id]);
    const { error: err } = await sb
      .from("custom_playlists")
      .delete()
      .eq("id", params.id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(
      locals.adminId,
      "delete_playlist",
      params.id,
      "playlist",
      { name: playlist?.name, track_count: playlist?.track_count },
    );
    redirect(302, "/admin/playlists");
  },
};
