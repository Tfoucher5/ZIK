// Coupure réseau de cet écran : signalée après un court délai, pour qu'une
// micro-coupure ne fasse pas clignoter la TV devant la salle.
export const LOST_AFTER_MS = 3000;

// `win` : le navigateur annonce la perte de réseau tout de suite, alors que
// Socket.io ne s'en aperçoit qu'au bout de 25 à 45 s sans réponse du serveur
export function watchConnection(
  socket,
  onChange,
  delay = LOST_AFTER_MS,
  win = globalThis.window,
) {
  let timer = null;
  const lost = () => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange(true), delay);
  };
  const back = () => {
    clearTimeout(timer);
    onChange(false);
  };
  // Déconnexion voulue (quitter, changer de soirée) : rien à signaler
  socket.on("disconnect", (reason) => {
    if (reason !== "io client disconnect") lost();
  });
  socket.on("connect", back);
  const offline = () => lost();
  // Réseau revenu ou écran rallumé : on n'attend pas la prochaine tentative de
  // Socket.io (jusqu'à 5 s). connect() seul ne fait rien pendant cette attente,
  // d'où disconnect() avant. `active` est faux après un départ voulu.
  // Si la connexion n'avait jamais lâché, l'alerte s'efface tout de suite.
  const reconnect = () => {
    if (!socket.connected && socket.active) socket.disconnect().connect();
  };
  const online = () => (socket.connected ? back() : reconnect());
  const visible = () =>
    win.document.visibilityState === "visible" && reconnect();
  win?.addEventListener("offline", offline);
  win?.addEventListener("online", online);
  win?.document?.addEventListener("visibilitychange", visible);
  return () => {
    clearTimeout(timer);
    win?.removeEventListener("offline", offline);
    win?.removeEventListener("online", online);
    win?.document?.removeEventListener("visibilitychange", visible);
  };
}
