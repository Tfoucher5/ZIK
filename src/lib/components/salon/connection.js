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
  // Réseau revenu : le socket se reconnecte seul, « connect » efface l'alerte.
  // Si la connexion n'avait jamais lâché, on l'efface tout de suite.
  const online = () => socket.connected && back();
  win?.addEventListener("offline", offline);
  win?.addEventListener("online", online);
  return () => {
    clearTimeout(timer);
    win?.removeEventListener("offline", offline);
    win?.removeEventListener("online", online);
  };
}
