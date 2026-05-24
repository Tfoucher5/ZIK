// Single source of truth for all shared runtime state.
// All objects are anchored on globalThis so they survive Vite HMR module reloads in dev.

globalThis.__zik_playlistCache = globalThis.__zik_playlistCache ?? {};
globalThis.__zik_customRooms = globalThis.__zik_customRooms ?? {};
globalThis.__zik_dbRooms = globalThis.__zik_dbRooms ?? {};
globalThis.__zik_roomGames = globalThis.__zik_roomGames ?? {};
globalThis.__zik_salonRooms = globalThis.__zik_salonRooms ?? {};
globalThis.__zik_chatHistories = globalThis.__zik_chatHistories ?? {};
globalThis.__zik_errorLog = globalThis.__zik_errorLog ?? [];

export const playlistCache = globalThis.__zik_playlistCache; // roomId -> Track[]
export const customRooms = globalThis.__zik_customRooms; // code   -> { id, name, emoji, tracks, ... }
export const dbRooms = globalThis.__zik_dbRooms; // code   -> { name, emoji, max_rounds, ... }
export const roomGames = globalThis.__zik_roomGames; // roomId -> { roomId, players, socketToName, ... }
export const salonRooms = globalThis.__zik_salonRooms; // code   -> { code, hostSocketId, settings, players, game }
export const chatHistories = globalThis.__zik_chatHistories; // roomId -> { messages: [], clearTimer: null }
export const errorLog = globalThis.__zik_errorLog; // { ts, level, msg }[]

const MAX_ERROR_LOG = 300;

export function pushError(level, ...args) {
  const msg = args
    .map((a) => (a instanceof Error ? a.stack || a.message : String(a)))
    .join(" ");
  globalThis.__zik_errorLog.unshift({ ts: Date.now(), level, msg });
  if (globalThis.__zik_errorLog.length > MAX_ERROR_LOG)
    globalThis.__zik_errorLog.length = MAX_ERROR_LOG;
}
