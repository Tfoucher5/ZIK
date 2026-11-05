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
    return "Au moins une playlist requise";
  if (ids.length > MAX_PLAYLISTS)
    return `${MAX_PLAYLISTS} playlists maximum par soirée`;
  return ids.every(isUuid) ? null : "Playlist invalide";
}

export async function POST({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  let user = null;
  if (token) {
    user = await verifyToken(token);
    if (!user) return json({ error: "Session invalide" }, { status: 401 });
  } else {
    const guestSalons = Object.values(salonRooms).filter(
      (s) => !s.hostUserId,
    ).length;
    if (guestSalons >= MAX_GUEST_SALONS)
      return json(
        { error: "Trop de salons ouverts, connecte-toi pour en créer un." },
        { status: 429 },
      );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corps invalide" }, { status: 400 });
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

// Recherches ratées par HTTP, toutes requêtes confondues (même plafond que par
// socket) : des codes au hasard ne martèlent pas la base
const httpLookups = {};

export async function GET({ url }) {
  const code = url.searchParams.get("code")?.toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code ?? ""))
    return json({ error: "Code requis" }, { status: 400 });
  // Juste après un redémarrage, le salon n'est encore que dans son instantané
  if (
    !salonRooms[code] &&
    (await restoreSalon(code, getIO(), httpLookups)) === "throttled"
  )
    return json({ error: "Réessayez dans un instant" }, { status: 503 });
  const salon = salonRooms[code];
  if (!salon) return json({ error: "Salon introuvable" }, { status: 404 });
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
    return json({ error: "Session invalide" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corps invalide" }, { status: 400 });
  }

  const { code, playlistIds, key } = body ?? {};
  if (!user && !key) return json({ error: "Non authentifié" }, { status: 401 });
  if (!code) return json({ error: "Code requis" }, { status: 400 });
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
