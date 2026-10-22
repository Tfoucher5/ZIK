import { error } from "@sveltejs/kit";
import { venueBySlug, eventOf } from "$lib/server/services/venues.js";
import { isUuid } from "$lib/utils.js";
import { eventIcs } from "$lib/ics.js";

export async function GET({ params }) {
  const venue = await venueBySlug(params.slug);
  const event =
    venue && isUuid(params.id) && (await eventOf(venue.id, params.id));
  if (!event) error(404, "Soirée introuvable");
  return new Response(eventIcs(venue, event), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="blind-test-${venue.slug}.ics"`,
    },
  });
}
