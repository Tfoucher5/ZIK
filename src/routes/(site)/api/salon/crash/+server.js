import { json } from "@sveltejs/kit";
import { recordClientCrash } from "$lib/server/services/health/clientCrash.js";

export async function POST({ request }) {
  const payload = await request.json().catch(() => null);
  const ok = recordClientCrash(payload, {
    ip: request.headers.get("x-forwarded-for") || "unknown",
    userAgent: request.headers.get("user-agent"),
  });
  if (!ok) return json({ error: "Signalement invalide" }, { status: 400 });
  return new Response(null, { status: 204 });
}
