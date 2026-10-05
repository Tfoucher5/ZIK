// Contrôle du catalogue de cartes et révocation (spec docs/specs/cartes.md,
// garde-fou G12). Utilisé par /admin/cards et par les scripts de maintenance :
// pas d'alias $lib ici.

async function allRows(sb, table, columns, filter = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(sb.from(table).select(columns))
      .order(columns.split(",")[0].trim())
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/**
 * Incohérences du catalogue : titres vérifiés restés sans carte, cartes que
 * plus aucun titre n'utilise (et que personne ne possède ni n'a gagnées).
 */
export async function auditCatalog(sb) {
  const [tracks, cards, owned, granted] = await Promise.all([
    allRows(sb, "tracks", "id, card_id, card_checked_at, artist, title"),
    allRows(sb, "cards", "id"),
    allRows(sb, "user_cards", "card_id"),
    allRows(sb, "card_grants", "card_id"),
  ]);
  const used = new Set(tracks.map((t) => t.card_id).filter(Boolean));
  const kept = new Set([...owned, ...granted].map((r) => r.card_id));
  return {
    tracks: tracks.length,
    cards: cards.length,
    unchecked: tracks.filter((t) => !t.card_checked_at).length,
    withoutCard: tracks.filter((t) => t.card_checked_at && !t.card_id),
    orphanCards: cards.filter((c) => !used.has(c.id)).map((c) => c.id),
    removableCards: cards
      .filter((c) => !used.has(c.id) && !kept.has(c.id))
      .map((c) => c.id),
  };
}

// Recompte les sets touchés, et supprime ceux qui n'ont plus aucune carte
async function recountSets(sb, setIds) {
  for (const id of new Set(setIds)) {
    const { count } = await sb
      .from("card_set_items")
      .select("card_id", { count: "exact", head: true })
      .eq("set_id", id);
    if (count)
      await sb.from("card_sets").update({ card_count: count }).eq("id", id);
    else await sb.from("card_sets").delete().eq("id", id);
  }
}

/** Supprime des cartes sans titre, jamais possédées ni gagnées. */
export async function deleteCards(sb, ids) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: items } = await sb
      .from("card_set_items")
      .select("set_id")
      .in("card_id", chunk);
    const { error } = await sb.from("cards").delete().in("id", chunk);
    if (error) throw error;
    deleted += chunk.length;
    await recountSets(
      sb,
      (items || []).map((r) => r.set_id),
    );
  }
  return deleted;
}

/**
 * Révoque des cartes gagnées : la ligne du journal passe en « revoked », un
 * exemplaire est retiré de la collection (la carte disparaît au dernier) et
 * les sets qu'elle complétait ne sont plus terminés.
 */
export async function revokeGrants(sb, grantIds) {
  const { data: grants } = await sb
    .from("card_grants")
    .select("id, user_id, card_id, status")
    .in("id", grantIds)
    .in("status", ["pending", "granted"]);

  for (const g of grants || []) {
    await sb
      .from("card_grants")
      .update({ status: "revoked", settled_at: new Date().toISOString() })
      .eq("id", g.id);
    if (g.status !== "granted") continue;

    const { data: row } = await sb
      .from("user_cards")
      .select("copies")
      .eq("user_id", g.user_id)
      .eq("card_id", g.card_id)
      .maybeSingle();
    if (!row) continue;
    if (row.copies > 1) {
      await sb
        .from("user_cards")
        .update({ copies: row.copies - 1 })
        .eq("user_id", g.user_id)
        .eq("card_id", g.card_id);
      continue;
    }
    await sb
      .from("user_cards")
      .delete()
      .eq("user_id", g.user_id)
      .eq("card_id", g.card_id);
    const { data: items } = await sb
      .from("card_set_items")
      .select("set_id")
      .eq("card_id", g.card_id);
    const setIds = (items || []).map((r) => r.set_id);
    if (setIds.length)
      await sb
        .from("user_card_sets")
        .delete()
        .eq("user_id", g.user_id)
        .in("set_id", setIds);
  }
  return (grants || []).length;
}
