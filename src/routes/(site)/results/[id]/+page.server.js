import { error } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";

export async function load({ params }) {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(params.id)) throw error(404, "Résultat introuvable");

  const { data: result } = await supabase
    .from("game_results")
    .select(
      "id, username, score, rank, total_players, room_name, room_emoji, achievement_ids, created_at",
    )
    .eq("id", params.id)
    .single();

  if (!result) throw error(404, "Résultat introuvable");

  let unlockedAchievements = [];
  if (result.achievement_ids?.length) {
    const baseIds = [
      ...new Set(result.achievement_ids.map((a) => a.split(":")[0])),
    ];
    const { data: defs } = await supabase
      .from("achievements")
      .select("id, name, icon, rarity")
      .in("id", baseIds);
    const defMap = Object.fromEntries((defs || []).map((d) => [d.id, d]));
    unlockedAchievements = result.achievement_ids
      .map((a) => {
        const [id, tier] = a.split(":");
        const def = defMap[id];
        return def ? { ...def, tier: tier || null } : null;
      })
      .filter(Boolean);
  }

  return { result, unlockedAchievements };
}
