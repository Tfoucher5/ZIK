import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { verifyToken, userClient } from "$lib/server/middleware/auth.js";

const ACTIONS = new Set(["request", "accept", "remove"]);

export async function POST({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  const { targetId, action } = await request.json();
  if (!targetId || !ACTIONS.has(action))
    return json({ error: "Requête invalide" }, { status: 400 });
  if (targetId === user.id)
    return json(
      { error: "On ne peut pas s'ajouter soi-même" },
      { status: 400 },
    );

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return json({ error: "Joueur introuvable" }, { status: 404 });

  const client = userClient(token);

  if (action === "request") {
    // Une demande inverse existe déjà ? Alors les deux se sont demandés → on accepte.
    const { data: inverse } = await client
      .from("friendships")
      .select("id, status")
      .eq("requester_id", targetId)
      .eq("addressee_id", user.id)
      .maybeSingle();

    if (inverse) {
      if (inverse.status === "pending") {
        const { error } = await client
          .from("friendships")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", inverse.id);
        if (error) return json({ error: error.message }, { status: 400 });
      }
      return json({ friendStatus: "friends" });
    }

    const { data: existing } = await client
      .from("friendships")
      .select("status")
      .eq("requester_id", user.id)
      .eq("addressee_id", targetId)
      .maybeSingle();

    if (existing)
      return json({
        friendStatus:
          existing.status === "accepted" ? "friends" : "pending_out",
      });

    const { error } = await client
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId });
    if (error) return json({ error: error.message }, { status: 400 });
    return json({ friendStatus: "pending_out" });
  }

  if (action === "accept") {
    const { data: req } = await client
      .from("friendships")
      .select("id")
      .eq("requester_id", targetId)
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (!req)
      return json({ error: "Aucune demande à accepter" }, { status: 404 });

    const { error } = await client
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) return json({ error: error.message }, { status: 400 });
    return json({ friendStatus: "friends" });
  }

  // remove : annule une demande sortante, refuse une entrante, ou retire un ami.
  const { error } = await client
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`,
    );
  if (error) return json({ error: error.message }, { status: 400 });
  return json({ friendStatus: "none" });
}
