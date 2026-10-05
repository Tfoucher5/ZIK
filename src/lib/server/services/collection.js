import { getAdminClient } from "../config.js";
import { CARD_SELECT, toCardView } from "../../components/card/cardView.js";
import { RARITY_ORDER } from "../../components/card/rarity.js";

const PAGE = 1000;
const CHUNK = 150; // ids par requête .in() : l'URL reste courte

const MIN_SET_SIZE = 3;

async function pages(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function chunked(ids, fetchChunk) {
  const out = [];
  for (let i = 0; i < ids.length; i += CHUNK)
    out.push(...(await fetchChunk(ids.slice(i, i + CHUNK))));
  return out;
}

// Nombre de cartes du catalogue, au total et par rareté : l'objectif affiché
// en haut de la collection. Recompté au plus toutes les 10 minutes.
const TOTALS_TTL = 10 * 60_000;
let totals = null;
let totalsAt = 0;

export async function catalogTotals(sb) {
  if (totals && Date.now() - totalsAt < TOTALS_TTL) return totals;
  const byRarity = {};
  await Promise.all(
    RARITY_ORDER.map(async (r) => {
      const { count } = await sb
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("rarity", r);
      byRarity[r] = count ?? 0;
    }),
  );
  totals = {
    total: Object.values(byRarity).reduce((a, b) => a + b, 0),
    byRarity,
  };
  totalsAt = Date.now();
  return totals;
}

/**
 * Collection d'un joueur : ses cartes et la progression de ses sets.
 * withPending : inclure les cartes encore en attente (compte de moins de 24 h),
 * réservé au propriétaire.
 */
export async function getCollection(userId, { withPending = false } = {}) {
  const sb = getAdminClient();
  const now = new Date().toISOString();

  const owned = await pages(() => {
    let q = sb
      .from("user_cards")
      .select(
        `copies, first_obtained_at, visible_at, cards(${CARD_SELECT}, first_owner:profiles!cards_first_owner_id_fkey(username))`,
      )
      .eq("user_id", userId)
      .order("first_obtained_at", { ascending: false });
    if (!withPending) q = q.lte("visible_at", now);
    return q;
  });

  const cards = owned
    .filter((r) => r.cards)
    .map((r) => ({
      ...toCardView(r.cards),
      copies: r.copies,
      obtainedAt: r.first_obtained_at,
      firstOwner: r.cards.first_owner?.username ?? null,
      pending: r.visible_at > now,
      visibleAt: r.visible_at,
    }));

  const ids = cards.map((c) => c.id);
  const items = await chunked(ids, async (chunk) => {
    const { data } = await sb
      .from("card_set_items")
      .select("set_id, card_id")
      .in("card_id", chunk);
    return data || [];
  });

  const ownedBySet = new Map();
  for (const it of items)
    ownedBySet.set(it.set_id, (ownedBySet.get(it.set_id) || 0) + 1);

  const setRows = await chunked([...ownedBySet.keys()], async (chunk) => {
    const { data } = await sb
      .from("card_sets")
      .select("id, kind, key, name, cover_url, card_count")
      .in("id", chunk)
      .gte("card_count", MIN_SET_SIZE);
    return data || [];
  });

  const { data: done } = await sb
    .from("user_card_sets")
    .select("set_id, completed_at")
    .eq("user_id", userId);
  const completed = new Map(
    (done || []).map((d) => [d.set_id, d.completed_at]),
  );

  const sets = setRows.map((s) => ({
    id: s.id,
    kind: s.kind,
    key: s.key,
    name: s.name,
    cover: s.cover_url,
    total: s.card_count,
    owned: ownedBySet.get(s.id) || 0,
    completedAt: completed.get(s.id) ?? null,
  }));

  return { cards, sets, catalog: await catalogTotals(sb) };
}

/**
 * Cartes d'un set vues par un joueur. Celles qu'il ne possède pas sont réduites
 * à une silhouette : ni titre, ni artiste, ni rareté ne quittent le serveur,
 * sinon la collection deviendrait l'antisèche des playlists.
 */
export async function getSetCards(setId, userId) {
  const sb = getAdminClient();
  const { data: set } = await sb
    .from("card_sets")
    .select("id, kind, key, name, cover_url, card_count")
    .eq("id", setId)
    .maybeSingle();
  if (!set) return null;

  const rows = await pages(() =>
    sb
      .from("card_set_items")
      .select(`cards(${CARD_SELECT})`)
      .eq("set_id", setId),
  );
  const all = rows.map((r) => r.cards).filter(Boolean);

  const { data: mine } = userId
    ? await sb
        .from("user_cards")
        .select("card_id, copies, first_obtained_at")
        .eq("user_id", userId)
        .lte("visible_at", new Date().toISOString())
        .in(
          "card_id",
          all.map((c) => c.id),
        )
    : { data: [] };
  const ownedMap = new Map((mine || []).map((m) => [m.card_id, m]));

  const cards = all
    .map((c) => {
      const own = ownedMap.get(c.id);
      if (own)
        return {
          ...toCardView(c),
          owned: true,
          copies: own.copies,
          obtainedAt: own.first_obtained_at,
        };
      const view = toCardView(c);
      return {
        id: c.id,
        number: c.number,
        rarity: "common",
        title: "",
        artist: "",
        album: "",
        coverMd: view.coverMd,
        coverXl: view.coverMd,
        color: "#2a2c31",
        rank: 0,
        fans: 0,
        owned: false,
      };
    })
    .sort((a, b) => Number(b.owned) - Number(a.owned) || a.number - b.number);

  return { set, cards };
}
