import { getAdminClient } from "$lib/server/config.js";
import { playlistCache, dbRooms } from "$lib/server/state.js";

// Vide le cache des rooms qui jouent ces playlists : la prochaine partie relit la base.
export async function forgetPlaylists(playlistIds) {
  if (!playlistIds.length) return;
  const sb = getAdminClient();
  const [{ data: links }, { data: linked }] = await Promise.all([
    sb.from("room_playlists").select("room_id").in("playlist_id", playlistIds),
    sb
      .from("custom_playlists")
      .select("linked_room_id")
      .in("id", playlistIds)
      .not("linked_room_id", "is", null),
  ]);
  const roomIds = new Set((links ?? []).map((l) => l.room_id));
  for (const l of linked ?? []) delete playlistCache[l.linked_room_id];
  for (const [code, room] of Object.entries(dbRooms)) {
    if (roomIds.has(room.id) || playlistIds.includes(room.playlist_id))
      delete playlistCache[code];
  }
}

export async function loadAnswerTypes() {
  const { data } = await getAdminClient()
    .from("answer_types")
    .select("id, name")
    .order("id");
  return data ?? [];
}

// Les réponses alternatives sont rattachées à chaque ligne de playlist d'un titre.
export async function addAnswers(entryIds, typeId, value) {
  const v = String(value ?? "").trim();
  const type = Number(typeId);
  if (!entryIds.length || !v || !Number.isInteger(type))
    return "Choisis un type et écris la réponse.";
  const sb = getAdminClient();
  const { data: existing } = await sb
    .from("track_answers")
    .select("track_id, value")
    .in("track_id", entryIds)
    .eq("answer_type_id", type);
  const taken = new Set(
    (existing ?? [])
      .filter((a) => a.value.toLowerCase() === v.toLowerCase())
      .map((a) => a.track_id),
  );
  const rows = entryIds
    .filter((id) => !taken.has(id))
    .map((id) => ({ track_id: id, answer_type_id: type, value: v }));
  if (!rows.length) return "Cette réponse est déjà acceptée.";
  const { error } = await sb.from("track_answers").insert(rows);
  if (error) return error.message;
  const { data: entries } = await sb
    .from("custom_playlist_tracks")
    .select("playlist_id")
    .in("id", entryIds);
  await forgetPlaylists([
    ...new Set((entries ?? []).map((e) => e.playlist_id)),
  ]);
  return null;
}

export async function removeAnswers(answerIds) {
  const { data, error } = await getAdminClient()
    .from("track_answers")
    .delete()
    .in("id", answerIds)
    .select("value, custom_playlist_tracks(playlist_id)");
  if (error) return { error: error.message };
  await forgetPlaylists([
    ...new Set(
      (data ?? [])
        .map((a) => a.custom_playlist_tracks?.playlist_id)
        .filter(Boolean),
    ),
  ]);
  return { value: data?.[0]?.value };
}
