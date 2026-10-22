import { error } from "@sveltejs/kit";
import { findArtist, artistPage } from "$lib/server/services/artistPages.js";

export async function load({ params, setHeaders }) {
  const artist = await findArtist(params.slug);
  if (!artist) error(404, "Artiste introuvable");

  setHeaders({ "cache-control": "public, max-age=3600" });
  return { artist, ...(await artistPage(artist)) };
}
