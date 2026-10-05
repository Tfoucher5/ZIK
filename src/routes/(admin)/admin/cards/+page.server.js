import { getAdminClient } from "$lib/server/config.js";
import { requireAdmin, logAdminAction } from "$lib/server/middleware/auth.js";
import {
  auditCatalog,
  deleteCards,
  revokeGrants,
} from "$lib/server/services/cardsAdmin.js";
import { RARITY_ORDER } from "$lib/components/card/rarity.js";

const STATUSES = ["pending", "granted", "lost", "revoked"];

export async function load({ url }) {
  const sb = getAdminClient();
  const user = url.searchParams.get("user") || "";

  const head = (table) =>
    sb.from(table).select("*", { count: "exact", head: true });

  let grantsQuery = sb
    .from("card_grants")
    .select(
      "id, user_id, card_id, room_id, round, mode, answer_ms, active_accounts, delayed, status, created_at, cards(number, title, artist, rarity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (user) grantsQuery = grantsQuery.eq("user_id", user);

  const [byStatus, byRarity, owned, signalsRes, grantsRes] = await Promise.all([
    Promise.all(STATUSES.map((s) => head("card_grants").eq("status", s))),
    Promise.all(RARITY_ORDER.map((r) => head("cards").eq("rarity", r))),
    head("user_cards"),
    sb
      .from("card_signals")
      .select(
        "id, user_id, grant_id, reason, details, created_at, card_grants(card_id, status, room_id, cards(number, title, artist, rarity))",
      )
      .eq("reviewed", false)
      .order("created_at", { ascending: false })
      .limit(100),
    grantsQuery,
  ]);

  const signals = signalsRes.data || [];
  const grants = grantsRes.data || [];
  const userIds = [
    ...new Set([...signals, ...grants].map((r) => r.user_id).filter(Boolean)),
  ];
  const { data: profiles } = userIds.length
    ? await sb.from("profiles").select("id, username").in("id", userIds)
    : { data: [] };
  const names = Object.fromEntries(
    (profiles || []).map((p) => [p.id, p.username]),
  );

  return {
    stats: {
      grants: Object.fromEntries(
        STATUSES.map((s, i) => [s, byStatus[i].count ?? 0]),
      ),
      rarity: Object.fromEntries(
        RARITY_ORDER.map((r, i) => [r, byRarity[i].count ?? 0]),
      ),
      owned: owned.count ?? 0,
    },
    signals: signals.map((s) => ({ ...s, username: names[s.user_id] })),
    grants: grants.map((g) => ({ ...g, username: names[g.user_id] })),
    filters: { user, username: names[user] || "" },
  };
}

export const actions = {
  reviewSignal: async ({ request }) => {
    const { formData } = await requireAdmin(request);
    const id = formData.get("id");
    if (!id) return { success: false };
    await getAdminClient()
      .from("card_signals")
      .update({ reviewed: true })
      .eq("id", id);
    return { success: true };
  },

  revokeGrant: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const id = Number(formData.get("id"));
    if (!id) return { success: false };
    const sb = getAdminClient();
    const revoked = await revokeGrants(sb, [id]);
    await sb.from("card_signals").update({ reviewed: true }).eq("grant_id", id);
    await logAdminAction(adminUser.id, "revoke_card", String(id), "card_grant");
    return { success: true, revoked };
  },

  revokeUser: async ({ request }) => {
    const { adminUser, formData } = await requireAdmin(request);
    const userId = formData.get("user_id");
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
    await logAdminAction(adminUser.id, "revoke_all_cards", userId, "user", {
      revoked,
    });
    return { success: true, revoked };
  },

  audit: async ({ request }) => {
    await requireAdmin(request);
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

  cleanOrphans: async ({ request }) => {
    const { adminUser } = await requireAdmin(request);
    const sb = getAdminClient();
    const { removableCards } = await auditCatalog(sb);
    const deleted = await deleteCards(sb, removableCards);
    await logAdminAction(
      adminUser.id,
      "delete_orphan_cards",
      "catalog",
      "card",
      {
        deleted,
      },
    );
    return { success: true, deleted };
  },
};
