import { createHash } from "node:crypto";
import { getAdminClient } from "../../config.js";
import { verifyToken } from "../../middleware/auth.js";
import { dbRooms } from "../../state.js";
import { pickCardWinner, MIN_ROUNDS, MIN_TRACKS } from "./cards.js";
import { RARITIES } from "../../../components/card/rarity.js";
import { addChatMessage } from "./chat.js";
import { createNotification } from "../../services/notifications.js";
import { notifySetsNearlyDone } from "../../services/cardHunt.js";
import { bumpWeeklyChallenge } from "../../services/weeklyChallenge.js";

// Branchement des cartes dans le jeu (spec docs/specs/cartes.md, section 6.2).
// core.js appelle ces fonctions aux bons moments ; toute la logique carte vit ici.

let _db = null;
const db = () => (_db ??= getAdminClient());

function clientIp(socket) {
  const fwd = socket.handshake?.headers?.["x-forwarded-for"];
  return (fwd ? String(fwd).split(",")[0] : socket.handshake?.address) || "?";
}

const hashIp = (ip) =>
  createHash("sha256").update(`zik-cards:${ip}`).digest("hex").slice(0, 24);

/**
 * Vérifie l'identité du joueur (garde-fou G1) : le userId envoyé par le client
 * ne compte que s'il correspond au jeton de session. Charge aussi ses cartes
 * déjà possédées : une carte qu'il a déjà passe au joueur suivant.
 */
export async function identifyPlayer(player, { token, userId }, socket) {
  player.ipHash = hashIp(clientIp(socket));
  const user = token ? await verifyToken(token).catch(() => null) : null;
  player.verified = !!user && !!userId && user.id === userId;
  player.createdAt = user?.created_at ?? null;
  if (!player.verified || player.ownedCards) return;

  const owned = new Set();
  for (let from = 0; ; from += 1000) {
    const { data } = await db()
      .from("user_cards")
      .select("card_id")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (!data?.length) break;
    data.forEach((r) => owned.add(r.card_id));
    if (data.length < 1000) break;
  }
  player.ownedCards = owned;
}

/** Remise à zéro au lancement d'une partie. */
export function resetCards(room) {
  room.game.fullFinders = [];
  room.game.pendingGrants = {};
  room.game.grantJobs = [];
  for (const p of Object.values(room.players)) {
    // Cartes gagnées à la partie précédente : elles sont dans sa collection
    for (const e of p.cardsInPlay || []) p.ownedCards?.add(e.card.id);
    p.roundsPresent = 0;
    p.cardsInPlay = [];
  }
}

/** Conditions d'exploit telles qu'affichées au joueur qui les a ratées. */
function missedConditions(card, refusal) {
  const exploit = RARITIES[card.rarity].exploit;
  const out = [];
  if (refusal.reason === "speed")
    out.push({
      label: `Trouvée en moins de ${refusal.limitMs / 1000} s`,
      value: `${(refusal.ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`,
      ok: false,
    });
  if (refusal.reason === "players")
    out.push({
      label: `${exploit.players} joueurs connectés`,
      value: `${refusal.active} / ${refusal.required}`,
      ok: false,
    });
  if (refusal.reason === "own_playlist")
    out.push({
      label: exploit.notOwnPlaylist
        ? "Pas sur sa propre playlist"
        : "2 autres joueurs sur ta playlist",
      value: exploit.notOwnPlaylist ? "ta playlist" : `${refusal.others} / 2`,
      ok: false,
    });
  return out;
}

/**
 * Fin de manche : présence, taux de réussite, désignation du gagnant de la
 * carte, carte provisoire en base. Retourne le bloc « carte » de round_end
 * pour chaque joueur concerné : { [pseudo]: payload }.
 */
