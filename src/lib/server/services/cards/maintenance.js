import { getAdminClient } from "../../config.js";
import {
  rarityFromRank,
  RARITY_ORDER,
} from "../../../components/card/rarity.js";
import { deezer } from "./deezerApi.js";
import { enrichPending, enrichOne, TRACK_FIELDS } from "./enrich.js";

const RARITY_RANK = Object.fromEntries(RARITY_ORDER.map((r, i) => [r, i]));

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const isFestive = (date) =>
  date.getMonth() === 11 || (date.getMonth() === 0 && date.getDate() <= 6);

/**
 * Passage mensuel des raretés provisoires (spec section 3) : une sortie de
 * moins de 12 mois ne peut que monter, puis se fige ; une carte créée pendant
 * les fêtes est recalculée à partir du 15 janvier, à la baisse possible, puis
 * se fige. Les possesseurs sont prévenus quand leur carte monte.
 */
export async function refreshProvisional(now = new Date()) {
  const sb = getAdminClient();
  const cards = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from("cards")
      .select(
        "id, number, title, deezer_track_id, deezer_rank, rarity, created_at",
      )
      .is("rarity_locked_at", null)
      .order("id")
      .range(from, from + 999);
    cards.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const holidays =
    isFestive(now) || (now.getMonth() === 0 && now.getDate() < 15);
  const { createNotification } = await import("../notify/notifications.js");
  let raised = 0;

  for (const card of cards) {
    const festive = isFestive(new Date(card.created_at));
    if (festive && holidays) continue;
    const t = await deezer(`/track/${card.deezer_track_id}`);
    if (!t) continue;
    const recent = t.release_date && now - new Date(t.release_date) < YEAR_MS;
    const rank =
      festive && !recent
        ? t.rank || 0
        : Math.max(card.deezer_rank, t.rank || 0);
    const rarity = rarityFromRank(rank);
    await sb
      .from("cards")
      .update({
        deezer_rank: rank,
        rarity,
        rarity_locked_at: recent ? null : now.toISOString(),
      })
      .eq("id", card.id);

    if (RARITY_RANK[rarity] <= RARITY_RANK[card.rarity]) continue;
    raised++;
    const { data: owners } = await sb
      .from("user_cards")
      .select("user_id")
      .eq("card_id", card.id);
    for (const { user_id } of owners || [])
      await createNotification({
        userId: user_id,
        type: "card_up",
        actorId: user_id,
        payload: { number: card.number, title: card.title, rarity },
      });
  }
  return { checked: cards.length, raised };
}

/**
 * Entretien quotidien, lancé par le serveur : titres jamais vérifiés ou en
 * échec depuis 30 jours, et passage des raretés provisoires le 1er du mois
 * (et le 15 janvier pour les cartes des fêtes).
 */
export async function dailyCardsMaintenance(now = new Date()) {
  try {
    const enriched = await enrichPending();
    if (enriched.total)
      console.log(
        `[cards] entretien : ${enriched.found}/${enriched.done} titres rattachés`,
      );
    if (now.getDate() === 1 || (now.getMonth() === 0 && now.getDate() === 15)) {
      const res = await refreshProvisional(now);
      console.log(
        `[cards] raretés provisoires : ${res.checked} vérifiées, ${res.raised} en hausse`,
      );
    }
  } catch (e) {
    console.error("[cards] entretien :", e.message);
  }
}

// ── File d'attente en ligne : titres ajoutés au catalogue ────────────────────
const queue = new Set();
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    const sb = getAdminClient();
    while (queue.size) {
      const ids = [...queue].slice(0, 50);
      ids.forEach((id) => queue.delete(id));
      const { data: tracks } = await sb
        .from("tracks")
        .select(TRACK_FIELDS)
        .in("id", ids)
        .is("card_checked_at", null);
      for (const t of tracks || []) await enrichOne(sb, t);
    }
  } catch (e) {
    console.error("[cards] file d'enrichissement :", e.message);
  } finally {
    draining = false;
  }
}

/** Met en file des titres du catalogue fraîchement ajoutés. Ne bloque pas l'appelant. */
export function enqueueCardEnrichment(trackIds) {
  for (const id of trackIds || []) if (id) queue.add(id);
  drain();
}
