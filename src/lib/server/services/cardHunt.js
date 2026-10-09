import { getAdminClient } from "../config.js";
import { createNotification } from "./notifications.js";
import { firstTime } from "./push.js";

const MIN_SET_SIZE = 3;

/**
 * Après un gain de cartes : prévient le joueur pour chaque set auquel il ne
 * manque plus qu'une carte, avec une room publique où elle passe. Le titre de
 * la carte manquante n'est jamais donné (silhouette, spec Q8).
 */
export async function notifySetsNearlyDone(userId, cardIds) {
  if (!cardIds.length) return;
  const sb = getAdminClient();
  const { data: links } = await sb
    .from("card_set_items")
    .select("set_id, card_sets!inner(id, kind, name, card_count, cover_url)")
    .in("card_id", cardIds)
    .gte("card_sets.card_count", MIN_SET_SIZE);

  const sets = new Map((links ?? []).map((l) => [l.set_id, l.card_sets]));
  for (const set of sets.values()) {
    const missing = await missingCards(sb, userId, set.id);
    if (missing.length !== 1) continue;
    if (!(await firstTime(`set_near:${userId}:${set.id}`))) continue;
    const room = await roomWithCard(sb, missing[0]);
    await createNotification({
      userId,
      type: "card_set_near",
      actorId: null,
      payload: {
        setId: set.id,
        kind: set.kind,
        setName: set.name,
        cover: set.cover_url,
        roomId: room?.code ?? null,
        roomCode: room?.code ?? null,
        roomName: room?.name ?? null,
        gameMode: room?.game_mode ?? "classic",
      },
    });
  }
}

async function missingCards(sb, userId, setId) {
  const { data: items } = await sb
    .from("card_set_items")
    .select("card_id")
    .eq("set_id", setId);
  const ids = (items ?? []).map((i) => i.card_id);
  const { data: owned } = await sb
    .from("user_cards")
    .select("card_id")
    .eq("user_id", userId)
    .in("card_id", ids);
  const have = new Set((owned ?? []).map((o) => o.card_id));
  return ids.filter((id) => !have.has(id));
}

// Room publique la plus active dont une playlist contient le titre de la carte
async function roomWithCard(sb, cardId) {
  const { data: tracks } = await sb
    .from("tracks")
    .select("id")
    .eq("card_id", cardId);
  if (!tracks?.length) return null;
  const { data: rows } = await sb
    .from("custom_playlist_tracks")
    .select("playlist_id")
    .in(
      "track_id",
      tracks.map((t) => t.id),
    );
  // Limité pour garder l'URL de la requête courte
  const pids = [...new Set((rows ?? []).map((r) => r.playlist_id))].slice(
    0,
    80,
  );
  if (!pids.length) return null;

  const { data: linked } = await sb
    .from("room_playlists")
    .select("room_id")
    .in("playlist_id", pids);
  const roomIds = [...new Set((linked ?? []).map((l) => l.room_id))].slice(
    0,
    80,
  );
  const filter = roomIds.length
    ? `playlist_id.in.(${pids.join(",")}),id.in.(${roomIds.join(",")})`
    : `playlist_id.in.(${pids.join(",")})`;
  const { data: rooms } = await sb
    .from("rooms")
    .select("code, name, game_mode")
    .eq("is_public", true)
    .or(filter)
    .order("last_active_at", { ascending: false, nullsFirst: false })
    .limit(1);
  return rooms?.[0] ?? null;
}
