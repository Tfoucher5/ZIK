import { error, fail, redirect } from "@sveltejs/kit";
import { isUuid } from "$lib/shared/utils.js";
import { getAdminUserDetail } from "$lib/server/services/admin/userDetail.js";
import {
  BAN_DURATIONS,
  banUser,
  unbanUser,
  updateUserStats,
  updateUsername,
  resetUserStats,
  grantPro,
  setUserRole,
  deleteUserAccount,
  deleteFollow,
  deleteFriendship,
} from "$lib/server/services/admin/userActions.js";

function assertUuid(id) {
  if (!isUuid(id)) throw error(400, "ID invalide");
}

export async function load({ params, locals }) {
  assertUuid(params.id);
  const detail = await getAdminUserDetail(params.id, locals.adminId);
  if (!detail) throw error(404, "Joueur introuvable");
  return detail;
}

async function setup({ request, params, locals }) {
  assertUuid(params.id);
  return {
    fd: await request.formData(),
    adminId: locals.adminId,
    userId: params.id,
  };
}

const reply = (res, message) =>
  res ? fail(res.status, { error: res.error }) : { message };

const intIn = (v, min, max, fallback) =>
  Math.max(min, Math.min(max, parseInt(v, 10) || fallback));

export const actions = {
  ban: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const duration = fd.get("duration") || "87600h";
    if (!BAN_DURATIONS.includes(duration))
      return fail(400, { error: "Durée invalide" });
    return reply(await banUser(adminId, userId, duration), "Joueur banni.");
  },

  unban: async (event) => {
    const { adminId, userId } = await setup(event);
    return reply(await unbanUser(adminId, userId), "Joueur débanni.");
  },

  editStats: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const stats = {
      xp: Math.max(0, parseInt(fd.get("xp"), 10) || 0),
      elo: intIn(fd.get("elo"), 0, 99999, 1000),
      level: intIn(fd.get("level"), 1, 1000, 1),
    };
    return reply(
      await updateUserStats(adminId, userId, stats),
      "Stats enregistrées.",
    );
  },

  editUsername: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const username = fd.get("username")?.trim();
    if (!username || username.length < 3 || username.length > 20)
      return fail(400, { error: "Le pseudo doit faire de 3 à 20 caractères." });
    return reply(
      await updateUsername(adminId, userId, username),
      "Pseudo modifié.",
    );
  },

  resetStats: async (event) => {
    const { adminId, userId } = await setup(event);
    return reply(
      await resetUserStats(adminId, userId),
      "Stats remises à zéro.",
    );
  },

  setPro: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const days = parseInt(fd.get("days"), 10);
    if (!(days >= 0 && days <= 3650))
      return fail(400, { error: "Nombre de jours invalide" });
    const s = days > 1 ? "s" : "";
    return reply(
      await grantPro(adminId, userId, days),
      days ? `${days} jour${s} de Pro offert${s}.` : "Accès Pro retiré.",
    );
  },

  setRole: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    if (userId === adminId)
      return fail(400, { error: "Impossible de modifier son propre rôle" });
    const role = fd.get("role");
    if (!["user", "super_admin"].includes(role))
      return fail(400, { error: "Rôle invalide" });
    return reply(
      await setUserRole(adminId, userId, role),
      role === "super_admin" ? "Joueur nommé admin." : "Droits admin retirés.",
    );
  },

  deleteUser: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const res = await deleteUserAccount(
      adminId,
      userId,
      fd.get("confirm_username")?.trim(),
    );
    if (res) return fail(res.status, { error: res.error });
    throw redirect(303, "/admin/users");
  },

  deleteFollow: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const id = fd.get("id");
    if (!/^\d+$/.test(id ?? "")) return fail(400, { error: "id invalide" });
    return reply(await deleteFollow(adminId, userId, id), "Abonnement retiré.");
  },

  deleteFriendship: async (event) => {
    const { fd, adminId, userId } = await setup(event);
    const id = fd.get("id");
    if (!/^\d+$/.test(id ?? "")) return fail(400, { error: "id invalide" });
    return reply(
      await deleteFriendship(adminId, userId, id),
      "Amitié supprimée.",
    );
  },
};
