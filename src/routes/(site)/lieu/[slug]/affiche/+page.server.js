import { error } from "@sveltejs/kit";
import { venueBySlug } from "$lib/server/services/venues.js";

export async function load({ params }) {
  const venue = await venueBySlug(params.slug);
  if (!venue) error(404, "Lieu introuvable");
  const { name, slug, city, logo, schedule } = venue;
  return { venue: { name, slug, city, logo, schedule } };
}
