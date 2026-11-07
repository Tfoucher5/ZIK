import { vi } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { roomGames, dbRooms, playlistCache } from "../../../state.js";
import { ytdlAudioCache } from "../../../audio/ytdlCache.js";
import { register } from "../index.js";
import { cleanupRoom } from "../rooms.js";
import { pause, vraiClient } from "../../__tests__/vraiClient.js";

export { pause };

// Vrai serveur Socket.io et vrais clients pour jouer une partie de bout en bout
export const extrait = (id) => `https://cdnt-preview.dzcdn.net/${id}.mp3`;

export function partie(db) {
  let http, server, port;
  let numero = 0;
  const clients = [];
  const h = {
    code: null,

    async start() {
      http = createServer();
      server = new Server(http);
      register(server);
      await new Promise((r) => http.listen(0, r));
      port = http.address().port;
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("réseau interdit en test");
        }),
      );
    },

    async stop() {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      await server.close();
    },

    reset() {
      ytdlAudioCache.clear();
      db.inserts = {};
      db.rpc = [];
      db.ecrituresAnon = [];
      db.preview.mockReset().mockImplementation(async (id) => extrait(id));
    },

    async nettoyer() {
      for (const c of clients.splice(0)) c.socket.disconnect();
      await pause(20);
      for (const id of Object.keys(roomGames)) {
        for (const p of Object.values(roomGames[id].players))
          clearTimeout(p._dcTimer);
        cleanupRoom(id);
      }
      delete dbRooms[h.code];
      delete playlistCache[h.code];
    },

    client() {
      const c = vraiClient(port);
      clients.push(c);
      return c;
    },

    ouvrir(reglages = {}) {
      h.code = `R${++numero}`;
      db.room = {
        id: h.code,
        code: h.code,
        name: "Test",
        max_rounds: 1,
        round_duration: 30,
        break_duration: 0.05,
        auto_start: false,
        owner_id: "u-alice",
        is_public: false,
        game_mode: "classic",
        ...reglages,
      };
    },

    async joueur(username, userId = `u-${username}`) {
      const c = h.client();
      c.socket.emit("join_room", {
        roomId: h.code,
        username,
        userId,
        isGuest: !userId,
        token: userId ? `jeton:${userId}` : null,
      });
      await c.attend("room_joined");
      return c;
    },

    room: () => roomGames[h.code],
    titreEnCours: () => h.room().game.currentTrack,

    repondre(c) {
      c.socket.emit("submit_guess", h.titreEnCours().title);
      c.socket.emit("submit_guess", h.titreEnCours().mainArtist);
    },

    // Attend la manche n et le départ synchronisé de tous les joueurs
    async caler(n, ...joueurs) {
      for (const j of joueurs) await j.attend("start_round", n);
      for (const j of joueurs) j.socket.emit("player_ready");
      for (const j of joueurs) await j.attend("round_start_sync", n);
    },

    lignes: () => (db.inserts.game_players ?? []).flat(),
    stats: () => db.rpc.filter((r) => r.fn === "update_player_stats"),
  };
  return h;
}
