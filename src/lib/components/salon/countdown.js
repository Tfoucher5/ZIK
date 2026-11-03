// Chrono local calé sur l'heure de fin envoyée par le serveur : un tick perdu
// ou une page reprise en cours de manche affichent quand même le bon temps.
// L'écart d'horloge avec le serveur (now) est mesuré à la réception ; la
// latence du réseau n'est pas corrigée (quelques dizaines de ms).
export function countdown(onTick, clock = () => Date.now()) {
  let timer = null;
  let last = null;
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  return {
    start(endsAt, serverNow) {
      stop();
      let offset = serverNow - clock();
      // Même manche, latence qui varie : on garde l'écart déjà mesuré pour que
      // l'affichage ne remonte pas d'une seconde
      if (last?.endsAt === endsAt && Math.abs(offset - last.offset) < 1000)
        offset = last.offset;
      last = { endsAt, offset };
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
