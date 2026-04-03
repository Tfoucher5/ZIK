import { json } from "@sveltejs/kit";
import { createSalonRoom } from "$lib/server/socket/salon.js";
import { salonRooms } from "$lib/server/state.js";
import { verifyToken } from "$lib/server/middleware/auth.js";

export async function POST({ request }) {
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

  const { playlistIds, settings } = body;
  if (!Array.isArray(playlistIds) || playlistIds.length === 0)
    return json({ error: "Au moins une playlist requise" }, { status: 400 });

  try {
    const code = await createSalonRoom({
      playlistIds,
      settings: settings || {},
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
