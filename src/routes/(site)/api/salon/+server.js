import { json } from "@sveltejs/kit";
import {
  createSalonRoom,
  changeSalonPlaylists,
} from "$lib/server/socket/salon.js";
import { salonRooms } from "$lib/server/state.js";
import { verifyToken } from "$lib/server/middleware/auth.js";

// Un salon sans compte ne lit que les playlists publiques (client anonyme,
// RLS). Plafond pour qu'un script ne remplisse pas la mémoire de salons.
const MAX_GUEST_SALONS = 50;

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

  const { playlistIds, settings } = body;
  if (!Array.isArray(playlistIds) || playlistIds.length === 0)
    return json({ error: "Au moins une playlist requise" }, { status: 400 });

  try {
    const code = await createSalonRoom({
      playlistIds,
      settings: settings || {},
      token,
      hostUserId: user?.id ?? null,
    });
    return json({ code });
  } catch (e) {
    return json({ error: e.message }, { status: 400 });
  }
}

export async function GET({ url }) {
  const code = url.searchParams.get("code")?.toUpperCase();
  if (!code) return json({ error: "Code requis" }, { status: 400 });
  const salon = salonRooms[code];
  if (!salon) return json({ error: "Salon introuvable" }, { status: 404 });
  return json({
    exists: true,
    phase: salon.game.phase,
    answerMode: salon.settings.answerMode,
  });
}

export async function PATCH({ request }) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) return json({ error: "Non authentifié" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return json({ error: "Session invalide" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corps invalide" }, { status: 400 });
  }

  const { code, playlistIds } = body;
  if (!code) return json({ error: "Code requis" }, { status: 400 });
  if (!Array.isArray(playlistIds) || playlistIds.length === 0)
    return json({ error: "Au moins une playlist requise" }, { status: 400 });

  try {
    const { trackCount } = await changeSalonPlaylists({
      code: String(code).toUpperCase(),
      playlistIds,
      token,
      userId: user.id,
    });
    return json({ trackCount });
  } catch (e) {
    return json({ error: e.message }, { status: 400 });
  }
}
