import { error } from "@sveltejs/kit";
import {
  venueBySlug,
  upcomingEvents,
  league,
} from "$lib/server/services/venues.js";
import { followerCount } from "$lib/server/services/venueFollows.js";

export async function load({ params, setHeaders }) {
  const venue = await venueBySlug(params.slug);
  if (!venue) error(404, "Lieu introuvable");

  setHeaders({ "cache-control": "public, max-age=300" });
  const [events, ranking, followers] = await Promise.all([
    upcomingEvents(venue.id),
    league(venue.id),
    followerCount(venue.id),
  ]);
  delete venue.owner_id;
  return { venue, events, ranking, followers };
}
