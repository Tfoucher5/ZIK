import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { adminStatus } from "$lib/server/services/health/status.js";

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  return json(await adminStatus());
}
