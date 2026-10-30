import { salonRooms } from "../../state.js";
import { endRound, startNextRound } from "./rounds.js";

const SALON_CLEANUP_DELAY = 30 * 60 * 1000; // 30 min

export function scheduleCleanup(code) {
  const salon = salonRooms[code];
  if (!salon) return;
  clearTimeout(salon._cleanupTimer);
  salon._cleanupTimer = setTimeout(() => {
    const s = salonRooms[code];
    if (s) {
      clearInterval(s.game.interval);
      clearTimeout(s.game.breakTimer);
      clearTimeout(s.game.musicReadyTimer);
    }
    delete salonRooms[code];
    console.log(`Salon "${code}" libere de la memoire`);
  }, SALON_CLEANUP_DELAY);
}

export function cleanupNow(code, io) {
  const salon = salonRooms[code];
  if (!salon) return;
  clearTimeout(salon._cleanupTimer);
  clearInterval(salon.game.interval);
  clearTimeout(salon.game.breakTimer);
  clearTimeout(salon.game.musicReadyTimer);
  if (io) {
    io.to(`salon:${code}`).emit("salon_error", {
      message: "L'hôte a quitté le salon.",
    });
  }
  delete salonRooms[code];
  console.log(`Salon "${code}" ferme (hote deconnecte)`);
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
  const duration = salon.settings.roundDuration;

  clearTimeout(game.musicReadyTimer);
  game.skipStreak = 0;
  game.musicReadyTimer = null;
  game.startTime = Date.now();
  game.timerValue = duration;
  game.timerMax = duration;
  game.timerActive = true;

  io.to(`salon:${code}`).emit("salon_timer_started", { max: duration });
  runTimer(code, io);
}

function runTimer(code, io) {
  const game = salonRooms[code].game;
  game.interval = setInterval(() => {
    game.timerValue--;
    io.to(`salon:${code}`).emit("salon_timer_update", {
      current: game.timerValue,
      max: game.timerMax,
    });
    if (game.timerValue <= 0) {
      endRound(code, "Temps écoulé !", io);
    }
  }, 1000);
}

export function pauseGame(code, io) {
  const game = salonRooms[code]?.game;
  if (!game || game.paused || !["round", "summary"].includes(game.phase))
    return;
  game.paused = true;
  game.pausedAt = Date.now();
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
    if (game.timerActive) runTimer(code, io);
    else game.musicReadyTimer = setTimeout(() => startTimer(code, io), 12000);
  } else if (game.phase === "summary" && !salon.settings.manualNext) {
    game.breakTimer = setTimeout(() => {
      game.breakTimer = null;
      startNextRound(code, io);
    }, 3000);
  }
}
