import webpush from "web-push";
import { getAdminClient } from "../config.js";

// Notifications sur l'appareil (Web Push), même site fermé. Sans clés VAPID
// dans l'environnement, rien n'est envoyé (les notifications du site restent).

export const PUSH_CATEGORIES = ["social", "cards", "challenge", "zikle"];

const CHUNK = 20;
// Une notification qui n'a pas pu être livrée en 12 h n'a plus d'intérêt
const TTL_SECONDS = 12 * 60 * 60;

let configured = null;
function ready() {
  if (configured !== null) return configured;
  const { PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configured = !!(PUBLIC_VAPID_KEY && VAPID_PRIVATE_KEY);
  if (configured)
    webpush.setVapidDetails(
      VAPID_SUBJECT || "mailto:theo@zik-music.fr",
      PUBLIC_VAPID_KEY,
      VAPID_PRIVATE_KEY,
    );
  return configured;
}

async function deliver(subs, payload) {
  const body = JSON.stringify(payload);
  const sb = getAdminClient();
  const delivered = [];
  const gone = [];
  for (let i = 0; i < subs.length; i += CHUNK) {
    await Promise.allSettled(
      subs.slice(i, i + CHUNK).map((s) =>
        webpush
          .sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: TTL_SECONDS },
          )
          .then(() => delivered.push(s.id))
          .catch((e) => {
            // Abonnement expiré ou révoqué par le navigateur
            if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.id);
          }),
      ),
    );
  }
  if (gone.length) await sb.from("push_subscriptions").delete().in("id", gone);
  if (delivered.length)
    await sb
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("id", delivered);
  return delivered.length;
}

/** Envoie à tous les appareils d'un joueur, si la catégorie est activée. */
export async function pushToUser(userId, category, payload) {
  if (!ready() || !category) return 0;
  const sb = getAdminClient();
  const { data: profile } = await sb
    .from("profiles")
    .select("notif_prefs")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.notif_prefs?.[category]) return 0;
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  return subs?.length ? deliver(subs, payload) : 0;
}

/**
 * Envoie à tous les joueurs abonnés qui ont activé la catégorie.
 * skip : ids de joueurs à ne pas prévenir.
 */
export async function pushToAll(category, payload, { skip = new Set() } = {}) {
  if (!ready()) return 0;
  const sb = getAdminClient();
  const subs = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("push_subscriptions")
      .select(
        "id, user_id, endpoint, p256dh, auth, profiles!inner(notif_prefs)",
      )
      .eq(`profiles.notif_prefs->>${category}`, "true")
      .range(from, from + 999);
    if (error) throw error;
    subs.push(...data.filter((s) => !skip.has(s.user_id)));
    if (data.length < 1000) break;
  }
  return deliver(subs, payload);
}

/** Vrai la première fois qu'une clé est vue : un envoi ne part qu'une fois. */
export async function firstTime(key) {
  const { error } = await getAdminClient()
    .from("notification_once")
    .insert({ key });
  return !error;
}

export async function saveSubscription(userId, sub, userAgent) {
  const { error } = await getAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent?.slice(0, 300) ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function deleteSubscription(endpoint) {
  await getAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
}
