import { getAdminClient } from "../config.js";
import { createNotification } from "./notifications.js";

const db = () => getAdminClient();

export async function followerCount(venueId) {
  const { count } = await db()
    .from("venue_follows")
    .select("user_id", { count: "exact", head: true })
    .eq("venue_id", venueId);
  return count ?? 0;
}

export async function isFollowing(venueId, userId) {
  if (!userId) return false;
  const { data } = await db()
    .from("venue_follows")
    .select("user_id")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function setFollow(venueId, userId, on) {
  const q = on
    ? db().from("venue_follows").upsert({ venue_id: venueId, user_id: userId })
    : db()
        .from("venue_follows")
        .delete()
        .eq("venue_id", venueId)
        .eq("user_id", userId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

// Annonce une soirée à ceux qui suivent le lieu, une seule fois par soirée.
// La date d'envoi est posée avant l'envoi : un double clic ne prévient pas deux fois.
export async function notifyFollowers(venue, eventId) {
  const { data: ev } = await db()
    .from("venue_events")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("venue_id", venue.id)
    .is("notified_at", null)
    .gte("starts_at", new Date().toISOString())
    .select("starts_at, theme")
    .maybeSingle();
  if (!ev) throw new Error("Soirée déjà annoncée, passée ou introuvable.");

  const { data: follows } = await db()
    .from("venue_follows")
    .select("user_id")
    .eq("venue_id", venue.id);
  const payload = {
    slug: venue.slug,
    name: venue.name,
    startsAt: ev.starts_at,
    theme: ev.theme,
  };
  const targets = (follows ?? []).filter((f) => f.user_id !== venue.owner_id);
  for (const f of targets)
    await createNotification({
      userId: f.user_id,
      type: "venue_event",
      payload,
    });
  return targets.length;
}
