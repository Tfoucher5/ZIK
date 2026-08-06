import { getAdminClient } from "$lib/server/config.js";

export async function load({ url }) {
  const sb = getAdminClient();
  const ALLOWED_SORT = ["elo", "level", "games_played", "created_at"];
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const sortParam = url.searchParams.get("sort");
  const sort = ALLOWED_SORT.includes(sortParam) ? sortParam : "elo";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const roleParam = url.searchParams.get("role");
  const role = ["user", "super_admin"].includes(roleParam) ? roleParam : "";
  const PAGE_SIZE = 50;

  let query = sb
    .from("profiles")
    .select(
      "id, username, avatar_url, role, xp, level, elo, games_played, created_at, is_private",
      { count: "exact" },
    )
    .order(sort, { ascending: order === "asc" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("username", `%${q}%`);
  if (role) query = query.eq("role", role);

  const { data: users, count, error } = await query;

  return {
    users: users || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    q,
    sort,
    order,
    role,
    error: error?.message || null,
  };
}
