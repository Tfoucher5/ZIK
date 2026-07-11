import { json } from "@sveltejs/kit";
import { requireAuth, userClient } from "$lib/server/middleware/auth.js";
import {
  NOTIF_SELECT,
  purgeCutoff,
} from "$lib/server/services/notifications.js";

export async function GET({ request }) {
  const { user, token } = await requireAuth(request);
  const client = userClient(token);

  try {
    // Purge lazy : TTL 24 h
    await client
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .lt("created_at", purgeCutoff());

    const { data, error } = await client
      .from("notifications")
      .select(NOTIF_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return json({ notifications: [], unreadCount: 0 });
    const notifications = data || [];
    return json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch {
    return json({ notifications: [], unreadCount: 0 });
  }
}

export async function POST({ request }) {
  const { user, token } = await requireAuth(request);
  const { action } = await request.json();
  if (action !== "read")
    return json({ error: "Action invalide" }, { status: 400 });

  await userClient(token)
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return json({ ok: true });
}
