import { getAdminClient } from "../config.js";
import { createNotification } from "./notifications.js";
import { parisDay } from "../../venues.js";

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

async function sendToFollowers(venue, payload) {
  const { data: follows } = await db()
    .from("venue_follows")
    .select("user_id")
    .eq("venue_id", venue.id);
  const targets = (follows ?? []).filter((f) => f.user_id !== venue.owner_id);
  for (const f of targets)
    await createNotification({
      userId: f.user_id,
      type: "venue_event",
      payload: { slug: venue.slug, name: venue.name, ...payload },
    });
  return targets.length;
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
  return sendToFollowers(venue, { startsAt: ev.starts_at, theme: ev.theme });
}

// Rappel du jour J pour les soirées d'aujourd'hui (heure de Paris) déjà
// annoncées par le lieu, s'il ne l'a pas coupé. reminded_at est posé avant l'envoi : un seul rappel.
export async function remindToday(today) {
  const now = Date.now();
  const { data: events } = await db()
    .from("venue_events")
    .select(
      "id, starts_at, theme, venues!inner(id, slug, name, owner_id, reminders)",
    )
    .is("reminded_at", null)
    .eq("venues.reminders", true)
    .not("notified_at", "is", null)
    .gte("starts_at", new Date(now).toISOString())
    .lt("starts_at", new Date(now + 24 * 3600_000).toISOString());
  let sent = 0;
  for (const ev of (events ?? []).filter(
    (e) => parisDay(e.starts_at) === today,
  )) {
    const { data: claimed } = await db()
      .from("venue_events")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", ev.id)
      .is("reminded_at", null)
      .select("id")
      .maybeSingle();
    if (claimed)
      sent += await sendToFollowers(ev.venues, {
        startsAt: ev.starts_at,
        theme: ev.theme,
        reminder: true,
      });
  }
  return sent;
}

// Lieux suivis par un joueur, avec leur prochaine soirée
export async function followedVenues(userId) {
  const { data } = await db()
    .from("venue_follows")
    .select("venues!inner(id, slug, name, city, color)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const venues = (data ?? []).map((r) => r.venues);
  if (!venues.length) return [];
  const { data: events } = await db()
    .from("venue_events")
    .select("venue_id, starts_at, theme")
    .in(
      "venue_id",
      venues.map((v) => v.id),
    )
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  return venues.map(({ id, ...v }) => ({
    ...v,
    next: events?.find((e) => e.venue_id === id) ?? null,
  }));
}
