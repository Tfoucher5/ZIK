import { publicStatus } from "$lib/server/services/health/status.js";

export async function load({ setHeaders }) {
  setHeaders({ "cache-control": "no-store" });
  return { status: await publicStatus() };
}
