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

// Le pseudo est la clé de la place, score et compte compris : on ne la reprend
// qu'avec une preuve. L'id du dernier socket couvre le client qui revient, que
// le serveur ait vu la coupure ou non. Un invité sans preuve ne reprend qu'une
// place d'invité en délai de grâce (page rechargée).
function canTakeSeat(player, { socketId, accountId, prevSid }) {
  const sameClient =
    player._lastSocket === socketId ||
    (prevSid && player._lastSocket === prevSid);
  if (sameClient && (!accountId || !player.userId)) return true;
  if (accountId) return player.userId === accountId;
  return !player.userId && !!player._dcTimer;
}

// Deux joueurs sous le même pseudo : le second devient « Alice 2 »
// shortcut: un compte renommé ainsi garde un lien de profil faux en fin de partie, à revoir si ça gêne
export function seatName(room, wanted, who) {
  for (let n = 1; ; n++) {
    const name = n === 1 ? wanted : `${wanted} ${n}`;
    const player = room.players[name];
    if (!player || canTakeSeat(player, who)) return name;
  }
}
