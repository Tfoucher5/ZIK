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

  const {
    trackId,
    previewUrl,
    externalId,
    youtubeId,
    youtubeStart,
    artist,
    title,
  } = await request.json();
  if (!trackId) return json({ error: "trackId requis" }, { status: 400 });

  const patch = {};
  // Chaîne vide = on désépingle et le jeu reprend sa recherche automatique.
  if (typeof youtubeId === "string")
    patch.youtube_id = youtubeId.trim() || null;
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
  if (youtubeStart !== undefined)
    patch.youtube_start =
      Number.isInteger(youtubeStart) && youtubeStart >= 0 ? youtubeStart : null;
  if (typeof artist === "string" && artist.trim()) patch.artist = artist.trim();
  if (typeof title === "string" && title.trim()) patch.title = title.trim();

  if (!Object.keys(patch).length) {
    return json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const { error: dbError } = await getAdminClient()
    .from("tracks")
    .update(patch)
    .eq("id", trackId);
  if (dbError) {
    if (dbError.code === "23505")
      return json(
        { error: "Un titre identique (artiste + titre) existe déjà." },
        { status: 409 },
      );
    return json({ error: dbError.message }, { status: 500 });
  }

  return json({ ok: true });
}