export function onRoundEnd(room, track, { skipped = false } = {}) {
  const game = room.game;
  const round = game.currentRound;
  const mode = room.game_mode === "qcm" ? "qcm" : "classic";
  const present = Object.values(room.players).filter((p) => !p._dcTimer);
  present.forEach((p) => (p.roundsPresent = (p.roundsPresent || 0) + 1));

  if (!skipped && mode === "classic" && track.id)
    db()
      .rpc("record_round_stats", {
        p_track_id: track.id,
        p_exposed: present.length,
        p_found: game.totalFullFound,
      })
      .then(
        () => {},
        () => {},
      );

  const card = track.card;
  if (!card) return {};

  const players = {};
  for (const [name, p] of Object.entries(room.players))
    players[name] = {
      userId: p.userId,
      verified: !!p.verified,
      createdAt: p.createdAt,
      ip: p.ipHash,
      lastAnswerRound: p.lastAnswerRound ?? null,
      disconnected: !!p._dcTimer,
      guesses: p.guessesThisRound || 0,
      owns:
        !!p.ownedCards?.has(card.id) ||
        !!p.cardsInPlay?.some((e) => e.card.id === card.id),
    };

  const dbRoom = dbRooms[room.roomId];
  const ownerId = dbRoom?.is_official ? null : dbRoom?.owner_id;
  const res = pickCardWinner({
    card,
    finders: game.fullFinders || [],
    players,
    round,
    maxRounds: game.plannedRounds,
    playlistSize: game.fullPlaylist?.length ?? 0,
    mode,
    skipped,
    ownerIds: new Set(ownerId ? [ownerId] : []),
    trackAddedAt: track.addedAt,
  });

  const payloads = {};
  const winnerMs = res.winner
    ? game.fullFinders.find((f) => f.name === res.winner).ms
    : 0;

  if (res.winner) {
    const p = room.players[res.winner];
    p.cardsInPlay = [...(p.cardsInPlay || []), { card, round }];
    if (card.rarity === "mythic") announceMythic(room, res.winner, card);
    for (const name of Object.keys(room.players))
      payloads[name] = {
        card,
        mode: "taken",
        winner: { name: res.winner, ms: winnerMs },
      };
    payloads[res.winner] = {
      card,
      mode: "won",
      delayed: res.delayed,
      winner: { name: res.winner, ms: winnerMs },
      roundsPresent: p.roundsPresent,
    };

    const active = new Set(
      Object.values(players)
        .filter((x) => x.verified && !x.disconnected)
        .map((x) => x.ip),
    ).size;
    const job = db()
      .from("card_grants")
      .insert({
        user_id: p.userId,
        card_id: card.id,
        game_id: game.dbGameId,
        room_id: room.roomId,
        round,
        mode,
        answer_ms: Math.round(winnerMs),
        active_accounts: active,
        ip_hash: p.ipHash || "?",
        delayed: res.delayed,
      })
      .select("id")
      .single()
      .then(({ data }) => {
        if (!data) return;
        (game.pendingGrants[res.winner] ??= []).push(data.id);
        const signals = res.signals.filter((s) => s.name === res.winner);
        if (signals.length)
          return db()
            .from("card_signals")
            .insert(
              signals.map(({ reason, ...details }) => ({
                user_id: p.userId,
                grant_id: data.id,
                reason,
                details,
              })),
            );
      })
      .catch((e) => console.error("[cards] carte provisoire :", e.message));
    game.grantJobs.push(job);
  }

  // Raté de peu : seulement pour le premier joueur connecté refusé, et
  // seulement s'il n'y a pas de gagnant
  const first = res.refusals[0];
  if (!res.winner && first)
    payloads[first.name] = {
      card,
      mode: "missed",
      conditions: missedConditions(card, first),
    };
  if (res.guest) payloads[res.guest] = { card, mode: "guest" };
  // Déjà dans sa collection : il l'a trouvée, elle passe au suivant
  for (const name of res.owned)
    payloads[name] = {
      card,
      mode: "owned",
      winner: res.winner ? { name: res.winner, ms: winnerMs } : null,
    };

  return payloads;
}

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

// Une Mythique tombe : toute la room le voit dans le chat
function announceMythic(room, name, card) {
  const io = globalThis.__zik_io;
  if (!io) return;
  const message = {
    name: "ZIK",
    system: true,
    text: `🌟 ${name} décroche une carte Mythique : ${card.title} - ${card.artist} !`,
    ts: Date.now(),
  };
  addChatMessage(room.roomId, message);
  io.to(`room:${room.roomId}`).emit("chat_message", message);
}

/** Raison affichée aux joueurs quand la partie ne peut donner aucune carte. */
export function cardsOffReason(game) {
  if (!game.fullPlaylist?.some((t) => t.id))
    return "Pas de cartes dans une room éphémère";
  if ((game.fullPlaylist?.length ?? 0) < MIN_TRACKS)
    return `Pas de cartes ici : il faut une playlist d'au moins ${MIN_TRACKS} titres`;
  if ((game.plannedRounds ?? 0) < MIN_ROUNDS)
    return `Pas de cartes ici : il faut une partie d'au moins ${MIN_ROUNDS} manches`;
  return null;
}

/** Moitié des manches de la partie : seuil où les cartes deviennent acquises. */
export const secureAt = (maxRounds) => Math.ceil(maxRounds / 2);
