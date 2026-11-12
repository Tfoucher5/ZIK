import { salonRooms } from "../../../state.js";

// Faux serveur Socket.io partagé par les tests de handlers du salon
export const CODE = "TEST01";
export const CLE = "cle-admin";

/**
 * `io` factice. Le harnais de game/core.test.js avale les émissions
 * (`to: () => ({ emit: () => {} })`) ; ici il faut les capturer, et exposer
 * `sockets.adapter.rooms` puisque le compte d'écrans en provient.
 */
export function makeIo() {
  const rooms = new Map();
  const emissions = [];
  let onConnection = null;
  const io = {
    on: (evt, fn) => {
      if (evt === "connection") onConnection = fn;
    },
    to: (cible) => ({
      emit: (event, payload) =>
        emissions.push({
          cibles: Array.isArray(cible) ? cible : [cible],
          event,
          payload,
        }),
    }),
    sockets: { adapter: { rooms }, sockets: new Map() },
  };
  return {
    io,
    rooms,
    emissions,
    connecte: (socket) => onConnection(socket),
  };
}

export function makeSocket(id, rooms) {
  const handlers = {};
  return {
    id,
    handlers,
    propres: [],
    on(evt, fn) {
      handlers[evt] = fn;
    },
    emit() {},
    join(r) {
      if (!rooms.has(r)) rooms.set(r, new Set());
      rooms.get(r).add(id);
      this.propres.push(r);
    },
    leave(r) {
      rooms.get(r)?.delete(id);
      if (rooms.get(r)?.size === 0) rooms.delete(r);
    },
    deconnecte() {
      for (const r of this.propres) this.leave(r);
      handlers.disconnect?.();
    },
  };
}

export function salonDeTest() {
  salonRooms[CODE] = {
    code: CODE,
    adminKey: CLE,
    pro: false,
    hostUserId: null,
    origin: null,
    _hostDcTimer: null,
    _cleanupTimer: null,
    settings: {
      maxRounds: 10,
      roundDuration: 30,
      playlistIds: [],
      countStart: false,
    },
    players: {},
    banned: new Set(),
    game: {
      phase: "lobby",
      currentRound: 0,
      sessionPlaylist: [],
      fullPlaylist: [],
      currentTrack: null,
      choices: null,
      correctChoiceIndex: null,
      interval: null,
      breakTimer: null,
      musicReadyTimer: null,
      timerValue: 0,
      timerActive: false,
      startTime: 0,
      firstFinder: null,
      history: [],
      played: [],
      paused: false,
    },
  };
}
