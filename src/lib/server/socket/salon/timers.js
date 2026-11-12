import { salonRooms, getIO } from "../../state.js";
import { endRound, startNextRound } from "./rounds.js";
import { clearOutage } from "./outage.js";
import { dropSnapshot } from "./snapshot.js";
import { recordSalonGameEnd } from "./persist.js";

const SALON_CLEANUP_DELAY = 30 * 60 * 1000; // 30 min

export function scheduleCleanup(code) {
  const salon = salonRooms[code];
  if (!salon) return;
  clearTimeout(salon._cleanupTimer);
  salon._cleanupTimer = setTimeout(() => {
    // Entracte : rien ne bouge, mais la TV ou la régie est encore là
    const rooms = getIO()?.sockets.adapter.rooms;
    if (
      rooms?.get(`salon:screens:${code}`)?.size ||
      rooms?.get(`salon:ctrl:${code}`)?.size
    )
      return scheduleCleanup(code);
    const s = salonRooms[code];
    if (s) {
      clearInterval(s.game.interval);
      clearTimeout(s.game.breakTimer);
      clearTimeout(s.game.musicReadyTimer);
    }
    delete salonRooms[code];
    dropSnapshot(code);
    console.log(`Salon "${code}" libere de la memoire`);
  }, SALON_CLEANUP_DELAY);
}

export function cleanupNow(code, io, message = "L'hôte a quitté le salon.") {
  const salon = salonRooms[code];
  if (!salon) return;
  // Partie en cours : ses scores restent comptés
  recordSalonGameEnd(salon);
  clearTimeout(salon._cleanupTimer);
  clearTimeout(salon._hostDcTimer);
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.breakTimer);
  clearTimeout(salon.game.musicReadyTimer);
  io?.to(`salon:${code}`).emit("salon_closed", { message });
  delete salonRooms[code];
  dropSnapshot(code);
  console.log(`Salon "${code}" ferme`);
}

// Called when the host signals that the music is actually playing.
// Also called by a fallback timeout if no signal arrives within 5s.
export function startTimer(code, io) {
  const salon = salonRooms[code];
  if (
    !salon ||
    salon.game.phase !== "round" ||
    salon.game.interval ||
    salon.game.paused
  )
    return;
  const game = salon.game;
  const duration =
    game.special === "sprint"
      ? Math.max(10, Math.round(salon.settings.roundDuration / 2))
      : salon.settings.roundDuration;

  clearTimeout(game.musicReadyTimer);
  game.skipStreak = 0;
  clearOutage(salon, io);
  game.musicReadyTimer = null;
  game.startTime = Date.now();
  game.endsAt = game.startTime + duration * 1000;
  game.timerValue = duration;
  game.timerMax = duration;
  game.timerActive = true;

  io.to(`salon:${code}`).emit("salon_timer_started", {
    max: duration,
    ...timerClock(game),
  });
  runTimer(code, io);
}

// Heure de fin (horloge serveur) : chaque écran compte seul et reste juste
// même s'il rate un message
export function timerClock(game) {
  const running = game.timerActive && !game.paused && game.phase === "round";
  return { endsAt: running ? game.endsAt : null, now: Date.now() };
}

// Le temps restant vient de l'heure de fin : un tick en retard ne décale rien
function runTimer(code, io) {
  const game = salonRooms[code].game;
  game.interval = setInterval(() => {
    game.timerValue = Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
    if (game.timerValue <= 0) endRound(code, "Temps écoulé !", io);
  }, 1000);
}

export function pauseGame(code, io) {
  const game = salonRooms[code]?.game;
  if (!game || game.paused || !["round", "summary"].includes(game.phase))
    return;
  game.paused = true;
  game.pausedAt = Date.now();
  if (game.timerActive)
    game.remainingMs = Math.max(0, game.endsAt - game.pausedAt);
  clearInterval(game.interval);
  game.interval = null;
  clearTimeout(game.musicReadyTimer);
  game.musicReadyTimer = null;
  clearTimeout(game.breakTimer);
  game.breakTimer = null;
  io.to(`salon:${code}`).emit("salon_paused", { paused: true });
}

export function clearPause(code, io) {
  const game = salonRooms[code].game;
  if (!game.paused) return false;
  game.paused = false;
  // Le temps de pause ne compte pas dans le bonus de rapidité
  game.startTime += Date.now() - game.pausedAt;
  io.to(`salon:${code}`).emit("salon_paused", { paused: false });
  return true;
}

export function resumeGame(code, io) {
  const salon = salonRooms[code];
  if (!salon || !clearPause(code, io)) return;
  const game = salon.game;
  if (game.phase === "round") {
    if (game.timerActive) {
      game.endsAt = Date.now() + (game.remainingMs ?? game.timerValue * 1000);
      io.to(`salon:${code}`).emit("salon_timer_update", {
        max: game.timerMax,
        ...timerClock(game),
      });
      runTimer(code, io);
    } else game.musicReadyTimer = setTimeout(() => startTimer(code, io), 12000);
  } else if (game.phase === "summary" && !salon.settings.manualNext) {
    game.breakTimer = setTimeout(() => {
      game.breakTimer = null;
      startNextRound(code, io);
    }, 3000);
  }
}
