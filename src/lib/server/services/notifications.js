import { getAdminClient } from "../config.js";
import { pushNotify, refreshAllNotifications } from "../socket/presence.js";
import { NEWS } from "../../news.js";

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

// Une notification pour chaque profil (annonce de l'admin ou nouveauté).
export async function broadcastNotification(type, payload) {
  const { data, error } = await getAdminClient().rpc(
    "admin_broadcast_notification",
    { p_type: type, p_payload: payload },
  );
  if (error) throw new Error(error.message);
  refreshAllNotifications();
  return data;
}

// Au démarrage : prévient tout le monde de la dernière entrée de /nouveautes
// si elle n'a pas encore été annoncée. Le tout premier passage mémorise
// seulement la version courante, sans rien envoyer.
export async function announceLatestNews() {
  const latest = NEWS[0];
  if (!latest) return;
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "news_notified")
    .maybeSingle();
  if (error || data?.value?.version === latest.version) return;

  const { error: setErr } = await sb.from("site_settings").upsert(
    {
      key: "news_notified",
      value: { version: latest.version },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (setErr || !data) return;

  const n = await broadcastNotification("news", {
    version: latest.version,
    title: latest.title,
    tag: latest.tag,
  });
  console.log(`[news] ${latest.version} annoncée à ${n} joueurs`);
}
