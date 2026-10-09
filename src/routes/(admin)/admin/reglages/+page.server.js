import { fail } from "@sveltejs/kit";
import { getMaintenance, setMaintenance } from "$lib/server/maintenance.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import {
  getVideoSettings,
  clearVideoSettingsCache,
} from "$lib/server/services/trackIssues.js";
import { broadcastNotification } from "$lib/server/services/notifications.js";
import { ADMIN_ALERTS } from "$lib/server/services/adminAlerts.js";
import { ready as pushReady, deliver } from "$lib/server/services/push.js";

export const actions = {
  alerts: async ({ request, locals }) => {
    const form = await request.formData();
    const sb = getAdminClient();
    const { data } = await sb
      .from("profiles")
      .select("notif_prefs")
      .eq("id", locals.adminId)
      .maybeSingle();
    const prefs = { ...(data?.notif_prefs ?? {}) };
    for (const key of Object.keys(ADMIN_ALERTS))
      prefs[key] = form.get(key) === "on";
    const { error } = await sb
      .from("profiles")
      .update({ notif_prefs: prefs })
      .eq("id", locals.adminId);
    if (error) return fail(500, { alertsError: error.message });
    return { alertsSaved: true };
  },

  alertTest: async ({ locals }) => {
    if (!pushReady())
      return fail(500, { alertsError: "Clés VAPID absentes du serveur." });
    const { data } = await getAdminClient()
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", locals.adminId);
    if (!data?.length)
      return fail(400, {
        alertsError: "Aucun appareil abonné : active d'abord les alertes ici.",
      });
    const sent = await deliver(data, {
      title: "Test des alertes ZIK",
      body: "Si tu lis ça, les alertes arrivent bien sur cet appareil.",
      url: "/admin",
      tag: `test:${Date.now()}`,
    });
    return { alertTestSent: sent };
  },

  maintenance: async ({ request, locals }) => {
    const form = await request.formData();
    const enabled = form.get("enabled") === "on";
    const message = String(form.get("message") || "").slice(0, 500);
    try {
      await setMaintenance(enabled, message);
    } catch {
      return fail(500, { maintenanceError: "Sauvegarde impossible." });
    }
    await logAdminAction(
      locals.adminId,
      enabled ? "maintenance_on" : "maintenance_off",
      null,
      "site",
      { message },
    );
    return { maintenanceSaved: true };
  },

  video: async ({ request, locals }) => {
    const form = await request.formData();
    const exclude = String(form.get("exclude") || "")
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30);
    const minStart = Math.min(
      Math.max(Number(form.get("minStart")) || 0, 0),
      90,
    );
    const { error } = await getAdminClient().from("site_settings").upsert(
      {
        key: "video_search",
        value: { exclude, minStart },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return fail(500, { videoError: error.message });
    clearVideoSettingsCache();
    await logAdminAction(locals.adminId, "video_settings", null, "site", {
      exclude,
      minStart,
    });
    return { videoSaved: true };
  },

  broadcast: async ({ request, locals }) => {
    const form = await request.formData();
    const title = String(form.get("title") || "")
      .trim()
      .slice(0, 80);
    const body = String(form.get("body") || "")
      .trim()
      .slice(0, 240);
    const url = String(form.get("url") || "").trim();
    if (!title) return fail(400, { broadcastError: "Il faut un titre." });
    if (url && !/^\/(?!\/)/.test(url))
      return fail(400, {
        broadcastError: "Le lien doit être une page du site, par ex. /salon.",
      });
    try {
      const sent = await broadcastNotification("announcement", {
        title,
        body,
        url: url || null,
      });
      await logAdminAction(locals.adminId, "broadcast", null, "site", {
        title,
        sent,
      });
      return { broadcastSent: sent };
    } catch (e) {
      return fail(500, { broadcastError: e.message });
    }
  },
};

export async function load({ locals }) {
  const sb = getAdminClient();
  const [maintenance, video, profileRes, devicesRes] = await Promise.all([
    getMaintenance(),
    getVideoSettings(),
    sb
      .from("profiles")
      .select("notif_prefs")
      .eq("id", locals.adminId)
      .maybeSingle(),
    sb
      .from("push_subscriptions")
      .select("user_agent, last_success_at, created_at")
      .eq("user_id", locals.adminId)
      .order("created_at", { ascending: false }),
  ]);
  const prefs = profileRes.data?.notif_prefs ?? {};
  return {
    maintenance,
    video,
    alerts: {
      ready: pushReady(),
      kinds: Object.entries(ADMIN_ALERTS).map(([key, label]) => ({
        key,
        label,
        on: prefs[key] === true,
      })),
      devices: devicesRes.data ?? [],
    },
  };
}
