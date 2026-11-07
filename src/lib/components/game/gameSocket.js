const ACCOUNT_RETRY_MS = 10_000;
const ACCOUNT_RETRIES = 3;
const ROOM_UNKNOWN_DELAY_MS = 3000;
const ACCOUNT_RETRYING =
  "Ton compte n’a pas pu être vérifié : tes points ne comptent pas pour l’instant. Nouvel essai en cours.";
const SESSION_EXPIRED =
  "Ta session a expiré : cette partie ne sera pas comptée. Reconnecte-toi pour garder tes points.";
const ACCOUNT_GAVE_UP =
  "Ton compte n’a toujours pas pu être vérifié : cette partie ne sera pas comptée. Recharge la page pour réessayer.";

// Infos de join_room. Le jeton de session prouve au serveur que userId est bien
// le nôtre ; figé à l'arrivée : un échec de vérification ne coupe pas les
// tentatives suivantes.
export function joinPayload(g) {
  const withAccount = !g.isGuest;
  return async (extra = {}) => ({
    roomId: g.roomId,
    username: g.username,
    userId: g.userId,
    isGuest: !withAccount,
    token: withAccount ? await g.getToken() : null,
    ...extra,
  });
}

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
  let connectedOnce = false;
  let seatSocket = null;
  let sent = null;
  let accountRetries = 0;
  const join = (extra) =>
    payload(extra).then((p) => {
      sent = p;
      socket.emit("join_room", p);
    });

  socket.on("connect", () => {
    h.connected();
    // Au premier connect, le join_room du bas de la fonction est déjà en route
    if (joined && connectedOnce) join({ prevSid: seatSocket });
    connectedOnce = true;
  });
  socket.on("disconnect", h.disconnected);
  socket.on("room_joined", ({ roomConfig }) => {
    if (!roomConfig) return;
    seatSocket = socket.id;
    h.roomJoined(roomConfig);
    // Compte non reconnu (panne d'authentification) : la partie continue en
    // invité, on prévient et on retente pour ne pas perdre ses points
    if (roomConfig.isGuest && sent?.isGuest === false) {
      // Sans jeton, réessayer ne changerait rien
      if (!sent.token) return h.accountUnverified(SESSION_EXPIRED);
      if (accountRetries === 0) h.accountUnverified(ACCOUNT_RETRYING);
      if (accountRetries === ACCOUNT_RETRIES)
        h.accountUnverified(ACCOUNT_GAVE_UP);
      if (accountRetries++ < ACCOUNT_RETRIES)
        setTimeout(() => {
          if (joined && socket.connected) join();
        }, ACCOUNT_RETRY_MS);
    } else accountRetries = 0;
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
  const sentOut = () => {
    joined = false;
    socket.disconnect();
    h.kicked();
  };
  socket.on("admin_kicked", sentOut);
  socket.on("room_force_closed", sentOut);
  // Lien périmé : rester sur une page vide n'avance à rien
  socket.on("room_unknown", () => {
    h.serverError("Cette room n’existe pas ou n’est plus disponible.");
    setTimeout(sentOut, ROOM_UNKNOWN_DELAY_MS);
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
