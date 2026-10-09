import { fail } from "@sveltejs/kit";
import { getMaintenance, setMaintenance } from "$lib/server/maintenance.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { getAdminClient } from "$lib/server/config.js";
import {
  getVideoSettings,
  clearVideoSettingsCache,
} from "$lib/server/services/trackIssues.js";
import { broadcastNotification } from "$lib/server/services/notifications.js";

export const actions = {
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

export async function load() {
  return {
    maintenance: await getMaintenance(),
    video: await getVideoSettings(),
  };
}
