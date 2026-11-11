import { getAdminClient } from "../../config.js";
import { ready, deliver } from "../notify/push.js";

// Alertes sur le téléphone de l'admin (Web Push), réglables dans
// Admin > Réglages. Chaque type s'active à part dans profiles.notif_prefs.

export const ADMIN_ALERTS = {
  admin_reports: "Nouveaux messages et signalements",
  admin_salons: "Demande d'aide depuis un salon",
  admin_money: "Paiements et résiliations Pro",
  admin_errors: "Panne, ralentissement ou pic d'erreurs (surveillance)",
  admin_upsell: "Salon gratuit plein (un hôte refuse des joueurs)",
};

const lastSent = new Map();

/** Envoie une alerte aux admins qui l'ont activée. throttleMs : silence après un envoi du même tag. */
export async function alertAdmins(kind, payload, { throttleMs = 0 } = {}) {
  if (!ready()) return 0;
  const tag = payload.tag ?? kind;
  const now = Date.now();
  if (throttleMs && now - (lastSent.get(tag) ?? 0) < throttleMs) return 0;
  lastSent.set(tag, now);
  const { data } = await getAdminClient()
    .schema("social")
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, profiles!inner(role, notif_prefs)")
    .eq("profiles.role", "super_admin")
    .eq(`profiles.notif_prefs->>${kind}`, "true");
  return data?.length ? deliver(data, { ...payload, tag }) : 0;
}

/** Version qui ne casse jamais l'appelant. */
export function alertAdminsSafe(kind, payload, opts) {
  alertAdmins(kind, payload, opts).catch((e) =>
    console.warn("[alerte admin]", e.message),
  );
}
