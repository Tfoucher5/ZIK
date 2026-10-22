import { listArtists } from "$lib/server/services/artistPages.js";

export async function load({ setHeaders }) {
  setHeaders({ "cache-control": "public, max-age=3600" });
  return { artists: await listArtists() };
}
