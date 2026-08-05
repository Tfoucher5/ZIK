import { getAdminClient } from "$lib/server/config.js";
import { todayParis } from "$lib/zikle/shared.js";

export async function load() {
  const sb = getAdminClient();
  const today = todayParis();
  const { data, error } = await sb
    .from("daily_songs")
    .select("date")
    .lt("date", today)
    .order("date", { ascending: false })
    .limit(200);
  if (error) return { days: [] };

  const { count } = await sb
    .from("daily_songs")
    .select("id", { count: "exact", head: true })
    .lt("date", today);
  const total = count ?? 0;
  const days = data.map((row, i) => ({ date: row.date, dayNumber: total - i }));
  return { days };
}
