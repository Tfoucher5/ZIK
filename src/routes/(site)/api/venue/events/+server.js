import { error, json } from "@sveltejs/kit";
import { requireOwnVenue } from "$lib/server/middleware/auth.js";
import {
  addEvent,
  removeEvent,
  upcomingEvents,
} from "$lib/server/services/venues.js";

export async function POST({ request }) {
  const venue = await requireOwnVenue(request);
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
  const venue = await requireOwnVenue(request);
  await removeEvent(venue.id, url.searchParams.get("id"));
  return json({ events: await upcomingEvents(venue.id) });
}
