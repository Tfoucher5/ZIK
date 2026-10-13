import { listVenues } from "$lib/server/services/venues.js";

export async function load({ setHeaders }) {
  setHeaders({ "cache-control": "public, max-age=600" });
  const cities = new Map();
  for (const v of await listVenues()) {
    if (!cities.has(v.city)) cities.set(v.city, []);
    cities.get(v.city).push(v);
  }
  return { cities: [...cities] };
}
