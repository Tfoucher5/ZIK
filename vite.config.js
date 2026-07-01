import { sveltekit } from "@sveltejs/kit/vite";
import { Server } from "socket.io";

/** @type {import('vite').Plugin} */
const webSocketServer = {
  name: "webSocketServer",
  configureServer(server) {
    if (!server.httpServer) return;
    // Dynamically import to support ESM modules with top-level await
    Promise.all([
      import("./src/lib/server/socket/game/index.js"),
      import("./src/lib/server/socket/salon.js"),
      import("./src/lib/server/services/playlist.js"),
    ]).then(([{ register }, { registerSalon }, { preloadAllPlaylists }]) => {
      const io = new Server(server.httpServer, {
        transports: ["websocket", "polling"],
        perMessageDeflate: { threshold: 1024 },
      });
      register(io);
      registerSalon(io);
      preloadAllPlaylists();
      console.log("[ZIK] Socket.IO attache au serveur Vite");
    });
  },
};

/** @type {import('vite').UserConfig} */
export default {
  plugins: [sveltekit(), webSocketServer],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/socket.io-client")) return "socketio";
        },
      },
    },
  },
};
