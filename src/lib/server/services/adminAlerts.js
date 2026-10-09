import { getAdminClient } from "../config.js";
import { errorLog } from "../state.js";
import { ready, deliver } from "./push.js";

// Alertes sur le téléphone de l'admin (Web Push), réglables dans
// Admin > Réglages. Chaque type s'active à part dans profiles.notif_prefs.

export const ADMIN_ALERTS = {
  admin_reports: "Nouveaux messages et signalements",
  admin_salons: "Demande d'aide depuis un salon",
  admin_money: "Paiements et résiliations Pro",
  admin_errors: "Pic d'erreurs sur le serveur",
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

const ERROR_WINDOW = 5 * 60 * 1000;
const ERROR_THRESHOLD = 10;

// Un pic d'erreurs prévient au plus une fois par demi-heure
export function startErrorWatch() {
  setInterval(() => {
    const since = Date.now() - ERROR_WINDOW;
    const recent = errorLog.filter((e) => e.level === "error" && e.ts > since);
    if (recent.length < ERROR_THRESHOLD) return;
    alertAdminsSafe(
      "admin_errors",
      {
        title: `${recent.length} erreurs en 5 minutes`,
        body: recent[0].msg.split("\n")[0].slice(0, 140),
        url: "/admin/errors",
        tag: "errors",
      },
      { throttleMs: 30 * 60 * 1000 },
    );
  }, 60 * 1000).unref?.();
}
