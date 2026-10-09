import { fail } from "@sveltejs/kit";
import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import { fetchAllRows } from "$lib/admin/paginate.server.js";

const TYPES = ["one_time", "tiered"];
const RARITIES = ["common", "rare", "epic", "legendary"];
const CATEGORIES = ["streak", "wins", "score", "social", "challenge"];
const UNLOCKS_LIMIT = 100;

function parseTiers(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Paliers illisibles");
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((t) => t?.level && Number.isFinite(t?.target))
  ) {
    throw new Error("Chaque palier doit avoir un niveau et un objectif.");
  }
  return parsed;
}

export async function load() {
  const sb = getAdminClient();

  const [
    { data: defs, error: defsErr },
    owned,
    { count: players },
    { data: unlocks, error: unlocksErr },
  ] = await Promise.all([
    sb.from("achievements").select("*").order("category").order("id"),
    fetchAllRows(() =>
      sb
        .from("user_achievements")
        .select("user_id, achievement_id, tier")
        .order("id"),
    ),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb
      .from("user_achievements")
      .select(
        "id, user_id, achievement_id, tier, count, unlocked_at, profiles(username), achievements(name, icon)",
      )
      .order("unlocked_at", { ascending: false })
      .limit(UNLOCKS_LIMIT),
  ]);

  const holders = new Map();
  const tiers = new Map();
  for (const r of owned) {
    if (!holders.has(r.achievement_id))
      holders.set(r.achievement_id, new Set());
    holders.get(r.achievement_id).add(r.user_id);
    if (r.tier) {
      const key = `${r.achievement_id}:${r.tier}`;
      tiers.set(key, (tiers.get(key) || 0) + 1);
    }
  }

  return {
    players: players ?? 0,
    playersWithBadge: new Set(owned.map((r) => r.user_id)).size,
    totalUnlocks: owned.length,
    achievements: (defs || []).map((a) => ({
      ...a,
      holders: holders.get(a.id)?.size || 0,
      tierHolders: Object.fromEntries(
        (a.tiers || []).map((t) => [
          t.level,
          tiers.get(`${a.id}:${t.level}`) || 0,
        ]),
      ),
    })),
    unlocks: unlocks || [],
    error: defsErr?.message || unlocksErr?.message || null,
  };
}

function readDef(formData) {
  const def = {
    name: formData.get("name")?.trim(),
    description: formData.get("description")?.trim() || "",
    icon: formData.get("icon")?.trim() || "🏅",
    type: formData.get("type"),
    rarity: formData.get("rarity"),
    category: formData.get("category"),
  };
  if (!def.name) return { error: "Le nom est obligatoire." };
  if (!TYPES.includes(def.type)) return { error: "Type invalide" };
  if (!RARITIES.includes(def.rarity)) return { error: "Rareté invalide" };
  if (!CATEGORIES.includes(def.category))
    return { error: "Catégorie invalide" };
  try {
    def.tiers =
      def.type === "tiered" ? parseTiers(formData.get("tiers_json")) : null;
  } catch (e) {
    return { error: e.message };
  }
  if (def.type === "tiered" && !def.tiers?.length)
    return { error: "Ajoute au moins un palier." };
  return { def };
}

export const actions = {
  createAchievement: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = formData.get("id")?.trim();
    if (!id || !/^[a-z0-9_]+$/.test(id))
      return fail(400, {
        defError: "Identifiant : lettres minuscules, chiffres et _ uniquement.",
      });
    const { def, error } = readDef(formData);
    if (error) return fail(400, { defError: error });
    const { error: err } = await getAdminClient()
      .from("achievements")
      .insert({ id, ...def });
    if (err)
      return fail(400, {
        defError:
          err.code === "23505"
            ? "Un succès avec cet identifiant existe déjà."
            : err.message,
      });
    await logAdminAction(
      locals.adminId,
      "create_achievement",
      id,
      "achievement",
      { name: def.name },
    );
    return { done: `Succès « ${def.name} » créé.` };
  },

  editAchievement: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = formData.get("id");
    if (!id) return fail(400, { defError: "Succès introuvable" });
    const { def, error } = readDef(formData);
    if (error) return fail(400, { defError: error });
    const { error: err } = await getAdminClient()
      .from("achievements")
      .update(def)
      .eq("id", id);
    if (err) return fail(400, { defError: err.message });
    await logAdminAction(
      locals.adminId,
      "edit_achievement",
      id,
      "achievement",
      { name: def.name },
    );
    return { done: `Succès « ${def.name} » enregistré.` };
  },

  deleteAchievement: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = formData.get("id");
    const { error: err } = await getAdminClient()
      .from("achievements")
      .delete()
      .eq("id", id);
    if (err) return fail(400, { error: err.message });
    await logAdminAction(
      locals.adminId,
      "delete_achievement",
      id,
      "achievement",
    );
    return { done: "Succès supprimé." };
  },

  revokeUnlock: async ({ request, locals }) => {
    const formData = await request.formData();
    const id = formData.get("id");
    const { error: err } = await getAdminClient()
      .from("user_achievements")
      .delete()
      .eq("id", id);
    if (err) return fail(400, { error: err.message });
    await logAdminAction(
      locals.adminId,
      "revoke_achievement",
      id,
      "user_achievement",
    );
    return { done: "Succès retiré au joueur." };
  },

  grantUnlock: async ({ request, locals }) => {
    const formData = await request.formData();
    const username = formData.get("username")?.trim();
    const achievementId = formData.get("achievement_id");
    const tier = formData.get("tier")?.trim() || null;
    if (!username || !achievementId)
      return fail(400, { grantError: "Pseudo et succès requis." });

    const sb = getAdminClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!profile)
      return fail(400, { grantError: `Aucun joueur nommé « ${username} ».` });

    const { error: err } = await sb
      .from("user_achievements")
      .insert({ user_id: profile.id, achievement_id: achievementId, tier });
    if (err)
      return fail(400, {
        grantError:
          err.code === "23505"
            ? "Ce joueur a déjà ce succès (à ce palier)."
            : err.message,
      });
    await logAdminAction(
      locals.adminId,
      "grant_achievement",
      profile.id,
      "user_achievement",
      {
        achievement_id: achievementId,
        tier,
      },
    );
    return { done: `Succès attribué à ${username}.` };
  },
};
