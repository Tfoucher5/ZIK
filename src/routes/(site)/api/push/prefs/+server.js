import { json } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { requireAuth } from "$lib/server/middleware/auth.js";
import { PUSH_CATEGORIES } from "$lib/server/services/push.js";

// GET : catégories de notifications activées. PUT : en change une partie.
export async function GET({ request }) {
  const { user } = await requireAuth(request);
  const { data } = await getAdminClient()
    .from("profiles")
    .select("notif_prefs")
    .eq("id", user.id)
    .single();
  return json(data?.notif_prefs ?? {});
}

export async function PUT({ request }) {
  const { user } = await requireAuth(request);
  const body = await request.json();
  const sb = getAdminClient();
  const { data } = await sb
    .from("profiles")
    .select("notif_prefs")
    .eq("id", user.id)
    .single();
  const prefs = { ...(data?.notif_prefs ?? {}) };
  for (const c of PUSH_CATEGORIES)
    if (typeof body?.[c] === "boolean") prefs[c] = body[c];
  const { error } = await sb
    .from("profiles")
    .update({ notif_prefs: prefs })
    .eq("id", user.id);
  if (error) return json({ error: error.message }, { status: 400 });
  return json(prefs);
}
