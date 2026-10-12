import { getAdminClient } from "../config.js";

// Fiche joueur de /admin/users/[id] : profil, compte, parties, social, Pro.
// Retourne null si le joueur n'existe pas.
export async function getAdminUserDetail(id, adminId) {
  const sb = getAdminClient();
  const [
    profileRes,
    authUserRes,
    gamesRes,
    reportsRes,
    followingRes,
    followersRes,
    friendshipsRes,
    proRes,
    unlockedRes,
    catalogRes,
    auditRes,
    hostedRes,
    salonPlayedRes,
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).single(),
    sb.auth.admin.getUserById(id),
    sb
      .from("game_players")
      .select(
        "id, score, rank, games(id, room_id, started_at, rounds, mode, player_count)",
      )
      .eq("user_id", id)
      .limit(2000),
    sb
      .from("reports")
      .select(
        "id, type, subject, status, message, created_at, reporter_id, reported_user_id, room_id",
      )
      .or(`reporter_id.eq.${id},reported_user_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .from("follows")
      .select(
        "id, created_at, user:profiles!follows_following_id_fkey(id, username, avatar_url)",
      )
      .eq("follower_id", id)
      .order("created_at", { ascending: false }),
    sb
      .from("follows")
      .select(
        "id, created_at, user:profiles!follows_follower_id_fkey(id, username, avatar_url)",
      )
      .eq("following_id", id)
      .order("created_at", { ascending: false }),
    sb
      .from("friendships")
      .select(
        "id, status, created_at, accepted_at, requester_id, requester:profiles!friendships_requester_id_fkey(id, username, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)",
      )
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`)
      .order("created_at", { ascending: false }),
    sb
      .from("pro_subscriptions")
      .select("plan, status, current_period_end, stripe_subscription_id")
      .eq("user_id", id)
      .maybeSingle(),
    sb
      .from("user_achievements")
      .select("id, achievement_id, tier, unlocked_at")
      .eq("user_id", id)
      .order("unlocked_at", { ascending: false }),
    sb.from("achievements").select("id, name, icon"),
    sb
      .from("admin_audit_log")
      .select("id, admin_id, action, payload, created_at")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from("games")
      .select(
        "id, room_id, started_at, ended_at, rounds, player_count, limit_hits",
      )
      .eq("source", "salon")
      .eq("host_id", id)
      .order("started_at", { ascending: false })
      .limit(500),
    sb
      .from("salon_players")
      .select(
        "id, score, rank, team, games(id, room_id, started_at, player_count)",
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (profileRes.error || !profileRes.data) return null;

  const authUser = authUserRes.data?.user;
  const isBanned = authUser?.banned_until
    ? new Date(authUser.banned_until) > new Date()
    : false;

  const played = (gamesRes.data ?? [])
    .filter((g) => g.games)
    .sort(
      (a, b) =>
        new Date(b.games.started_at ?? 0) - new Date(a.games.started_at ?? 0),
    );
  const monthAgo = Date.now() - 30 * 86400000;
  const recent = played.slice(0, 15);

  const audit = auditRes.data ?? [];
  const roomCodes = [...new Set(recent.map((g) => g.games.room_id))].filter(
    Boolean,
  );
  const adminIds = [...new Set(audit.map((a) => a.admin_id))].filter(Boolean);
  const [roomsRes, adminsRes] = await Promise.all([
    roomCodes.length
      ? sb.from("rooms").select("code, name, emoji").in("code", roomCodes)
      : { data: [] },
    adminIds.length
      ? sb.from("profiles").select("id, username").in("id", adminIds)
      : { data: [] },
  ]);
  const rooms = Object.fromEntries(
    (roomsRes.data ?? []).map((r) => [r.code, r]),
  );
  const admins = Object.fromEntries(
    (adminsRes.data ?? []).map((a) => [a.id, a.username]),
  );
  const catalog = Object.fromEntries(
    (catalogRes.data ?? []).map((a) => [a.id, a]),
  );

  return {
    profile: profileRes.data,
    isSelf: adminId === id,
    account: {
      email: authUser?.email ?? null,
      provider: authUser?.app_metadata?.provider ?? null,
      lastSignIn: authUser?.last_sign_in_at ?? null,
      bannedUntil: isBanned ? authUser.banned_until : null,
    },
    isBanned,
    stats: {
      games: played.length,
      wins: played.filter((g) => g.rank === 1).length,
      podiums: played.filter((g) => g.rank && g.rank <= 3).length,
      month: played.filter(
        (g) => new Date(g.games.started_at).getTime() > monthAgo,
      ).length,
    },
    games: recent.map((g) => ({
      id: g.id,
      score: g.score,
      rank: g.rank,
      startedAt: g.games.started_at,
      rounds: g.games.rounds,
      players: g.games.player_count,
      code: g.games.room_id,
      room: rooms[g.games.room_id] ?? null,
    })),
    salon: {
      hosted: hostedRes.data ?? [],
      played: (salonPlayedRes.data ?? []).filter((p) => p.games),
    },
    achievements: (unlockedRes.data ?? []).map((u) => ({
      ...u,
      name: catalog[u.achievement_id]?.name ?? u.achievement_id,
      icon: catalog[u.achievement_id]?.icon ?? "🏅",
    })),
    reports: reportsRes.data ?? [],
    audit: audit.map((a) => ({ ...a, admin: admins[a.admin_id] ?? null })),
    following: (followingRes.data ?? []).map((f) => ({
      id: f.id,
      at: f.created_at,
      user: f.user,
    })),
    followers: (followersRes.data ?? []).map((f) => ({
      id: f.id,
      at: f.created_at,
      user: f.user,
    })),
    friendships: (friendshipsRes.data ?? []).map((f) => ({
      id: f.id,
      status: f.status,
      at: f.accepted_at ?? f.created_at,
      user: f.requester_id === id ? f.addressee : f.requester,
    })),
    pro: proRes.data ?? null,
  };
}
