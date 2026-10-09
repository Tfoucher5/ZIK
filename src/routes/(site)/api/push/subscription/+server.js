import { json } from "@sveltejs/kit";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import {
  saveSubscription,
  deleteSubscription,
} from "$lib/server/services/push.js";

const validSub = (s) =>
  typeof s?.endpoint === "string" &&
  s.endpoint.startsWith("https://") &&
  typeof s.keys?.p256dh === "string" &&
  typeof s.keys?.auth === "string";

// POST : rattache l'abonnement push de cet appareil au joueur connecté.
export async function POST({ request, getClientAddress }) {
  checkRateLimit(getClientAddress(), 20, 60_000);
  const { user } = await requireAuth(request);
  const sub = await request.json();
  if (!validSub(sub))
    return json({ error: "Abonnement invalide" }, { status: 400 });
  await saveSubscription(user.id, sub, request.headers.get("user-agent"));
  return json({ ok: true });
}

// DELETE : l'appareil ne reçoit plus rien. Sans connexion requise : seul
// l'appareil connaît son endpoint (appelé aussi à la déconnexion).
export async function DELETE({ request, getClientAddress }) {
  checkRateLimit(getClientAddress(), 20, 60_000);
  const { endpoint } = await request.json();
  if (typeof endpoint !== "string")
    return json({ error: "Requête invalide" }, { status: 400 });
  await deleteSubscription(endpoint);
  return json({ ok: true });
}
