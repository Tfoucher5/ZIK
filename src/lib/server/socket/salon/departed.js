// Joueurs partis (déconnectés plus longtemps que le délai de grâce) : ils
// restent comptés dans la partie en cours et dans la soirée, rangés par jeton
// dans salon.departed, et retrouvent leurs points s'ils reviennent.

export const departed = (salon) => Object.values(salon.departed ?? {});

export function departPlayer(salon, username) {
  const p = salon.players[username];
  delete salon.players[username];
  const inGame = !["lobby", "gameover"].includes(salon.game.phase);
  if (!inGame && !p.night) return;
  (salon.departed ??= {})[p.token] = {
    username: p.username,
    token: p.token,
    userId: p.userId ?? null,
    team: p.team,
    score: inGame ? p.score : 0,
    // Manche coupée par un redémarrage : ses points sont annulés pour tous
    scoreBeforeRound: inGame ? p.scoreBeforeRound : 0,
    stats: p.stats,
    night: p.night,
    inGame,
    left: true,
  };
}

// Téléphone resté en veille trop longtemps : il retrouve ses points
export function restoreDeparted(salon, player, token) {
  const back = token && salon.departed?.[token];
  // Téléphone prêté à un ami : le jeton seul ne suffit pas
  if (!back || back.username !== player.username) return;
  delete salon.departed[token];
  player.night = back.night;
  if (salon.settings.teams?.some((t) => t.id === back.team))
    player.team = back.team;
  if (back.inGame) {
    player.score = player.scoreBeforeRound = back.score;
    player.stats = back.stats;
  }
}

// Un parti garde son pseudo : deux lignes au même nom cassent les écrans
export function nameTaken(salon, username) {
  return (
    salon.players[username] ??
    departed(salon).find((d) => d.username === username)
  );
}

// Joueurs de la partie en cours, partis compris
export function gamePlayers(salon) {
  return [
    ...Object.values(salon.players),
    ...departed(salon).filter((d) => d.inGame),
  ];
}

// Nouvelle partie : les partis de la précédente ne comptent plus que pour la soirée
export function closeDeparted(salon) {
  for (const [k, d] of Object.entries(salon.departed ?? {})) {
    if (d.night) d.inGame = false;
    else delete salon.departed[k];
  }
}
