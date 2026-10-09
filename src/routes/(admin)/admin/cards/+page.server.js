import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import {
  auditCatalog,
  correctCard,
  deleteCards,
  revokeGrants,
  suspiciousPairs,
} from "$lib/server/services/cardsAdmin.js";
import { RARITY_ORDER } from "$lib/components/card/rarity.js";
import { GRANT_STATUSES, parseCardSearch } from "$lib/admin/cartes.js";

const STATUSES = Object.keys(GRANT_STATUSES);
const CARD_COLUMNS =
  "id, number, title, artist, year, rarity, deezer_rank, rarity_locked_at, deezer_track_id, created_at";

async function usernames(sb, ids) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return {};
  const { data } = await sb
    .from("profiles")
    .select("id, username")
    .in("id", list);
  return Object.fromEntries((data || []).map((p) => [p.id, p.username]));
}

async function searchCards(sb, q, rarity) {
  const parsed = parseCardSearch(q);
  if (!parsed && !rarity) return null;
  let query = sb
    .from("cards")
    .select(CARD_COLUMNS)
    .order("number", { ascending: !!parsed })
    .limit(40);
  if (parsed?.number) query = query.eq("number", parsed.number);
  if (parsed?.text)
    query = query.or(
      `title.ilike."%${parsed.text}%",artist.ilike."%${parsed.text}%"`,
    );
  if (rarity) query = query.eq("rarity", rarity);
  const { data } = await query;
  return data || [];
}

async function cardDetail(sb, number) {
  const { data: card } = await sb
    .from("cards")
    .select(
      `${CARD_COLUMNS}, isrc, first_owner_id, first_owned_at, card_albums(title, year, cover_md_url, cover_url)`,
    )
    .eq("number", number)
    .maybeSingle();
  if (!card) return null;

  const [owners, ownersCount, tracks, sets, grants] = await Promise.all([
    sb
      .from("user_cards")
      .select("user_id, copies, first_obtained_at")
      .eq("card_id", card.id)
      .order("first_obtained_at", { ascending: true })
      .limit(20),
    sb
      .from("user_cards")
      .select("*", { count: "exact", head: true })
      .eq("card_id", card.id),
    sb
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("card_id", card.id),
    sb
      .from("card_set_items")
      .select("card_sets(id, kind, name, card_count)")
      .eq("card_id", card.id),
    Promise.all(
      STATUSES.map((s) =>
        sb
          .from("card_grants")
          .select("*", { count: "exact", head: true })
          .eq("card_id", card.id)
          .eq("status", s),
      ),
    ),
  ]);

  const ownerRows = owners.data || [];
  const names = await usernames(sb, [
    card.first_owner_id,
    ...ownerRows.map((o) => o.user_id),
  ]);
  return {
    ...card,
    firstOwner: card.first_owner_id
      ? { id: card.first_owner_id, username: names[card.first_owner_id] }
      : null,
    owners: ownerRows.map((o) => ({ ...o, username: names[o.user_id] })),
    ownersCount: ownersCount.count ?? 0,
    tracks: tracks.count ?? 0,
    sets: (sets.data || []).map((r) => r.card_sets).filter(Boolean),
    grants: Object.fromEntries(
      STATUSES.map((s, i) => [s, grants[i].count ?? 0]),
    ),
  };
}

