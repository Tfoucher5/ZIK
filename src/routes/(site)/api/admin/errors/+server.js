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

export async function GET({ url }) {
  await checkAdmin(url.searchParams.get("token"));
  return json({ entries: globalThis.__zik_errorLog ?? [] });
}

export async function DELETE({ url }) {
  await checkAdmin(url.searchParams.get("token"));
  if (globalThis.__zik_errorLog) globalThis.__zik_errorLog.length = 0;
  return json({ ok: true });
}
