import { error, json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { isPro } from "$lib/server/services/pro.js";
import {
  venueOfOwner,
  addEvent,
  removeEvent,
  upcomingEvents,
} from "$lib/server/services/venues.js";

async function ownVenue(request) {
  const { user } = await requireAuth(request);
  if (!(await isPro(user.id))) error(403, "Réservé aux comptes ZIK Pro.");
  const venue = await venueOfOwner(user.id);
  if (!venue) error(404, "Créez d'abord votre lieu.");
  return venue;
}

export async function POST({ request }) {
  const venue = await ownVenue(request);
  const { startsAt, theme } = await request.json();
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime()) || date < new Date())
    error(400, "Choisissez une date à venir.");
  try {
    await addEvent(
      venue.id,
      date.toISOString(),
      String(theme ?? "")
        .trim()
        .slice(0, 60) || null,
    );
  } catch (e) {
    error(400, e.message);
  }
  return json({ events: await upcomingEvents(venue.id) });
}

export async function DELETE({ request, url }) {
  const venue = await ownVenue(request);
  await removeEvent(venue.id, url.searchParams.get("id"));
  return json({ events: await upcomingEvents(venue.id) });
}
