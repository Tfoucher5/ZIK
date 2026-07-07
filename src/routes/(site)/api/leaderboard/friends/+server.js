import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { requireAuth } from "$lib/server/middleware/auth.js";

export async function GET({ request }) {
  const { user } = await requireAuth(request);

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) return json([]);

  const ids = new Set([user.id]);
  for (const f of rows || [])
    ids.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);

  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, elo, level, games_played")
    .in("id", [...ids])
    .order("elo", { ascending: false })
    .limit(100);

  return json(data || []);
}
