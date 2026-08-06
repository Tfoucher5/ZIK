import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";

const TYPES = ["one_time", "tiered"];
const RARITIES = ["common", "rare", "epic", "legendary"];
const CATEGORIES = ["streak", "wins", "score", "social"];
const UNLOCKS_LIMIT = 100;

function parseTiers(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Paliers : JSON invalide");
  }
  if (!Array.isArray(parsed) || !parsed.every((t) => t?.level && Number.isFinite(t?.target))) {
    throw new Error("Paliers : chaque entrée doit avoir au moins level et target");
  }
  return parsed;
}

export async function load() {
  const sb = getAdminClient();

  const [{ data: defs, error: defsErr }, { data: holderRows }, { data: unlocks, error: unlocksErr }] =
    await Promise.all([
      sb.from("achievements").select("*").order("category").order("id"),
      sb.from("user_achievements").select("achievement_id"),
      sb
        .from("user_achievements")
        .select("id, user_id, achievement_id, tier, unlocked_at, profiles(username), achievements(name, icon)")
        .order("unlocked_at", { ascending: false })
        .limit(UNLOCKS_LIMIT),
    ]);

  const holderCounts = new Map();
  for (const r of holderRows || [])
    holderCounts.set(r.achievement_id, (holderCounts.get(r.achievement_id) || 0) + 1);

  return {
    achievements: (defs || []).map((a) => ({
      ...a,
      holders: holderCounts.get(a.id) || 0,
    })),
    unlocks: unlocks || [],
    error: defsErr?.message || unlocksErr?.message || null,
  };
}

export const actions = {
  createAchievement: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id")?.trim();
    const name = formData.get("name")?.trim();
    const description = formData.get("description")?.trim() || "";
    const icon = formData.get("icon")?.trim() || "🏅";
    const type = formData.get("type");
    const rarity = formData.get("rarity");
    const category = formData.get("category");

    if (!id || !name) return { success: false, error: "id et nom requis" };
    if (!TYPES.includes(type)) return { success: false, error: "Type invalide" };
    if (!RARITIES.includes(rarity)) return { success: false, error: "Rareté invalide" };
    if (!CATEGORIES.includes(category))
      return { success: false, error: "Catégorie invalide" };

    let tiers;
    try {
      tiers = type === "tiered" ? parseTiers(formData.get("tiers_json")) : null;
    } catch (e) {
      return { success: false, error: e.message };
    }

    const sb = getAdminClient();
    const { error: err } = await sb.from("achievements").insert({
      id,
      name,
      description,
      icon,
      type,
      rarity,
      category,
      tiers,
    });
    if (err) {
      if (err.code === "23505")
        return { success: false, error: "Un succès avec cet id existe déjà" };
      return { success: false, error: err.message };
    }
    await logAdminAction(adminUser.id, "create_achievement", id, "achievement", {
      name,
    });
    return { success: true };
  },

  editAchievement: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const name = formData.get("name")?.trim();
    const description = formData.get("description")?.trim() || "";
    const icon = formData.get("icon")?.trim() || "🏅";
    const type = formData.get("type");
    const rarity = formData.get("rarity");
    const category = formData.get("category");

    if (!id || !name) return { success: false, error: "id et nom requis" };
    if (!TYPES.includes(type)) return { success: false, error: "Type invalide" };
    if (!RARITIES.includes(rarity)) return { success: false, error: "Rareté invalide" };
    if (!CATEGORIES.includes(category))
      return { success: false, error: "Catégorie invalide" };

    let tiers;
    try {
      tiers = type === "tiered" ? parseTiers(formData.get("tiers_json")) : null;
    } catch (e) {
      return { success: false, error: e.message };
    }

    const sb = getAdminClient();
    const { error: err } = await sb
      .from("achievements")
      .update({ name, description, icon, type, rarity, category, tiers })
      .eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(adminUser.id, "edit_achievement", id, "achievement", {
      name,
    });
    return { success: true };
  },

  deleteAchievement: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const sb = getAdminClient();
    const { error: err } = await sb.from("achievements").delete().eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(adminUser.id, "delete_achievement", id, "achievement");
    return { success: true };
  },

  revokeUnlock: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = formData.get("id");
    const sb = getAdminClient();
    const { error: err } = await sb.from("user_achievements").delete().eq("id", id);
    if (err) return { success: false, error: err.message };
    await logAdminAction(adminUser.id, "revoke_achievement", id, "user_achievement");
    return { success: true };
  },

  grantUnlock: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const username = formData.get("username")?.trim();
    const achievementId = formData.get("achievement_id");
    const tier = formData.get("tier")?.trim() || null;
    if (!username || !achievementId)
      return { success: false, error: "Pseudo et succès requis" };

    const sb = getAdminClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!profile) return { success: false, error: "Utilisateur introuvable" };

    const { error: err } = await sb.from("user_achievements").insert({
      user_id: profile.id,
      achievement_id: achievementId,
      tier,
    });
    if (err) {
      if (err.code === "23505")
        return { success: false, error: "Ce joueur a déjà ce succès (à ce palier)" };
      return { success: false, error: err.message };
    }
    await logAdminAction(
      adminUser.id,
      "grant_achievement",
      profile.id,
      "user_achievement",
      { achievement_id: achievementId, tier },
    );
    return { success: true };
  },
};
