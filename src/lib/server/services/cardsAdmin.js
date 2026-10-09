// Contrôle du catalogue de cartes et révocation (spec docs/specs/cartes.md,
// garde-fou G12). Utilisé par /admin/cards et par les scripts de maintenance :
// pas d'alias $lib ici.
import { enrichTrack } from "./cards.js";

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
 * Révoque des cartes gagnées : la ligne du journal passe en « revoked », la
 * carte quitte la collection et les sets qu'elle complétait ne sont plus
 * terminés.
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

/**
 * Correction admin d'une carte rattachée au mauvais titre (spec I6) : la
 * carte de la bonne version Deezer la remplace pour les titres du catalogue,
 * les collections et le journal. La rareté peut donc baisser.
 * deezerRef : id ou lien d'un titre Deezer.
 */
export async function correctCard(sb, cardId, deezerRef) {
  const deezerId = String(deezerRef).match(/(\d+)\D*$/)?.[1];
  const t = deezerId
    ? await fetch(`https://api.deezer.com/track/${deezerId}`)
        .then((r) => r.json())
        .catch(() => null)
    : null;
  if (!t?.id || t.error) return { error: "Titre Deezer introuvable" };

  const newId = await enrichTrack(sb, {
    artist: t.artist.name,
    title: t.title,
    source: "deezer",
    external_id: String(t.id),
  });
  if (!newId) return { error: "Carte impossible à créer" };
  if (newId === cardId) return { cardId };

  await sb.from("tracks").update({ card_id: newId }).eq("card_id", cardId);
  const { data: owners } = await sb
    .from("user_cards")
    .select("*")
    .eq("card_id", cardId);
  for (const o of owners || []) {
    // Déjà possédée sous sa bonne version : rien à ajouter (pas de doublons)
    await sb
      .from("user_cards")
      .upsert(
        { ...o, card_id: newId },
        { onConflict: "user_id,card_id", ignoreDuplicates: true },
      );
  }
  await sb.from("card_grants").update({ card_id: newId }).eq("card_id", cardId);
  const { data: items } = await sb
    .from("card_set_items")
    .select("set_id")
    .in("card_id", [cardId, newId]);
  await deleteCards(sb, [cardId]);
  const setIds = [...new Set((items || []).map((r) => r.set_id))];
  for (const o of owners || []) await recheckSets(sb, o.user_id, setIds);
  return { cardId: newId };
}

// Sets terminés d'un joueur après un changement de cartes : un set n'est
// terminé que s'il compte au moins 3 cartes, toutes possédées
async function recheckSets(sb, userId, setIds) {
  for (const setId of setIds) {
    const { data: set } = await sb
      .from("card_sets")
      .select("card_count")
      .eq("id", setId)
      .maybeSingle();
    const { data: items } = await sb
      .from("card_set_items")
      .select("card_id")
      .eq("set_id", setId);
    const ids = (items || []).map((r) => r.card_id);
    const { count } = ids.length
      ? await sb
          .from("user_cards")
          .select("card_id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("card_id", ids)
      : { count: 0 };
    const done = !!set && set.card_count >= 3 && count === ids.length;
    if (done)
      await sb
        .from("user_card_sets")
        .upsert(
          { user_id: userId, set_id: setId },
          { onConflict: "user_id,set_id", ignoreDuplicates: true },
        );
    else
      await sb
        .from("user_card_sets")
        .delete()
        .eq("user_id", userId)
        .eq("set_id", setId);
  }
}

/**
 * Duos suspects (spec G12) : joueurs dont les cartes viennent presque toujours
 * de parties jouées avec le même partenaire. Signal pour l'admin, jamais une
 * sanction.
 */
export async function suspiciousPairs(
  sb,
  { days = 30, minGames = 5, share = 0.8 } = {},
) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const grants = await allRows(sb, "card_grants", "id, user_id, game_id", (q) =>
    q
      .eq("status", "granted")
      .gte("created_at", since)
      .not("game_id", "is", null),
  );
  const gamesByUser = new Map();
  const cardsByUser = new Map();
  for (const g of grants) {
    if (!gamesByUser.has(g.user_id)) gamesByUser.set(g.user_id, new Set());
    gamesByUser.get(g.user_id).add(g.game_id);
    cardsByUser.set(g.user_id, (cardsByUser.get(g.user_id) || 0) + 1);
  }
  const gameIds = [...new Set(grants.map((g) => g.game_id))];
  const players = new Map();
  for (let i = 0; i < gameIds.length; i += 200) {
    const { data } = await sb
      .from("game_players")
      .select("game_id, user_id")
      .in("game_id", gameIds.slice(i, i + 200))
      .not("user_id", "is", null);
    for (const p of data || []) {
      if (!players.has(p.game_id)) players.set(p.game_id, new Set());
      players.get(p.game_id).add(p.user_id);
    }
  }

  const pairs = [];
  for (const [userId, games] of gamesByUser) {
    if (games.size < minGames) continue;
    const partners = new Map();
    for (const gameId of games)
      for (const other of players.get(gameId) || [])
        if (other !== userId)
          partners.set(other, (partners.get(other) || 0) + 1);
    for (const [partnerId, together] of partners)
      if (together / games.size >= share)
        pairs.push({
          userId,
          partnerId,
          games: games.size,
          together,
          cards: cardsByUser.get(userId),
        });
  }
  return pairs.sort((a, b) => b.cards - a.cards);
}
