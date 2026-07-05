import { json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { parseExpFromUrl } from "$lib/server/services/deezer.js";

const PERMANENT_EXPIRY = "2099-01-01T00:00:00.000Z";

// POST /api/tracks/resolve
// Upsert des titres dans le catalogue partagé `tracks` (clé norm_key).
// Body: { tracks: [{ artist, title, preview_url, cover_url, external_id, source }] }
// Réponse: { ids: [track_id, ...] } dans le même ordre.
export async function POST({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, { status: 400 });
  }

  const tracks = body?.tracks;
  if (!Array.isArray(tracks) || !tracks.length || tracks.length > 500)
    return json(
      { error: "Payload invalide (1 à 500 titres)" },
      { status: 400 },
    );

  const rows = [];
  for (const t of tracks) {
    const artist = String(t?.artist || "").trim();
    const title = String(t?.title || "").trim();
    if (!artist || !title)
      return json({ error: "artist et title requis" }, { status: 400 });

    const preview_url = t.preview_url || null;
    let preview_expires_at = null;
    if (preview_url) {
      const exp = parseExpFromUrl(preview_url);
      preview_expires_at = exp
        ? new Date(exp * 1000).toISOString()
        : PERMANENT_EXPIRY;
    }

    rows.push({
      artist,
      title,
      preview_url,
      preview_expires_at,
      cover_url: t.cover_url || null,
      external_id: t.external_id ? String(t.external_id) : null,
      source: t.source || "manual",
    });
  }

  const { data, error } = await getAdminClient().rpc("resolve_tracks", {
    p_tracks: rows,
  });
  if (error) return json({ error: error.message }, { status: 400 });

  return json({ ids: data });
}
