import { json } from "@sveltejs/kit";
import { supabase } from "$lib/server/config.js";
import { requireAuth, checkRateLimit } from "$lib/server/middleware/auth.js";
import { customRooms, dbRooms } from "$lib/server/state.js";
import { createNotification } from "$lib/server/services/notifications.js";

async function findRoom(code) {
  const mem = customRooms[code] || dbRooms[code];
  if (mem)
    return { name: mem.name || code, gameMode: mem.game_mode || "classic" };
  const { data } = await supabase
    .from("rooms")
    .select("name, game_mode")
    .eq("code", code)
    .maybeSingle();
  if (data) return { name: data.name, gameMode: data.game_mode || "classic" };
  return null;
}

export async function POST({ request, getClientAddress }) {
  const { user } = await requireAuth(request);
  checkRateLimit(getClientAddress(), 20, 60_000);

  const { targetId, roomId } = await request.json();
  if (!targetId || !roomId)
    return json({ error: "Requête invalide" }, { status: 400 });

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();
  if (!friendship)
    return json(
      { error: "Vous devez être amis pour inviter ce joueur" },
      { status: 403 },
    );

  const room = await findRoom(roomId);
  if (!room) return json({ error: "Room introuvable" }, { status: 404 });

  await createNotification({
    userId: targetId,
    type: "room_invite",
    actorId: user.id,
    payload: { roomId, roomName: room.name, gameMode: room.gameMode },
  });

  return json({ ok: true });
}
