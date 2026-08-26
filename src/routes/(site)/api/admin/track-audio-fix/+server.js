import { error, json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

async function checkAdmin(token) {
  if (!token) throw error(403, "Token manquant");
  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");
}

export async function POST({ url, request }) {
  await checkAdmin(url.searchParams.get("token"));

  const { trackId, previewUrl, externalId } = await request.json();
  if (!trackId) return json({ error: "trackId requis" }, { status: 400 });

  const patch = {};
  if (previewUrl) {
    patch.preview_url = previewUrl;
    // Les URL Deezer portent leur expiration : on la stocke pour que le
    // rafraîchissement automatique sache quand la source sera périmée.
    const exp = /hdnea=exp=(\d+)/.exec(previewUrl);
    patch.preview_expires_at = exp
      ? new Date(Number(exp[1]) * 1000).toISOString()
      : null;
  }
  if (externalId) patch.external_id = externalId;

  if (!Object.keys(patch).length) {
    return json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const { error: dbError } = await getAdminClient()
    .from("tracks")
    .update(patch)
    .eq("id", trackId);
  if (dbError) return json({ error: dbError.message }, { status: 500 });

  return json({ ok: true });
}
