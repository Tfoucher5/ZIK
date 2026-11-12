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

// Décomptes annoncés par le serveur (salon_countdown) : lancement de la partie
// (s.startSec) et titre suivant (s.nextSec, affiché aux joueurs si
// s.nextShown). Coupés dès que la suite arrive.
// shortcut: un écran qui (re)joint pendant un décompte ne l'affiche pas,
// envoyer l'heure de reprise dans le join si ça gêne en soirée.
export function listenCountdowns(s, socket) {
  const c = {
    start: countdown((v) => (s.startSec = v)),
    next: countdown((v) => (s.nextSec = v)),
  };
  const stop = () => {
    c.start.stop();
    c.next.stop();
    s.startSec = 0;
    s.nextSec = 0;
  };
  socket.on("salon_countdown", ({ kind, endsAt, now, show }) => {
    stop();
    if (kind === "next") s.nextShown = show !== false;
    c[kind]?.start(endsAt, now);
  });
  for (const e of ["salon_round_start", "salon_game_over", "salon_closed"])
    socket.on(e, stop);
  socket.on("salon_paused", ({ paused }) => paused && stop());
  return stop;
}
