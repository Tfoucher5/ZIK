import { customRooms, roomGames } from "$lib/server/state.js";

const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  } while (customRooms[code]);
  return code;
}

// Room éphémère en mémoire : supprimée au bout de 4 h.
export function createCustomRoom({
  name,
  emoji,
  tracks,
  maxRounds = 10,
  roundDuration = 30,
  breakDuration = 7,
}) {
  const code = genRoomCode();
  customRooms[code] = {
    id: code,
    name: String(name).trim().slice(0, 60),
    emoji: emoji || "🎵",
    tracks,
    maxRounds: Math.min(Math.max(parseInt(maxRounds) || 10, 3), tracks.length),
    roundDuration: Math.min(Math.max(parseInt(roundDuration) || 30, 10), 60),
    breakDuration: Math.min(Math.max(parseInt(breakDuration) || 7, 3), 15),
  };

  setTimeout(() => {
    delete customRooms[code];
    delete roomGames[code];
  }, ROOM_TTL_MS);

  return code;
}
