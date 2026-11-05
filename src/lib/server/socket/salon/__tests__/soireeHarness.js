import { expect, vi } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as connectClient } from "socket.io-client";
import { salonRooms } from "../../../state.js";
import { registerSalon, createSalonRoom } from "../index.js";
import { cleanupNow } from "../timers.js";

// Vrai serveur Socket.io et vrais clients pour jouer une soirée de bout en bout
const TITRES = ["Papillonnage", "Hippopotamus", "Kaleidoscope", "Xylophonie"];
export const SECRETS =
  /Papillonnage|Hippopotamus|Kaleidoscope|Xylophonie|Zorglub|video\d/;
export const LIGNES_PLAYLIST = TITRES.map((title, i) => ({
  id: `ligne${i}`,
  position: i,
  tracks: {
    id: `titre${i}`,
    artist: `Zorglub${i}`,
    title,
    youtube_id: `video${i}`,
    source: "deezer",
  },
}));
const PLAYLIST = "11111111-1111-1111-1111-111111111111";

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function soiree() {
  let http, server, port;
  const clients = [];
  const h = {
    code: null,

    async start() {
      http = createServer();
      server = new Server(http);
      registerSalon(server);
      await new Promise((r) => http.listen(0, r));
      port = http.address().port;
    },

    stop: () => server.close(),

    async nettoyer() {
      for (const c of clients.splice(0)) c.socket.disconnect();
      await pause(20);
      for (const c of Object.keys(salonRooms)) {
        for (const p of Object.values(salonRooms[c].players))
          clearTimeout(p._dcTimer);
        clearTimeout(salonRooms[c]._hostDcTimer);
        cleanupNow(c, server);
      }
    },

    client() {
      const socket = connectClient(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
      });
      const recus = [];
      socket.onAny((event, data) => recus.push({ event, data }));
      const c = {
        socket,
        recus,
        de: (event) =>
          recus.filter((r) => r.event === event).map((r) => r.data),
        attend: (event, n = 1) =>
          vi.waitFor(
            () => {
              expect(c.de(event).length).toBeGreaterThanOrEqual(n);
              return c.de(event)[n - 1];
            },
            { timeout: 4000, interval: 10 },
          ),
      };
      clients.push(c);
      return c;
    },

    async ouvrir(reglages = {}, maxRounds = 2) {
      const salon = await createSalonRoom({
        playlistIds: [PLAYLIST],
        settings: { answerMode: "free", ...reglages },
      });
      h.code = salon.code;
      // Les bornes de l'API ralentiraient le test : la partie est juste plus courte
      Object.assign(salonRooms[h.code].settings, {
        maxRounds,
        showAnswerDuration: 0.05,
      });
      const tv = h.client();
      tv.socket.emit("salon_join_host", { code: h.code, key: salon.key });
      await tv.attend("salon_host_joined");
      const regie = h.client();
      regie.socket.emit("salon_join_control", { code: h.code, key: salon.key });
      await regie.attend("salon_control_joined");
      return { tv, regie };
    },

    async joueur(username, token) {
      const c = h.client();
      c.socket.emit("salon_join_player", { code: h.code, username, token });
      c.moi = await c.attend("salon_joined");
      return c;
    },

    trackEnCours: () => salonRooms[h.code].game.currentTrack,

    // La réponse arrive en deux fois : anti-spam de 300 ms entre deux réponses
    async repondreJuste(c) {
      c.socket.emit("salon_submit_guess", { guess: h.trackEnCours().title });
      await pause(320);
      c.socket.emit("salon_submit_guess", {
        guess: h.trackEnCours().mainArtist,
      });
    },
  };
  return h;
}
