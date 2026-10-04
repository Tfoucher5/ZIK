import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getCollection } from "$lib/server/services/collection.js";

// GET /api/cards/collection/:username — cartes et sets d'un joueur.
// Connexion requise, comme pour les profils. Profil privé : propriétaire seul.
export async function GET({ params, request }) {
  const token = request.headers.get("authorization")?.slice(7);
  const viewer = token ? await verifyToken(token) : null;
  if (!viewer) return json({ error: "Connexion requise" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_private")
    .eq("username", params.username)
    .maybeSingle();
  if (!profile) return json({ error: "Profil introuvable" }, { status: 404 });

  const isOwner = profile.id === viewer.id;
  if (profile.is_private && !isOwner)
    return json({ error: "Collection privée" }, { status: 403 });

  const { cards, sets } = await getCollection(profile.id, {
    withPending: isOwner,
  });
  return json({
    profile: { username: profile.username, avatar_url: profile.avatar_url },
    isOwner,
    cards,
    sets,
  });
}
