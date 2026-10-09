import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import { getTodo, liveCounts } from "$lib/server/services/adminBoard.js";

export async function GET({ url }) {
  await requireAdminToken(url.searchParams.get("token"));
  const { items, issues } = await getTodo();
  return json({
    todo: items.filter((i) => i.tone !== "info").length,
    issues,
    live: liveCounts(),
  });
}
