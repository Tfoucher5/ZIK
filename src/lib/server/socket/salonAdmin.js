import { salonRooms, getIO } from "../state.js";
import { displayString } from "../services/playlist.js";
import {
  pauseGame,
  resumeGame,
  revealRound,
  nextRound,
  kickPlayer,
  staff,
  applySettings,
} from "./salon.js";
import { supportView } from "./salonSupport.js";

// Dépannage à distance depuis /admin/salons : mêmes fonctions que la régie.

const PLAYING = ["round", "summary"];

function socketCount(io, room) {
  return io?.sockets.adapter.rooms.get(room)?.size ?? 0;
}

function liveSalon(code) {
  const salon = salonRooms[code];
  const io = getIO();
  if (!salon || !io) throw new Error("Ce salon n'est plus en cours.");
  return { salon, io };
}

/** État complet d'un salon, pour l'admin et les signalements. */
export function salonLiveState(code) {
  const salon = code && salonRooms[code];
  if (!salon) return null;
  const io = getIO();
  const g = salon.game;
  const s = salon.settings;
  const t = PLAYING.includes(g.phase) ? g.currentTrack : null;
  const screens = socketCount(io, `salon:screens:${code}`);
  const controls = socketCount(io, `salon:ctrl:${code}`);
  return {
    code,
    pro: !!salon.pro,
    proGift: !!salon.proGift,
    hostId: salon.hostUserId ?? null,
    phase: g.phase,
    paused: !!g.paused,
    round: g.currentRound,
    maxRounds: s.maxRounds,
    timer: g.timerActive ? g.timerValue : null,
    screens,
    controls,
    hostConnected: screens + controls > 0,
    players: Object.keys(salon.players).length,
    roster: Object.values(salon.players)
      .map((p) => ({
        username: p.username,
        score: p.score,
        team: p.team,
        offline: !!p._disconnected,
      }))
      .sort((a, b) => b.score - a.score),
    settings: {
      answerMode: s.answerMode,
      roundDuration: s.roundDuration,
      showAnswerDuration: s.showAnswerDuration,
      manualNext: !!s.manualNext,
      teams: s.teams?.map((x) => x.name) ?? [],
    },
    playlistIds: [].concat(s.playlistIds ?? []),
    trackCount: g.fullPlaylist.length,
    limitHits: salon.limitHits ?? 0,
    track: t
      ? {
          id: t.id ?? null,
          artist: displayString(t.mainArtist || t.artist),
          title: displayString(t.title),
          youtube_id: t.youtube_id ?? null,
          youtube_start: t.youtube_start ?? null,
        }
      : null,
    video: t ? (g.currentVideo ?? null) : null,
    support: supportView(salon),
  };
}

export function supportPause(code) {
  const { salon, io } = liveSalon(code);
  if (salon.game.paused || !PLAYING.includes(salon.game.phase))
    throw new Error("Aucune manche en cours à mettre en pause.");
  pauseGame(code, io);
}

export function supportResume(code) {
  const { salon, io } = liveSalon(code);
  if (!salon.game.paused) throw new Error("Le salon n'est pas en pause.");
  resumeGame(code, io);
}

/** Manche en cours : on révèle la réponse. Réponse affichée : manche suivante. */
export function supportSkip(code) {
  const { salon, io } = liveSalon(code);
  if (salon.game.phase === "round") {
    revealRound(code, "Titre passé par le support ZIK", io);
    return "revealed";
  }
  if (salon.game.phase === "summary") {
    nextRound(code, io);
    return "next";
  }
  throw new Error("Aucun titre en cours.");
}

export function supportKick(code, username) {
  const { salon, io } = liveSalon(code);
  if (!kickPlayer(salon, username, io)) throw new Error("Joueur introuvable.");
}

export function supportGiftPro(code) {
  const { salon, io } = liveSalon(code);
  if (salon.pro) throw new Error("Ce salon est déjà en Pro.");
  salon.pro = true;
  salon.proGift = true;
  staff(code, io).emit("salon_pro", { pro: true });
}

/** Réglages appliqués comme depuis la régie, sans la barrière du Pro. */
export function supportSettings(code, patch) {
  const { io } = liveSalon(code);
  applySettings(code, patch, io, () => true);
}
