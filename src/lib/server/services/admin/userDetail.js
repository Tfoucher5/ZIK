import { getAdminClient } from "../../config.js";
import { profilesByIds } from "../profiles.js";

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
      .schema("ops")
      .from("reports")
      .select(
        "id, type, subject, status, message, created_at, reporter_id, reported_user_id, room_id",
      )
      .or(`reporter_id.eq.${id},reported_user_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .schema("social")
      .from("follows")
      .select("id, created_at, following_id")
      .eq("follower_id", id)
      .order("created_at", { ascending: false }),
    sb
      .schema("social")
      .from("follows")
      .select("id, created_at, follower_id")
      .eq("following_id", id)
      .order("created_at", { ascending: false }),
    sb
      .schema("social")
      .from("friendships")
      .select("id, status, created_at, accepted_at, requester_id, addressee_id")
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
      .schema("ops")
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
  const following = followingRes.data ?? [];
  const followers = followersRes.data ?? [];
  const friendships = friendshipsRes.data ?? [];
  const [roomsRes, people] = await Promise.all([
    roomCodes.length
      ? sb.from("rooms").select("code, name, emoji").in("code", roomCodes)
      : { data: [] },
    profilesByIds(sb, [
      ...audit.map((a) => a.admin_id),
      ...following.map((f) => f.following_id),
      ...followers.map((f) => f.follower_id),
      ...friendships.flatMap((f) => [f.requester_id, f.addressee_id]),
    ]),
  ]);
  const rooms = Object.fromEntries(
    (roomsRes.data ?? []).map((r) => [r.code, r]),
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
    audit: audit.map((a) => ({
      ...a,
      admin: people.get(a.admin_id)?.username ?? null,
    })),
    following: following.map((f) => ({
      id: f.id,
      at: f.created_at,
      user: people.get(f.following_id) ?? null,
    })),
    followers: followers.map((f) => ({
      id: f.id,
      at: f.created_at,
      user: people.get(f.follower_id) ?? null,
    })),
    friendships: friendships.map((f) => ({
      id: f.id,
      status: f.status,
      at: f.accepted_at ?? f.created_at,
      user:
        people.get(f.requester_id === id ? f.addressee_id : f.requester_id) ??
        null,
    })),
    pro: proRes.data ?? null,
  };
}
