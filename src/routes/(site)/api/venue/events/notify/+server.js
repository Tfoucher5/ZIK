import { error, json } from "@sveltejs/kit";
import { requireOwnVenue } from "$lib/server/middleware/auth.js";
import { upcomingEvents } from "$lib/server/services/venues.js";
import { notifyFollowers } from "$lib/server/services/venueFollows.js";

export async function POST({ request }) {
  const venue = await requireOwnVenue(request);
  const { id } = await request.json();
  let sent;
  try {
    sent = await notifyFollowers(venue, id);
  } catch (e) {
    error(400, e.message);
  }
  return json({ sent, events: await upcomingEvents(venue.id) });
}
