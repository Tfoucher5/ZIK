import { json } from "@sveltejs/kit";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { isOnline, currentRoomOf } from "$lib/server/socket/presence.js";

export async function GET({ url, request }) {
  await requireAuth(request);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .filter(Boolean)
    .slice(0, 50);

  const out = {};
  for (const id of ids) {
    const online = isOnline(id);
    out[id] = { online, room: online ? currentRoomOf(id) : null };
  }
  return json(out);
}
