import { error, fail, redirect } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id) {
  if (!UUID_RE.test(id)) throw error(400, "ID invalide");
}

const BAN_DURATIONS = ["24h", "168h", "720h", "8760h", "87600h"];

export async function load({ params, locals }) {
  const sb = getAdminClient();
  const { id } = params;
  assertUuid(id);

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
  ]);

  if (profileRes.error || !profileRes.data)
    throw error(404, "Joueur introuvable");

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
    isSelf: locals.adminId === id,
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

async function setup({ request, params }) {
  assertUuid(params.id);
  return { fd: await request.formData(), sb: getAdminClient() };
}

export const actions = {
  ban: async (event) => {
    const { fd, sb } = await setup(event);
    const duration = fd.get("duration") || "87600h";
    if (!BAN_DURATIONS.includes(duration))
      return fail(400, { error: "Durée invalide" });
    const { error: err } = await sb.auth.admin.updateUserById(event.params.id, {
      ban_duration: duration,
    });
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "ban_user",
      event.params.id,
      "user",
      {
        duration,
      },
    );
    return { message: "Joueur banni." };
  },

  unban: async (event) => {
    const { sb } = await setup(event);
    const { error: err } = await sb.auth.admin.updateUserById(event.params.id, {
      ban_duration: "none",
    });
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "unban_user",
      event.params.id,
      "user",
    );
    return { message: "Joueur débanni." };
  },

  editStats: async (event) => {
    const { fd, sb } = await setup(event);
    const xp = Math.max(0, parseInt(fd.get("xp"), 10) || 0);
    const elo = Math.max(
      0,
      Math.min(99999, parseInt(fd.get("elo"), 10) || 1000),
    );
    const level = Math.max(
      1,
      Math.min(1000, parseInt(fd.get("level"), 10) || 1),
    );
    const { error: err } = await sb
      .from("profiles")
      .update({ xp, elo, level })
      .eq("id", event.params.id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "edit_stats",
      event.params.id,
      "user",
      {
        xp,
        elo,
        level,
      },
    );
    return { message: "Stats enregistrées." };
  },

  editUsername: async (event) => {
    const { fd, sb } = await setup(event);
    const username = fd.get("username")?.trim();
    if (!username || username.length < 3 || username.length > 20)
      return fail(400, { error: "Le pseudo doit faire de 3 à 20 caractères." });
    const { error: err } = await sb
      .from("profiles")
      .update({ username })
      .eq("id", event.params.id);
    if (err)
      return fail(400, {
        error: err.code === "23505" ? "Ce pseudo est déjà pris." : err.message,
      });
    await logAdminAction(
      event.locals.adminId,
      "edit_username",
      event.params.id,
      "user",
      {
        username,
      },
    );
    return { message: "Pseudo modifié." };
  },

  resetStats: async (event) => {
    const { sb } = await setup(event);
    const { error: err } = await sb
      .from("profiles")
      .update({ xp: 0, elo: 1000, level: 1, games_played: 0, total_score: 0 })
      .eq("id", event.params.id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "reset_stats",
      event.params.id,
      "user",
    );
    return { message: "Stats remises à zéro." };
  },

  setPro: async (event) => {
    const { fd, sb } = await setup(event);
    const days = parseInt(fd.get("days"), 10);
    if (!(days >= 0 && days <= 3650))
      return fail(400, { error: "Nombre de jours invalide" });
    if (days === 0) {
      await sb
        .from("pro_subscriptions")
        .delete()
        .eq("user_id", event.params.id);
    } else {
      const { data: cur } = await sb
        .from("pro_subscriptions")
        .select("status, current_period_end")
        .eq("user_id", event.params.id)
        .maybeSingle();
      const curEnd =
        cur?.status === "active"
          ? new Date(cur.current_period_end).getTime()
          : 0;
      const from = Math.max(Date.now(), curEnd);
      const { error: err } = await sb.from("pro_subscriptions").upsert({
        user_id: event.params.id,
        plan: "manual",
        status: "active",
        current_period_end: new Date(from + days * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (err) return fail(500, { error: err.message });
    }
    await logAdminAction(
      event.locals.adminId,
      "set_pro",
      event.params.id,
      "user",
      {
        days,
      },
    );
    return {
      message: days
        ? `${days} jour${days > 1 ? "s" : ""} de Pro offert${days > 1 ? "s" : ""}.`
        : "Accès Pro retiré.",
    };
  },

  setRole: async (event) => {
    const { fd, sb } = await setup(event);
    if (event.params.id === event.locals.adminId)
      return fail(400, { error: "Impossible de modifier son propre rôle" });
    const role = fd.get("role");
    if (!["user", "super_admin"].includes(role))
      return fail(400, { error: "Rôle invalide" });
    const { error: err } = await sb
      .from("profiles")
      .update({ role })
      .eq("id", event.params.id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "set_role",
      event.params.id,
      "user",
      {
        role,
      },
    );
    return {
      message:
        role === "super_admin"
          ? "Joueur nommé admin."
          : "Droits admin retirés.",
    };
  },

  deleteUser: async (event) => {
    const { fd, sb } = await setup(event);
    const { data: profile } = await sb
      .from("profiles")
      .select("username")
      .eq("id", event.params.id)
      .single();
    if (fd.get("confirm_username")?.trim() !== profile?.username)
      return fail(400, { error: "Pseudo incorrect, suppression annulée." });
    const { error: err } = await sb.auth.admin.deleteUser(event.params.id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "delete_user",
      event.params.id,
      "user",
      {
        username: profile.username,
      },
    );
    throw redirect(303, "/admin/users");
  },

  deleteFollow: async (event) => {
    const { fd, sb } = await setup(event);
    const id = fd.get("id");
    if (!/^\d+$/.test(id ?? "")) return fail(400, { error: "id invalide" });
    const { error: err } = await sb.from("follows").delete().eq("id", id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "delete_follow",
      event.params.id,
      "user",
      {
        follow_id: id,
      },
    );
    return { message: "Abonnement retiré." };
  },

  deleteFriendship: async (event) => {
    const { fd, sb } = await setup(event);
    const id = fd.get("id");
    if (!/^\d+$/.test(id ?? "")) return fail(400, { error: "id invalide" });
    const { error: err } = await sb.from("friendships").delete().eq("id", id);
    if (err) return fail(500, { error: err.message });
    await logAdminAction(
      event.locals.adminId,
      "delete_friendship",
      event.params.id,
      "user",
      {
        friendship_id: id,
      },
    );
    return { message: "Amitié supprimée." };
  },
};
