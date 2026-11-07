import { getAdminClient } from "../../config.js";
import { verifyToken } from "../../middleware/auth.js";

// Qui est qui dans une room : ni le userId ni le pseudo envoyés ne font foi.

// Authentification en panne : le joueur entre en invité plutôt que d'attendre.
// Deux attentes au plus à l'arrivée : la somme reste sous le délai de grâce (5 s)
const AUTH_TIMEOUT_MS = 2000;
const bounded = (promise) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ]);

// Le compte du joueur : seul un jeton valide le prouve, jamais le userId envoyé
export async function verifiedAccount({ userId, isGuest, token }) {
  if (isGuest !== false || !userId || !token) return null;
  const user = await bounded(verifyToken(token).catch(() => null));
  return user?.id === userId ? user.id : null;
}

// Un compte joue sous le pseudo de son profil, pas sous celui qu'il annonce
export async function accountName(accountId, fallback) {
  const res = await bounded(
    getAdminClient()
      .from("profiles")
      .select("username")
      .eq("id", accountId)
      .maybeSingle(),
  );
  return res?.data?.username || fallback;
}

// Sa propre place, quel que soit le pseudo envoyé : celle de son compte, sinon
// celle de ce client. L'id du dernier socket couvre le client qui revient, que
// le serveur ait vu la coupure ou non.
function ownSeat(room, { socketId, accountId, prevSid }) {
  const players = Object.values(room.players);
  const sameClient = (p) =>
    p._lastSocket === socketId || (prevSid && p._lastSocket === prevSid);
  return (
    (accountId && players.find((p) => p.userId === accountId)) ||
    players.find((p) => sameClient(p) && (!accountId || !p.userId))
  );
}

// Le pseudo est la clé de la place, score et compte compris : sans preuve, on ne
// reprend qu'une place d'invité en délai de grâce (page rechargée). Sinon, deux
// joueurs sous le même pseudo : le second devient « Alice 2 ».
// shortcut: un compte renommé ainsi garde ce nom dans ses résultats et un lien de profil faux, à revoir si ça gêne
export function seatName(room, wanted, who) {
  const own = ownSeat(room, who);
  if (own) return own.name;
  for (let n = 1; ; n++) {
    const name = n === 1 ? wanted : `${wanted} ${n}`;
    const player = room.players[name];
    if (!player) return name;
    if (!who.accountId && !player.userId && player._dcTimer) return name;
  }
}
