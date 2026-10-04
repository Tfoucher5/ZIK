import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getSetCards } from "$lib/server/services/collection.js";

// GET /api/cards/set/:id?user=pseudo — cartes d'un set, vues depuis la
// collection de « pseudo » : les cartes qu'il n'a pas restent des silhouettes.
export async function GET({ params, request, url }) {
  const token = request.headers.get("authorization")?.slice(7);
  const viewer = token ? await verifyToken(token) : null;
  if (!viewer) return json({ error: "Connexion requise" }, { status: 401 });

  const username = url.searchParams.get("user");
  const { data: profile } = username
    ? await supabase
        .from("profiles")
        .select("id, is_private")
        .eq("username", username)
        .maybeSingle()
    : { data: null };
  if (profile?.is_private && profile.id !== viewer.id)
    return json({ error: "Collection privée" }, { status: 403 });

  const result = await getSetCards(params.id, profile?.id ?? viewer.id);
  if (!result) return json({ error: "Set introuvable" }, { status: 404 });
  return json(result);
}
