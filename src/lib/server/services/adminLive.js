import {
  adminGetRoomsSnapshot,
  adminGetChatHistory,
} from "$lib/server/socket/game/index.js";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Flux SSE qui pousse buildPayload() toutes les 2 s jusqu'à la déconnexion.
export function sseResponse(request, buildPayload) {
  const stream = new ReadableStream({
    start(controller) {
      function push() {
        controller.enqueue(`data: ${JSON.stringify(buildPayload())}\n\n`);
      }

      push();
      const interval = setInterval(push, 2000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export function liveSnapshot() {
  const roomGames = Object.entries(globalThis.__zik_roomGames ?? {}).map(
    ([roomId, g]) => ({
      roomId,
      players: Object.keys(g.socketToName ?? {}).length,
      round: g.currentRound ?? 0,
      maxRounds: g.maxRounds ?? 0,
      state: g.state ?? "unknown",
    }),
  );

  const salonRooms = Object.entries(globalThis.__zik_salonRooms ?? {}).map(
    ([code, s]) => ({
      code,
      host: s.hostName ?? "?",
      players: (s.players ?? []).length,
      state: s.game?.state ?? s.state ?? "lobby",
    }),
  );

  const totalConnected =
    roomGames.reduce((sum, r) => sum + r.players, 0) +
    salonRooms.reduce((sum, s) => sum + s.players, 0);

  return { roomGames, salonRooms, totalConnected, ts: Date.now() };
}

export function roomsLiveSnapshot() {
  const rooms = adminGetRoomsSnapshot().map((r) => ({
    ...r,
    chatMessages: adminGetChatHistory(r.roomId),
  }));
  return { rooms, ts: Date.now() };
}
