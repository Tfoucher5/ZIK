import { getAdminClient } from "$lib/server/config.js";
import { catalogTotals } from "$lib/server/services/collection.js";
import { CARD_SELECT, toCardView } from "$lib/components/card/cardView.js";
import { RARITY_ORDER } from "$lib/components/card/rarity.js";

// Page publique des cartes : une carte en exemple par rareté, la plus écoutée
// de sa catégorie, et le nombre de cartes du catalogue.
let cache = null;
let cachedAt = 0;
const TTL = 60 * 60_000;

export async function load({ setHeaders }) {
  setHeaders({ "Cache-Control": "public, max-age=600" });
  if (cache && Date.now() - cachedAt < TTL) return cache;

  const sb = getAdminClient();
  const [totals, ...samples] = await Promise.all([
    catalogTotals(sb),
    ...RARITY_ORDER.map((r) =>
      sb
        .from("cards")
        .select(CARD_SELECT)
        .eq("rarity", r)
        .not("album_id", "is", null)
        .order("deezer_rank", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  cache = {
    totals,
    samples: samples.map((s) => toCardView(s.data)).filter(Boolean),
  };
  cachedAt = Date.now();
  return cache;
}
