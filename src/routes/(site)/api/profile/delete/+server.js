import { json } from "@sveltejs/kit";
import { verifyToken, userClient } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

export async function DELETE({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  const client = userClient(token);

  // 1. Delete custom playlist tracks (may not cascade automatically)
  const { data: playlists } = await client
    .from("custom_playlists")
    .select("id")
    .eq("user_id", user.id);

  if (playlists?.length) {
    const ids = playlists.map((p) => p.id);
    await client.from("custom_playlist_tracks").delete().in("playlist_id", ids);
  }

  // 2. Delete custom playlists
  await client.from("custom_playlists").delete().eq("user_id", user.id);

  // 3. Delete profile (scores and other data linked to user.id may cascade in Supabase)
  await client.from("profiles").delete().eq("id", user.id);

  // 4. Delete the auth user via admin API (requires SUPABASE_SERVICE_KEY)
  try {
    const admin = getAdminClient();
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;
  } catch (e) {
    // If admin deletion fails, the profile data is already deleted.
    // Return a specific error so the client can still sign out.
    return json(
      { error: "Données supprimées mais l'erreur suivante s'est produite lors de la suppression du compte auth : " + e.message, partial: true },
      { status: 500 },
    );
  }

  return json({ ok: true });
}
