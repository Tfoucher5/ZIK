import { json } from "@sveltejs/kit";
import {
  createSalonRoom,
  changeSalonPlaylists,
} from "$lib/server/socket/salon/index.js";
import { salonRooms, getIO } from "$lib/server/state.js";
import { restoreSalon } from "$lib/server/socket/salon/snapshot.js";
import { verifyToken } from "$lib/server/middleware/auth.js";
import { isUuid } from "$lib/shared/utils.js";

// Un salon sans compte ne lit que les playlists publiques (client anonyme,
// RLS). Plafond pour qu'un script ne remplisse pas la mémoire de salons.
const MAX_GUEST_SALONS = 50;
// Chaque playlist coûte une requête en base au chargement du salon
const MAX_PLAYLISTS = 50;

function playlistsError(ids) {
  if (!Array.isArray(ids) || ids.length === 0)
    return "Choisis au moins une playlist.";
  if (ids.length > MAX_PLAYLISTS)
    return `${MAX_PLAYLISTS} playlists maximum par soirée`;
  return ids.every(isUuid) ? null : "Une des playlists choisies n'existe pas.";
}

export async function POST({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  let user = null;
  if (token) {
    user = await verifyToken(token);
    if (!user)
      return json(
        { error: "Ta session a expiré. Reconnecte-toi." },
        { status: 401 },
      );
  } else {
    const guestSalons = Object.values(salonRooms).filter(
      (s) => !s.hostUserId,
    ).length;
    if (guestSalons >= MAX_GUEST_SALONS)
      return json(
        {
          error:
            "Beaucoup de soirées sont ouvertes sans compte en ce moment. Connecte-toi pour créer la tienne.",
        },
        { status: 429 },
      );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Demande invalide. Recharge la page." },
      { status: 400 },
    );
  }

  const { playlistIds, settings, origin } = body ?? {};
  const playlistsErr = playlistsError(playlistIds);
  if (playlistsErr) return json({ error: playlistsErr }, { status: 400 });

  try {
    const { code, key } = await createSalonRoom({
      playlistIds,
      settings: settings || {},
      token,
      hostUserId: user?.id ?? null,
      // Hôte venu du bouton de fin de partie d'un invité : mesure la boucle virale
      origin: origin === "invite" ? "invite" : null,
    });
    return json({ code, key });
  } catch (e) {
    return json({ error: e.message }, { status: 400 });
  }
}

// Recherches ratées ou en cours par HTTP, par adresse (même plafond que par
// socket) : des codes au hasard ne martèlent pas la base. L'adresse se
// falsifie, d'où aussi un plafond global large. Exportée pour les tests.
export const _missesByIp = new Map();
const allMisses = [];
const MAX_IP_MISSES = 5;
const MAX_ALL_MISSES = 200;
const MISS_WINDOW_MS = 60 * 1000;

function prune(list, now) {
  while (list.length && now - list[0] > MISS_WINDOW_MS) list.shift();
  return list;
}

function unmark(list, now) {
  const i = list.lastIndexOf(now);
  if (i >= 0) list.splice(i, 1);
}

async function lookUp(code, ip) {
  const now = Date.now();
  prune(allMisses, now);
  // Au plus MAX_ALL_MISSES adresses dans la fenêtre : table bornée
  if (_missesByIp.size > MAX_ALL_MISSES)
    for (const [addr, l] of _missesByIp)
      if (!prune(l, now).length) _missesByIp.delete(addr);
  const mine = prune(_missesByIp.get(ip) ?? [], now);
  if (allMisses.length >= MAX_ALL_MISSES || mine.length >= MAX_IP_MISSES)
    return "throttled";
  // Compté avant l'attente : une rafale parallèle ne passe pas sous le plafond
  allMisses.push(now);
  mine.push(now);
  _missesByIp.set(ip, mine);
  // Plafonds tenus ici : restoreSalon reçoit un compteur neuf
  await restoreSalon(code, getIO(), {});
  if (!salonRooms[code]) return;
  unmark(allMisses, now);
  unmark(mine, now);
  if (!mine.length) _missesByIp.delete(ip);
}

export async function GET({ request, url }) {
  const code = url.searchParams.get("code")?.toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code ?? ""))
    return json(
      { error: "Le code de la soirée fait 6 caractères." },
      { status: 400 },
    );
  // Juste après un redémarrage, le salon n'est encore que dans son instantané
  // Railway pose X-Real-IP ; X-Forwarded-For en repli
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  if (!salonRooms[code] && (await lookUp(code, ip)) === "throttled")
    return json({ error: "Réessayez dans un instant." }, { status: 503 });
  const salon = salonRooms[code];
  if (!salon)
    return json({ error: "Cette soirée n'existe plus." }, { status: 404 });
  return json({
    exists: true,
    phase: salon.game.phase,
    answerMode: salon.settings.answerMode,
  });
}

// Hôte connecté (son compte) ou régie (la clé du salon, sans compte)
export async function PATCH({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  const user = token ? await verifyToken(token) : null;
  if (token && !user)
    return json(
      { error: "Votre session a expiré. Reconnectez-vous." },
      { status: 401 },
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Demande invalide. Rechargez la page." },
      { status: 400 },
    );
  }

  const { code, playlistIds, key } = body ?? {};
  if (!user && !key)
    return json(
      { error: "Rouvrez la régie depuis l'écran TV de la soirée." },
      { status: 401 },
    );
  if (!code)
    return json({ error: "Le code de la soirée manque." }, { status: 400 });
  const playlistsErr = playlistsError(playlistIds);
  if (playlistsErr) return json({ error: playlistsErr }, { status: 400 });

  try {
    const { trackCount } = await changeSalonPlaylists({
      code: String(code).toUpperCase(),
      playlistIds,
      token,
      userId: user?.id,
      key,
    });
    return json({ trackCount });
  } catch (e) {
    return json({ error: e.message }, { status: 400 });
  }
}
