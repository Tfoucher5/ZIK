import { getAdminClient } from "$lib/server/config.js";

export async function load() {
  const sb = getAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await Promise.allSettled([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb
      .from("games")
      .select("*", { count: "exact", head: true })
      .gte("started_at", today.toISOString()),
    sb
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    sb
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sb
      .from("custom_playlists")
      .select("*", { count: "exact", head: true })
      .eq("is_official", true),
    sb.rpc("count_active_players_7d"),
  ]);

  const getCount = (r) => (r.status === "fulfilled" ? (r.value.count ?? 0) : 0);
  const [
    totalUsers,
    gamesToday,
    publicRooms,
    pendingReports,
    officialPlaylists,
    rpcActiveUsers7d,
  ] = results;

  const activeUsers7d =
    rpcActiveUsers7d.status === "fulfilled"
      ? (rpcActiveUsers7d.value.data ?? 0)
      : 0;

  const [
    totalUsersVal,
    gamesTodayVal,
    publicRoomsVal,
    pendingReportsVal,
    officialPlaylistsVal,
  ] = [
    totalUsers,
    gamesToday,
    publicRooms,
    pendingReports,
    officialPlaylists,
  ].map(getCount);

  const uptimeSeconds = Math.floor(process.uptime());
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = uptimeSeconds % 60;
  const uptime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return {
    stats: {
      totalUsers: totalUsersVal,
      gamesToday: gamesTodayVal,
      publicRooms: publicRoomsVal,
      pendingReports: pendingReportsVal,
      officialPlaylists: officialPlaylistsVal,
      activeUsers7d,
      uptime,
    },
  };
}
