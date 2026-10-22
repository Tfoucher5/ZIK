import { error, json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { venueBySlug } from "$lib/server/services/venues.js";
import {
  followerCount,
  isFollowing,
  setFollow,
  followedVenues,
} from "$lib/server/services/venueFollows.js";

async function venueOf(slug) {
  const venue = await venueBySlug(String(slug ?? ""));
  if (!venue) error(404, "Lieu introuvable");
  return venue;
}

export async function GET({ request, url }) {
  const { user } = await requireAuth(request);
  const slug = url.searchParams.get("slug");
  // Sans lieu précisé : les lieux que le joueur suit
  if (!slug) return json({ venues: await followedVenues(user.id) });
  const venue = await venueOf(slug);
  return json({ following: await isFollowing(venue.id, user.id) });
}

export async function POST({ request }) {
  const { user } = await requireAuth(request);
  const { slug, follow } = await request.json();
  const venue = await venueOf(slug);
  await setFollow(venue.id, user.id, !!follow);
  return json({ following: !!follow, count: await followerCount(venue.id) });
}
