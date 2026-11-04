// Chrono local calé sur l'heure de fin envoyée par le serveur : chaque écran
// compte seul, et une page reprise en cours de manche affiche le bon temps.
//
// Écart d'horloge avec le serveur : un message ne peut qu'arriver en retard,
// donc chaque mesure (now du serveur − heure du téléphone) le sous-estime. On
// garde la plus grande : celle du message le moins retardé. Au réveil d'un
// téléphone verrouillé, les messages restés en attente arrivent d'un coup avec
// plusieurs secondes de retard ; ils ne faussent plus l'affichage.
// shortcut: un téléphone dont l'heure avance brusquement en cours de soirée
// garderait l'ancien écart jusqu'au rechargement de la page.
export function countdown(onTick, clock = () => Date.now()) {
  let timer = null;
  let offset = -Infinity;
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  return {
    start(endsAt, serverNow) {
      stop();
      offset = Math.max(offset, serverNow - clock());
      const tick = () => {
        const left = Math.max(0, Math.ceil((endsAt - clock() - offset) / 1000));
        onTick(left);
        if (!left) stop();
        return left;
      };
      if (tick() > 0) timer = setInterval(tick, 250);
    },
    stop,
  };
}
