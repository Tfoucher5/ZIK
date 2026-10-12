import { setIO } from "../../state.js";
import { registerSupport } from "./support.js";
import { registerJoin } from "./join.js";
import { registerControl } from "./control.js";
import { registerAnswers } from "./answers.js";

export { createSalonRoom, changeSalonPlaylists } from "./rooms.js";

export function registerSalon(io) {
  setIO(io);
  io.on("connection", (socket) => {
    registerSupport(socket);
    registerJoin(socket, io);
    registerControl(socket, io);
    registerAnswers(socket, io);
  });
}
