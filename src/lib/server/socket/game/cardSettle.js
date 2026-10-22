import { getAdminClient } from "../../config.js";
import { createNotification } from "../../services/notify/notifications.js";
import { notifySetsNearlyDone } from "../../services/cards/hunt.js";
import { bumpWeeklyChallenge } from "../../services/weeklyChallenge.js";

// Fin de partie (ou départ d'un joueur) : les cartes gagnées deviennent
// définitives ou sont perdues, et les amis apprennent les Mythiques.

let _db = null;
const db = () => (_db ??= getAdminClient());

/**
 * Rend définitives (keep) ou perdues les cartes provisoires d'un joueur.
 * Appelé en fin de partie et au départ d'un joueur.
 */
export async function settleCards({ game, name, userId, keep, io, socketId }) {
  await Promise.allSettled(game.grantJobs || []);
  const ids = game.pendingGrants?.[name];
  if (!ids?.length || !userId) return;
  delete game.pendingGrants[name];

  const { data, error } = await db().rpc("card_settle", {
    p_user_id: userId,
    p_grant_ids: ids,
    p_keep: keep,
  });
  if (error) {
    console.error("[cards] attribution :", error.message);
    return;
  }
  if (!keep) return;
  if (io && socketId) io.to(socketId).emit("cards_granted", data);
  const cards = data?.cards ?? [];
  bumpWeeklyChallenge("cards_won", userId, cards.length);
  notifyMythics(
    userId,
    cards.map((c) => c.card_id),
  );
  notifySetsNearlyDone(
    userId,
    cards.filter((c) => c.is_new).map((c) => c.card_id),
  ).catch((e) => console.error("[cards] set presque fini :", e.message));
}

// Mythique désormais acquise : ses amis sont prévenus
async function notifyMythics(userId, cardIds) {
  if (!cardIds.length) return;
  const { data: mythics } = await db()
    .from("cards")
    .select("number, title, artist")
    .in("id", cardIds)
    .eq("rarity", "mythic");
  if (!mythics?.length) return;
  const { data: links } = await db()
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const friends = (links || []).map((l) =>
    l.requester_id === userId ? l.addressee_id : l.requester_id,
  );
  for (const card of mythics)
    for (const friend of friends)
      await createNotification({
        userId: friend,
        type: "card_mythic",
        actorId: userId,
        payload: {
          number: card.number,
          title: card.title,
          artist: card.artist,
        },
      });
}
