import { error, json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { isPro } from "$lib/server/services/pro.js";
import {
  venueOfOwner,
  saveVenue,
  upcomingEvents,
} from "$lib/server/services/venues.js";
import { cleanVenue } from "$lib/venues.js";

export async function GET({ request }) {
  const { user } = await requireAuth(request);
  const venue = await venueOfOwner(user.id);
  return json({
    venue,
    events: venue ? await upcomingEvents(venue.id) : [],
  });
}

export async function PUT({ request }) {
  const { user } = await requireAuth(request);
  if (!(await isPro(user.id))) error(403, "Réservé aux comptes ZIK Pro.");
  const { venue, error: invalid } = cleanVenue(await request.json());
  if (invalid) error(400, invalid);
  return json({ venue: await saveVenue(user.id, venue) });
}
