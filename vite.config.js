import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { Server } from "socket.io";
import { withMinifiedCss } from "./scripts/minify-css.mjs";

/** @type {import('vite').Plugin} */
const webSocketServer = {
  name: "webSocketServer",
  configureServer(server) {
    if (!server.httpServer) return;
    // Dynamically import to support ESM modules with top-level await
    Promise.all([
      import("./src/lib/server/socket/game/index.js"),
      import("./src/lib/server/socket/salon/index.js"),
      import("./src/lib/server/socket/presence.js"),
    ]).then(([{ register }, { registerSalon }, { registerPresence }]) => {
      const io = new Server(server.httpServer, {
        transports: ["websocket", "polling"],
        perMessageDeflate: { threshold: 1024 },
      });
      register(io);
      registerSalon(io);
      registerPresence(io);
      console.log("[ZIK] Socket.IO attache au serveur Vite");
    });
  },
};

/** @type {import('vite').UserConfig} */
export default {
  plugins: [
    sveltekit({
      adapter: withMinifiedCss(adapter({ out: "build" })),
      alias: { $lib: "src/lib" },
    }),
    webSocketServer,
  ],
  build: { target: "es2020" },
};
