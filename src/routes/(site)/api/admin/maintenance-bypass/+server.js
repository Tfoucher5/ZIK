import { json, error } from "@sveltejs/kit";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import { makeBypassToken, BYPASS_COOKIE } from "$lib/server/maintenance.js";

// Pose un cookie signé qui permet au super_admin de naviguer tout le site
// pendant le mode maintenance.
export async function GET({ url, cookies }) {
  const token = url.searchParams.get("token");
  if (!token) throw error(403, "Token manquant");

  const user = await verifyToken(token);
  if (!user) throw error(403, "Token invalide");

  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") throw error(403, "Accès refusé");

  cookies.set(BYPASS_COOKIE, makeBypassToken(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 12 * 60 * 60,
  });

  return json({ ok: true });
}
