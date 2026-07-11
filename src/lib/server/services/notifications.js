import { getAdminClient } from "../config.js";
import { pushNotify } from "../socket/presence.js";

const TTL_MS = 24 * 60 * 60 * 1000;

export const NOTIF_SELECT =
  "id, type, actor_id, payload, read, created_at, actor:actor_id(id, username, avatar_url)";

// Insert (service role — pas de policy INSERT) + push temps réel.
// Résilient : ne casse jamais l'action appelante si la table n'existe pas.
export async function createNotification({
  userId,
  type,
  actorId,
  payload = {},
}) {
  try {
    const { data } = await getAdminClient()
      .from("notifications")
      .insert({ user_id: userId, type, actor_id: actorId, payload })
      .select(NOTIF_SELECT)
      .single();
    if (data) pushNotify(userId, data);
  } catch {
    // table absente ou service key manquante — notification ignorée
  }
}

// Supprime les notifications devenues obsolètes (ex. demande d'ami annulée/traitée).
export async function deleteNotifications(filters) {
  try {
    let q = getAdminClient().from("notifications").delete();
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    await q;
  } catch {
    // ignore
  }
}

export function purgeCutoff() {
  return new Date(Date.now() - TTL_MS).toISOString();
}
