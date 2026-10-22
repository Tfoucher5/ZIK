import { getAdminClient } from "../../config.js";
import { logAdminAction } from "../../middleware/auth.js";

// Actions de modération de /admin/users/[id]. En cas d'échec, retournent
// { status, error } ; sinon rien (ou une valeur utile à l'appelant).

export const BAN_DURATIONS = ["24h", "168h", "720h", "8760h", "87600h"];

const failed = (err, status = 500) => ({ status, error: err.message });

async function run(query, adminId, action, userId, payload) {
  const { error: err } = await query;
  if (err) return failed(err);
  await logAdminAction(adminId, action, userId, "user", payload);
}

export function banUser(adminId, userId, duration) {
  return run(
    getAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: duration,
    }),
    adminId,
    "ban_user",
    userId,
    { duration },
  );
}

export function unbanUser(adminId, userId) {
  return run(
    getAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: "none",
    }),
    adminId,
    "unban_user",
    userId,
  );
}

export function updateUserStats(adminId, userId, { xp, elo, level }) {
  return run(
    getAdminClient()
      .from("profiles")
      .update({ xp, elo, level })
      .eq("id", userId),
    adminId,
    "edit_stats",
    userId,
    { xp, elo, level },
  );
}

export async function updateUsername(adminId, userId, username) {
  const { error: err } = await getAdminClient()
    .from("profiles")
    .update({ username })
    .eq("id", userId);
  if (err)
    return {
      status: 400,
      error: err.code === "23505" ? "Ce pseudo est déjà pris." : err.message,
    };
  await logAdminAction(adminId, "edit_username", userId, "user", { username });
}

export function resetUserStats(adminId, userId) {
  return run(
    getAdminClient()
      .from("profiles")
      .update({ xp: 0, elo: 1000, level: 1, games_played: 0, total_score: 0 })
      .eq("id", userId),
    adminId,
    "reset_stats",
    userId,
  );
}

// days = 0 retire l'accès ; sinon prolonge l'abonnement en cours
export async function grantPro(adminId, userId, days) {
  const sb = getAdminClient();
  if (days === 0) {
    await sb.from("pro_subscriptions").delete().eq("user_id", userId);
  } else {
    const { data: cur } = await sb
      .from("pro_subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const curEnd =
      cur?.status === "active" ? new Date(cur.current_period_end).getTime() : 0;
    const from = Math.max(Date.now(), curEnd);
    const { error: err } = await sb.from("pro_subscriptions").upsert({
      user_id: userId,
      plan: "manual",
      status: "active",
      current_period_end: new Date(from + days * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (err) return failed(err);
  }
  await logAdminAction(adminId, "set_pro", userId, "user", { days });
}

export function setUserRole(adminId, userId, role) {
  return run(
    getAdminClient().from("profiles").update({ role }).eq("id", userId),
    adminId,
    "set_role",
    userId,
    { role },
  );
}

// Supprime le compte si le pseudo saisi correspond
export async function deleteUserAccount(adminId, userId, confirmUsername) {
  const sb = getAdminClient();
  const { data: profile } = await sb
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  if (confirmUsername !== profile?.username)
    return { status: 400, error: "Pseudo incorrect, suppression annulée." };
  const { error: err } = await sb.auth.admin.deleteUser(userId);
  if (err) return failed(err);
  await logAdminAction(adminId, "delete_user", userId, "user", {
    username: profile.username,
  });
}

export function deleteFollow(adminId, userId, followId) {
  return run(
    getAdminClient().from("follows").delete().eq("id", followId),
    adminId,
    "delete_follow",
    userId,
    { follow_id: followId },
  );
}

export function deleteFriendship(adminId, userId, friendshipId) {
  return run(
    getAdminClient().from("friendships").delete().eq("id", friendshipId),
    adminId,
    "delete_friendship",
    userId,
    { friendship_id: friendshipId },
  );
}
