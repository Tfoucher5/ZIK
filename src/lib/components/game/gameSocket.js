// Connexion à la room : traduit les événements du serveur en appels aux
// handlers de la page. payload() fournit les infos de join_room.
export async function joinRoom(h, payload) {
  const { io } = await import("socket.io-client");
  const socket = io({
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });
  let joined = false;
  const join = (extra) =>
    payload(extra).then((p) => socket.emit("join_room", p));

  socket.on("connect", () => {
    h.connected();
    if (joined) join();
  });
  socket.on("disconnect", h.disconnected);
  socket.on("room_joined", ({ roomConfig }) => {
    if (roomConfig) h.roomJoined(roomConfig);
  });
  socket.on("game_countdown", ({ seconds }) => h.countdown(seconds));
  socket.on("game_countdown_cancelled", h.countdownCancelled);
  socket.on("track_count_update", h.trackCount);
  socket.on("update_players", h.players);
  socket.on("init_history", h.history);
  socket.on("game_starting", h.gameStarting);
  socket.on("cards_in_play", h.cardsInPlay);
  socket.on("cards_granted", h.cardsGranted);
  socket.on("round_loading", h.roundLoading);
  socket.on("start_round", h.startRound);
  socket.on("next_audio", ({ audioUrl }) => h.nextAudio(audioUrl));
  socket.on("round_start_sync", (d) => h.roundStartSync(d?.elapsed || 0));
  socket.on("ready_update", ({ ready, total }) => h.readyUpdate(ready, total));
  socket.on("chat_history", h.chatHistory);
  socket.on("chat_message", h.chatMessage);
  socket.on("timer_update", ({ current, max }) => h.timer(current, max));
  socket.on("feedback", h.feedback);
  socket.on("reveal_cover", ({ cover }) => h.revealCover(cover));
  socket.on("choice_result", h.choiceResult);
  socket.on("qcm_answered_update", ({ answered, total }) =>
    h.qcmAnswered(answered, total),
  );
  socket.on("round_end", h.roundEnd);
  socket.on("game_over", h.gameOver);
  socket.on("achievements_unlocked", h.achievements);
  socket.on("game_result_id", h.resultId);
  socket.on("server_error", h.serverError);
  socket.on("join_refused", h.joinRefused);
  socket.on("session_taken_over", () => {
    joined = false;
    h.takenOver();
  });
  socket.on("admin_kicked", () => {
    socket.disconnect();
    h.kicked();
  });
  socket.on("admin_pause", h.adminPause);
  socket.on("admin_resume", h.adminResume);
  socket.on("admin_announce", ({ message }) => h.announce(message));
  socket.on("admin_blocked", () => h.blocked(true));
  socket.on("admin_unblocked", () => h.blocked(false));

  // Reprend la main sur l'autre onglet : il sera déconnecté à notre place
  socket.takeOver = () => join({ takeover: true });

  joined = true;
  join();
  return socket;
}
