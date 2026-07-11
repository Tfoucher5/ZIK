import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { verifyToken, userClient } from "$lib/server/middleware/auth.js";

export async function POST({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  const { targetId } = await request.json();
  if (!targetId) return json({ error: "Cible manquante" }, { status: 400 });
  if (targetId === user.id)
    return json(
      { error: "On ne peut pas se suivre soi-même" },
      { status: 400 },
    );

  // La cible doit exister
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return json({ error: "Joueur introuvable" }, { status: 404 });

  const client = userClient(token);

  // Toggle : suit déjà → on retire, sinon on ajoute
  const { data: existing } = await client
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("follows")
      .delete()
      .eq("id", existing.id);
    if (error) return json({ error: error.message }, { status: 400 });
    return json({ following: false });
  }

  const { error } = await client
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });
  if (error) return json({ error: error.message }, { status: 400 });
  return json({ following: true });
}
