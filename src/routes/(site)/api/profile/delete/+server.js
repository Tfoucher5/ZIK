import { json } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";

// Le profil, ses playlists et leurs titres partent en cascade depuis auth.users.
export async function DELETE({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  const { error } = await getAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[profile/delete]", error.message);
    return json(
      { error: "Suppression impossible, réessaie ou contacte-nous" },
      { status: 500 },
    );
  }
  return json({ ok: true });
}