export async function load({ url }) {
  const sb = getAdminClient();
  const who = url.searchParams.get("who")?.trim() || "";
  let user = url.searchParams.get("user") || "";
  const status = STATUSES.includes(url.searchParams.get("status"))
    ? url.searchParams.get("status")
    : "";
  const q = url.searchParams.get("q") || "";
  const rarity = RARITY_ORDER.includes(url.searchParams.get("rarity"))
    ? url.searchParams.get("rarity")
    : "";
  const cardNumber = Number(url.searchParams.get("card")) || 0;

  let whoMissing = false;
  if (who && !user) {
    const { data } = await sb
      .from("profiles")
      .select("id")
      .ilike("username", who.replace(/[%_\\]/g, "\\$&"))
      .limit(1)
      .maybeSingle();
    if (data) user = data.id;
    else whoMissing = true;
  }

  const head = (table, columns = "*") =>
    sb.from(table).select(columns, { count: "exact", head: true });

  let grantsQuery = sb
    .from("card_grants")
    .select(
      "id, user_id, card_id, room_id, round, mode, answer_ms, active_accounts, delayed, status, created_at, cards(number, title, artist, rarity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (user) grantsQuery = grantsQuery.eq("user_id", user);
  if (status) grantsQuery = grantsQuery.eq("status", status);

  const [
    byStatus,
    byRarity,
    ownedByRarity,
    owned,
    provisional,
    sets,
    signalsRes,
    grantsRes,
    reportsRes,
    pairs,
    results,
    card,
  ] = await Promise.all([
    Promise.all(STATUSES.map((s) => head("card_grants").eq("status", s))),
    Promise.all(RARITY_ORDER.map((r) => head("cards").eq("rarity", r))),
    Promise.all(
      RARITY_ORDER.map((r) =>
        head("user_cards", "card_id, cards!inner(rarity)").eq(
          "cards.rarity",
          r,
        ),
      ),
    ),
    head("user_cards"),
    head("cards").is("rarity_locked_at", null),
    head("card_sets"),
    sb
      .from("card_signals")
      .select(
        "id, user_id, grant_id, reason, details, created_at, card_grants(card_id, status, room_id, cards(number, title, artist, rarity))",
        { count: "exact" },
      )
      .eq("reviewed", false)
      .order("created_at", { ascending: false })
      .limit(100),
    grantsQuery,
    sb
      .from("reports")
      .select("id, message, metadata, created_at", { count: "exact" })
      .eq("subject", "card")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    suspiciousPairs(sb),
    searchCards(sb, q, rarity),
    cardNumber ? cardDetail(sb, cardNumber) : null,
  ]);

  const signals = signalsRes.data || [];
  const grants = grantsRes.data || [];
  const reports = reportsRes.data || [];
  const numbers = reports.map((r) => r.metadata?.card).filter(Boolean);
  const { data: reported } = numbers.length
    ? await sb
        .from("cards")
        .select("id, number, title, artist, rarity, deezer_track_id")
        .in("number", numbers)
    : { data: [] };
  const byNumber = Object.fromEntries(
    (reported || []).map((c) => [c.number, c]),
  );
  const names = await usernames(sb, [
    user,
    ...[...signals, ...grants].map((r) => r.user_id),
    ...pairs.flatMap((p) => [p.userId, p.partnerId]),
  ]);

  return {
    stats: {
      grants: Object.fromEntries(
        STATUSES.map((s, i) => [s, byStatus[i].count ?? 0]),
      ),
      rarity: RARITY_ORDER.map((r, i) => ({
        key: r,
        catalog: byRarity[i].count ?? 0,
        owned: ownedByRarity[i].count ?? 0,
      })),
      owned: owned.count ?? 0,
      provisional: provisional.count ?? 0,
      sets: sets.count ?? 0,
      signals: signalsRes.count ?? signals.length,
      reports: reportsRes.count ?? reports.length,
    },
    signals: signals.map((s) => ({ ...s, username: names[s.user_id] })),
    grants: grants.map((g) => ({ ...g, username: names[g.user_id] })),
    reports: reports.map((r) => ({ ...r, card: byNumber[r.metadata?.card] })),
    pairs: pairs.map((p) => ({
      ...p,
      username: names[p.userId],
      partner: names[p.partnerId],
    })),
    filters: { user, username: names[user] || "", who, whoMissing, status },
    search: { q, rarity, results },
    card,
    cardNumber,
  };
}

export const actions = {
  correctCard: async ({ request, locals }) => {
    const formData = await request.formData();
    const reportId = formData.get("report_id");
    const cardId = formData.get("card_id");
    const deezer = String(formData.get("deezer") || "").trim();
    if (!cardId || !deezer)
      return { success: false, error: "Colle un lien ou un numéro Deezer." };
    const sb = getAdminClient();
    const res = await correctCard(sb, cardId, deezer);
    if (res.error) return { success: false, error: res.error };
    if (reportId)
      await sb
        .from("reports")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", reportId);
    await logAdminAction(locals.adminId, "correct_card", cardId, "card", {
      deezer,
      newCardId: res.cardId,
    });
    return { success: true, corrected: true, message: "Carte corrigée." };
  },

  dismissReport: async ({ request, locals }) => {
    const id = (await request.formData()).get("id");
    if (!id) return { success: false };
    await getAdminClient()
      .from("reports")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", id);
    await logAdminAction(locals.adminId, "dismiss_card_report", id, "report");
    return { success: true, message: "Signalement classé." };
  },

  reviewSignal: async ({ request }) => {
    const id = (await request.formData()).get("id");
    if (!id) return { success: false };
    await getAdminClient()
      .from("card_signals")
      .update({ reviewed: true })
      .eq("id", id);
    return { success: true, message: "Signal marqué comme vu." };
  },

  revokeGrant: async ({ request, locals }) => {
    const id = Number((await request.formData()).get("id"));
    if (!id) return { success: false };
    const sb = getAdminClient();
    const revoked = await revokeGrants(sb, [id]);
    await sb.from("card_signals").update({ reviewed: true }).eq("grant_id", id);
    await logAdminAction(
      locals.adminId,
      "revoke_card",
      String(id),
      "card_grant",
    );
    return {
      success: true,
      message: revoked ? "Carte retirée." : "Carte déjà retirée.",
    };
  },

  revokeUser: async ({ request, locals }) => {
    const userId = (await request.formData()).get("user_id");
    if (!userId) return { success: false };
    const sb = getAdminClient();
    const { data } = await sb
      .from("card_grants")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "granted"]);
    const ids = (data || []).map((g) => g.id);
    const revoked = ids.length ? await revokeGrants(sb, ids) : 0;
    await sb
      .from("card_signals")
      .update({ reviewed: true })
      .eq("user_id", userId);
    await logAdminAction(locals.adminId, "revoke_all_cards", userId, "user", {
      revoked,
    });
    return {
      success: true,
      message: `${revoked} carte${revoked > 1 ? "s" : ""} retirée${revoked > 1 ? "s" : ""}.`,
    };
  },

  audit: async () => {
    const a = await auditCatalog(getAdminClient());
    return {
      audit: {
        tracks: a.tracks,
        cards: a.cards,
        unchecked: a.unchecked,
        orphanCards: a.orphanCards.length,
        removableCards: a.removableCards.length,
        withoutCard: a.withoutCard.slice(0, 200).map((t) => ({
          id: t.id,
          artist: t.artist,
          title: t.title,
        })),
        withoutCardCount: a.withoutCard.length,
      },
    };
  },

  cleanOrphans: async ({ locals }) => {
    const sb = getAdminClient();
    const { removableCards } = await auditCatalog(sb);
    const deleted = await deleteCards(sb, removableCards);
    await logAdminAction(
      locals.adminId,
      "delete_orphan_cards",
      "catalog",
      "card",
      { deleted },
    );
    return {
      success: true,
      message: `${deleted} carte${deleted > 1 ? "s" : ""} inutile${deleted > 1 ? "s" : ""} supprimée${deleted > 1 ? "s" : ""}.`,
    };
  },
};
