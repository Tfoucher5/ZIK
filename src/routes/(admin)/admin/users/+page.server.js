import { getAdminClient } from "$lib/server/config.js";

const PAGE_SIZE = 40;
const SORTS = {
  recent: ["created_at", false],
  old: ["created_at", true],
  xp: ["xp", false],
  games: ["games_played", false],
  elo: ["elo", false],
  seen: ["last_played_date", false],
};
const FILTERS = ["all", "new", "pro", "admin", "banned"];

async function bannedIds(sb) {
  const ids = [];
  const now = Date.now();
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) break;
    for (const u of data.users)
      if (u.banned_until && new Date(u.banned_until).getTime() > now)
        ids.push(u.id);
    if (data.users.length < 1000) break;
  }
  return ids;
}

export async function load({ url }) {
  const sb = getAdminClient();
  const q = url.searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const sort = SORTS[url.searchParams.get("sort")]
    ? url.searchParams.get("sort")
    : "recent";
  const f = FILTERS.includes(url.searchParams.get("f"))
    ? url.searchParams.get("f")
    : "all";

  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const head = { count: "exact", head: true };

  const [totalRes, newRes, activeRes, proRes, banned] = await Promise.all([
    sb.from("profiles").select("id", head),
    sb.from("profiles").select("id", head).gte("created_at", weekAgo),
    sb
      .from("game_players")
      .select("user_id, games!inner(started_at)")
      .not("user_id", "is", null)
      .gte("games.started_at", weekAgo)
      .limit(10000),
    sb
      .from("pro_subscriptions")
      .select("user_id")
      .eq("status", "active")
      .gt("current_period_end", nowIso),
    bannedIds(sb),
  ]);

  const proIds = (proRes.data ?? []).map((p) => p.user_id);
  const restrictTo = f === "pro" ? proIds : f === "banned" ? banned : null;

  let users = [];
  let total = 0;
  let error = null;
  if (!restrictTo || restrictTo.length) {
    const [col, asc] = SORTS[sort];
    let query = sb
      .from("profiles")
      .select(
        "id, username, avatar_url, role, xp, level, elo, games_played, created_at, last_played_date",
        { count: "exact" },
      )
      .order(col, { ascending: asc, nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (q) query = query.ilike("username", `%${q}%`);
    if (f === "new") query = query.gte("created_at", weekAgo);
    if (f === "admin") query = query.eq("role", "super_admin");
    if (restrictTo) query = query.in("id", restrictTo);
    const res = await query;
    users = res.data ?? [];
    total = res.count ?? 0;
    error = res.error?.message ?? null;
  }

  const proSet = new Set(proIds);
  const banSet = new Set(banned);

  return {
    kpis: {
      total: totalRes.count ?? 0,
      new7: newRes.count ?? 0,
      active7: new Set((activeRes.data ?? []).map((r) => r.user_id)).size,
      pro: proIds.length,
      banned: banned.length,
    },
    users: users.map((u) => ({
      ...u,
      pro: proSet.has(u.id),
      banned: banSet.has(u.id),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    q,
    sort,
    f,
    error,
  };
}
