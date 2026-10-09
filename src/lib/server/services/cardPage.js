import { getAdminClient } from "../config.js";
import { CARD_SELECT, toCardView } from "../../components/card/cardView.js";
import { RARITIES } from "../../components/card/rarity.js";

/** Carte publique par numéro, avec ses statistiques (page /carte/[n]). */
export async function getCardByNumber(number) {
  if (!/^\d{1,7}$/.test(String(number))) return null;
  const sb = getAdminClient();
  const { data: row } = await sb
    .from("cards")
    .select(
      `${CARD_SELECT}, first_owned_at, first_owner:profiles!cards_first_owner_id_fkey(username)`,
    )
    .eq("number", Number(number))
    .maybeSingle();
  if (!row) return null;

  const [{ count: owners }, { data: stats }] = await Promise.all([
    sb
      .from("user_cards")
      .select("user_id", { count: "exact", head: true })
      .eq("card_id", row.id)
      .lte("visible_at", new Date().toISOString()),
    sb
      .from("tracks")
      .select("track_stats(players_exposed, found_full)")
      .eq("card_id", row.id),
  ]);

  let exposed = 0;
  let found = 0;
  for (const t of stats || []) {
    exposed += t.track_stats?.players_exposed || 0;
    found += t.track_stats?.found_full || 0;
  }
  const successRate = exposed >= 20 ? found / exposed : null;

  return {
    card: {
      ...toCardView(row, successRate),
      firstOwner: row.first_owner?.username ?? null,
      obtainedAt: null,
    },
    rarityLabel: RARITIES[row.rarity].label,
    owners: owners ?? 0,
    firstOwnedAt: row.first_owned_at,
  };
}
