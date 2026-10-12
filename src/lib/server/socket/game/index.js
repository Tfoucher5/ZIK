import { setIO } from "../../state.js";
import { registerJoin } from "./join.js";
import { registerAnswers } from "./answers.js";
import { registerLive } from "./live.js";

export * from "./admin.js";

export function register(io) {
  setIO(io);
  io.on("connection", (socket) => {
    registerJoin(socket, io);
    registerAnswers(socket, io);
    registerLive(socket, io);
  });
}
