import { getAdminClient } from "$lib/server/config.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import {
  auditCatalog,
  correctCard,
  deleteCards,
  revokeGrants,
} from "$lib/server/services/cards/admin.js";
import { cardsAdminBoard } from "$lib/server/services/cards/adminBoard.js";
import { RARITY_ORDER } from "$lib/components/card/rarity.js";
import { GRANT_STATUSES } from "$lib/shared/admin/cartes.js";

const STATUSES = Object.keys(GRANT_STATUSES);

export function load({ url }) {
  const param = (k) => url.searchParams.get(k);
  return cardsAdminBoard({
    who: param("who")?.trim() || "",
    user: param("user") || "",
    status: STATUSES.includes(param("status")) ? param("status") : "",
    q: param("q") || "",
    rarity: RARITY_ORDER.includes(param("rarity")) ? param("rarity") : "",
    cardNumber: Number(param("card")) || 0,
  });
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
