import { getAdminClient } from "../config.js";
import { isProActive } from "./pro.js";
import { slugify } from "../../slug.js";
import { seasonStart, parisDay } from "../../venues.js";

const PUBLIC_COLS =
  "id, owner_id, slug, name, city, address, website, description, schedule, welcome, color, logo, reminders";
const MAX_EVENTS = 12;

const db = () => getAdminClient();

async function proOwners(ownerIds) {
  if (!ownerIds.length) return new Set();
  const { data } = await db()
    .from("pro_subscriptions")
    .select("user_id, status, current_period_end")
    .in("user_id", ownerIds);
  return new Set((data ?? []).filter(isProActive).map((r) => r.user_id));
}

// Lieux affichés publiquement : seulement ceux dont l'abonnement Pro court
export async function listVenues() {
  const { data } = await db()
    .from("venues")
    .select("slug, name, city, schedule, color, logo, owner_id")
    .order("city");
  const active = await proOwners((data ?? []).map((v) => v.owner_id));
  return (data ?? [])
    .filter((v) => active.has(v.owner_id))
    .map(({ slug, name, city, schedule, color, logo }) => ({
      slug,
      name,
      city,
      schedule,
      color,
      logo,
    }));
}

export async function venueBySlug(slug) {
  const { data, error } = await db()
    .from("venues")
    .select(PUBLIC_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) console.error("[lieu] lecture:", error.message);
  if (!data) return null;
  const active = await proOwners([data.owner_id]);
  return { ...data, active: active.has(data.owner_id) };
}

export async function venueOfOwner(userId) {
  if (!userId) return null;
  const { data, error } = await db()
    .from("venues")
    .select(PUBLIC_COLS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) console.error("[lieu] lecture:", error.message);
  return data;
}

async function freeSlug(name, city) {
  const base = slugify(`${name} ${city}`) || "lieu";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { data } = await db()
      .from("venues")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
}

// Création ou mise à jour du lieu du compte. Le lien public ne change pas
// une fois créé : les bars l'impriment et le mettent sur leur site.
export async function saveVenue(userId, fields) {
  const current = await venueOfOwner(userId);
  const row = { ...fields, updated_at: new Date().toISOString() };
  const query = current
    ? db().from("venues").update(row).eq("id", current.id)
    : db()
        .from("venues")
        .insert({
          ...row,
          owner_id: userId,
          slug: await freeSlug(fields.name, fields.city),
        });
  const { data, error } = await query.select(PUBLIC_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function upcomingEvents(venueId) {
  const { data } = await db()
    .from("venue_events")
    .select("id, starts_at, theme, notified_at")
    .eq("venue_id", venueId)
    .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
    .order("starts_at")
    .limit(MAX_EVENTS);
  return data ?? [];
}

export async function addEvent(venueId, startsAt, theme) {
  if ((await upcomingEvents(venueId)).length >= MAX_EVENTS)
    throw new Error(`${MAX_EVENTS} soirées à venir maximum.`);
  const { error } = await db()
    .from("venue_events")
    .insert({ venue_id: venueId, starts_at: startsAt, theme });
  if (error) throw new Error(error.message);
}

export async function removeEvent(venueId, eventId) {
  await db()
    .from("venue_events")
    .delete()
    .eq("id", eventId)
    .eq("venue_id", venueId);
}

export async function league(venueId) {
  const { data, error } = await db().rpc("venue_league", {
    p_venue: venueId,
    p_since: seasonStart().toISOString(),
  });
  if (error) console.error("[lieu] classement:", error.message);
  return data ?? [];
}

// Ce que la TV et les téléphones affichent d'un lieu
export const salonVenue = (v) =>
  v && {
    id: v.id,
    slug: v.slug,
    name: v.name,
    logo: v.logo,
    color: v.color,
    welcome: v.welcome,
  };

// Chiffres du mois pour l'espace organisateur
export async function monthStats(venueId) {
  const { data } = await db()
    .from("games")
    .select("started_at")
    .eq("venue_id", venueId)
    .gte("started_at", seasonStart().toISOString());
  return {
    games: data?.length ?? 0,
    nights: new Set((data ?? []).map((g) => parisDay(g.started_at))).size,
  };
}

export async function setReminders(venueId, on) {
  const { error } = await db()
    .from("venues")
    .update({ reminders: !!on })
    .eq("id", venueId);
  if (error) throw new Error(error.message);
}

// Récap de la dernière soirée : parties du même jour (heure de Paris),
// joueurs, podium cumulé et abonnés gagnés depuis le début de la soirée.
export async function lastNightRecap(venueId) {
  const { data: last } = await db()
    .from("games")
    .select("started_at")
    .eq("venue_id", venueId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return null;
  const day = parisDay(last.started_at);
  const since = new Date(Date.parse(last.started_at) - 24 * 3600_000);
  const { data: games } = await db()
    .from("games")
    .select("id, started_at")
    .eq("venue_id", venueId)
    .gte("started_at", since.toISOString());
  const night = (games ?? []).filter((g) => parisDay(g.started_at) === day);
  const first = night.map((g) => g.started_at).sort()[0];

  const [{ data: rows }, { count: newFollowers }] = await Promise.all([
    db()
      .from("salon_players")
      .select("user_id, username, score")
      .in(
        "game_id",
        night.map((g) => g.id),
      ),
    db()
      .from("venue_follows")
      .select("user_id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .gte("created_at", first),
  ]);
  const players = new Map();
  for (const r of rows ?? []) {
    const key = r.user_id ?? r.username.trim().toLowerCase();
    const p = players.get(key) ?? { name: r.username, points: 0 };
    p.points += r.score;
    players.set(key, p);
  }
  return {
    date: first,
    games: night.length,
    players: players.size,
    podium: [...players.values()]
      .sort((a, b) => b.points - a.points)
      .slice(0, 3),
    newFollowers: newFollowers ?? 0,
  };
}

export async function eventOf(venueId, eventId) {
  const { data } = await db()
    .from("venue_events")
    .select("id, starts_at, theme")
    .eq("venue_id", venueId)
    .eq("id", eventId)
    .maybeSingle();
  return data;
}
