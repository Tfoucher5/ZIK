import { getAdminClient } from "../config.js";
import { CARD_SELECT, toCardView } from "../../components/card/cardView.js";

const PAGE_SIZE = 20;

/**
 * Une page du classement des collectionneurs, avec pour chacun ses cartes par
 * rareté et ses 3 cartes les plus rares (aucune si profil privé).
 */
export async function cardsLeaderboardPage(offset) {
  const sb = getAdminClient();
  const { data: rows, error } = await sb.rpc("cards_leaderboard", {
    p_offset: offset,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  if (!rows.length) return rows;

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username")
    .in(
      "username",
      rows.map((r) => r.username),
    );
  const idOf = new Map(profiles.map((p) => [p.username, p.id]));

  const { data: showcase, error: scErr } = await sb.rpc("cards_showcase", {
    p_user_ids: [...idOf.values()],
  });
  if (scErr) throw scErr;
  const byUser = new Map(showcase.map((s) => [s.user_id, s]));

  const cardIds = showcase.flatMap((s) => s.best);
  const { data: cards } = cardIds.length
    ? await sb.from("cards").select(CARD_SELECT).in("id", cardIds)
    : { data: [] };
  const cardOf = new Map(cards.map((c) => [c.id, toCardView(c)]));

  return rows.map((r) => {
    const s = byUser.get(idOf.get(r.username));
    return {
      ...r,
      byRarity: s?.by_rarity ?? {},
      best: (s?.best ?? []).map((id) => cardOf.get(id)).filter(Boolean),
    };
  });
}
