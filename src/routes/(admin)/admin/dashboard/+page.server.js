import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { getMaintenance, setMaintenance } from "$lib/server/maintenance.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";

export const actions = {
  maintenance: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const enabled = formData.get("enabled") === "on";
    const message = String(formData.get("message") || "").slice(0, 500);
    try {
      await setMaintenance(enabled, message);
    } catch {
      return fail(500, {
        maintenanceError:
          "Sauvegarde impossible — la table site_settings existe-t-elle ? (migration 20260610_site_settings.sql)",
      });
    }
    await logAdminAction(
      adminUser.id,
      enabled ? "maintenance_on" : "maintenance_off",
      null,
      "site",
      { message },
    );
    return { maintenanceSaved: true };
  },
};

export async function load() {
  const sb = getAdminClient();
  const results = await Promise.allSettled([
    sb
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    sb
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  const getCount = (r) => (r.status === "fulfilled" ? (r.value.count ?? 0) : 0);
  const [publicRooms, pendingReports] = results.map(getCount);

  const uptimeSeconds = Math.floor(process.uptime());
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const uptime = `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;

  return {
    maintenance: await getMaintenance(),
    ops: { publicRooms, pendingReports, uptime },
  };
}
