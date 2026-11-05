import { adminLoad } from "$lib/server/middleware/adminActions.js";
import { getAdminClient } from "$lib/server/config.js";
import {
  getTodo,
  getJournal,
  liveCounts,
} from "$lib/server/services/admin/board.js";

async function chargerPage() {
  const [{ items }, journal, pro] = await Promise.all([
    getTodo(),
    getJournal(2, 15),
    getAdminClient()
      .from("pro_subscriptions")
      .select("plan", { count: "exact", head: true })
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString()),
  ]);
  return { todo: items, journal, live: liveCounts(), pro: pro.count ?? 0 };
}

export const load = adminLoad(chargerPage);
