import { goto } from "$app/navigation";
import { emptySlots, emptyQcm, answerSlots } from "./answers.js";
import { focusGuess } from "./gameSession.svelte.js";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

// Réactions aux événements de la partie (branchées par joinRoom()) sur l'état g.
export function gameHandlers(g) {
  return {
    connected() {
      g.showDcBanner = false;
    },
    disconnected() {
      if (!g.takenOver) g.showDcBanner = true;
      if (g.player.roundActive) g.player.stop();
    },
    roomJoined(roomConfig) {
      const trackInfo = roomConfig.trackCount
        ? ` — ${roomConfig.trackCount} titres`
        : "";
      g.roomLabel =
        `${roomConfig.emoji || ""} ${roomConfig.name || ""}${trackInfo}`.trim();
      g.autoStart = roomConfig.autoStart || false;
      g.isAdmin = roomConfig.isAdmin || false;
      g.hasOwner = roomConfig.hasOwner || false;
      g.adminLocked = roomConfig.adminBlocked || false;
      if (g.adminLocked) g.startDisabled = true;
      if (roomConfig.gameMode) g.gameMode = roomConfig.gameMode;
      // Proposée en « Reprendre » sur l'accueil
      try {
        localStorage.setItem(
          "zik_last_room",
          JSON.stringify({
            id: g.roomId,
            name: roomConfig.name || g.roomId,
            emoji: roomConfig.emoji || "",
            gameMode: g.gameMode,
          }),
        );
      } catch {
        /* stockage indisponible */
      }
    },
    countdown: g.startCountdownUI,
    countdownCancelled: g.stopCountdownUI,
    trackCount(count) {
      g.roomLabel =
        g.roomLabel.replace(/ — \d+ titres$/, "") + ` — ${count} titres`;
    },
    players(ps) {
      g.players = [...ps]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({
          ...p,
          rank: MEDALS[i] || `#${i + 1}`,
          scored:
            g.prevScores[p.name] !== undefined &&
            p.score > g.prevScores[p.name],
        }));
      ps.forEach((p) => {
        g.prevScores[p.name] = p.score;
      });
    },
    history(h) {
      g.history = Array.isArray(h) ? [...h].reverse() : [];
    },
    gameStarting() {
      g.gameoverShow = false;
      g.showStart = false;
      g.stopCountdownUI();
      clearTimeout(g.timers.loading);
      g.roundLoading = false;
      g.shareResultId = null;
      g.cardsInPlay = [];
      g.cardsResult = null;
      g.roundsSeen = 0;
      g.roundCard = null;
    },
    cardsInPlay(list) {
      g.cardsInPlay = list;
    },
    cardsGranted(result) {
      g.cardsResult = result;
    },
    roundLoading() {
      g.later("loading", 1500, () => {
        g.roundLoading = true;
      });
    },
    startRound(d) {
      clearTimeout(g.timers.loading);
      g.roundLoading = false;
      g.roundInfo = `Manche ${d.round} / ${d.total}`;
      g.roundTotal = d.total;
      g.cardsOff = d.cardsOff ?? null;
      g.roundCard = null;
      g.currentRoundInfo = {
        round: d.round,
        trackId: d.trackId ?? null,
        videoId: d.videoId ?? null,
      };
      g.coverSrc = "";
      g.showCover = false;
      // Une partie relancée par quelqu'un d'autre ne doit pas nous arracher aux scores
      const holdOnResults = g.gameoverShow && !g.iRequestedReplay;
      g.iRequestedReplay = false;
      g.summaryShow = false;
      g.feedback = { msg: "", cls: "" };
      if (!holdOnResults) g.gameoverShow = false;
      g.slots = {
        ...emptySlots(),
        feats: Array.from({ length: d.featCount || 0 }, () => ({
          val: "???",
          state: null,
        })),
        extras: (d.extraLabels || []).map((label) => ({
          val: "???",
          state: null,
          label,
        })),
      };
      g.timerPct = 100;
      g.timerSecs = null;
      g.deckSpin = true;
      g.guessDisabled = true;
      g.guessVal = "";
      g.qcm = { ...emptyQcm(), choices: d.choices || [] };
      g.showStart = false;
      g.startDisabled = false;
      g.startLoading = false;
      g.player.roundActive = true;
      g.player.waitingForSync = true;
      g.player.syncAnchor = null;
      g.player.lastVideo = {
        videoId: d.videoId,
        startSeconds: d.startSeconds,
        startedAt: Date.now(),
      };
      g.syncWaiting = true;
      g.syncReady = 0;
      g.syncTotal = 0;
      if (holdOnResults) {
        // Aucun chargement audio : on n'entend pas une partie qu'on ne regarde pas
        g.heldRound = d;
        g.startRejoinCountdown("rejoin");
        return;
      }
      g.player.playRound(d);
    },
    nextAudio(url) {
      g.player.prefetch(url);
    },
    roundStartSync(elapsed) {
      g.syncWaiting = false;
      g.guessDisabled = false;
      // L'ancre est toujours posée, pour caler la lecture si le joueur rejoint
      // plus tard, mais rien ne joue tant qu'il regarde les scores
      g.player.startSynced(elapsed, { play: !g.heldRound });
      if (!g.heldRound) focusGuess();
    },
    readyUpdate(ready, total) {
      g.syncReady = ready;
      g.syncTotal = total;
    },
    chatHistory(msgs) {
      g.chatMessages = msgs;
    },
    chatMessage(msg) {
      g.chatMessages = [...g.chatMessages, msg];
      if (!g.chatOpen) g.chatUnread++;
    },
    timer(current, max) {
      g.timerPct = (current / max) * 100;
      g.timerSecs = Math.max(0, current);
    },
    feedback(d) {
      if (d.type === "success_artist")
        g.slots.artist = { val: d.val, state: "found" };
      if (d.type === "success_title")
        g.slots.title = { val: d.val, state: "found" };
      if (d.type === "success_feat")
        g.slots.feats[d.featIndex ?? 0] = { val: d.val, state: "found" };
      if (d.type === "success_extra")
        g.slots.extras[d.extraIndex ?? 0] = {
          ...g.slots.extras[d.extraIndex ?? 0],
          val: d.val,
          state: "found",
        };
      g.showFeedback(
        d.msg,
        d.type === "miss" ? "cold" : d.type === "close" ? "hot" : "good",
      );
    },
    revealCover(cover) {
      if (cover) {
        g.coverSrc = cover;
        g.showCover = true;
      }
    },
    choiceResult(result) {
      g.qcm.result = result;
    },
    qcmAnswered(answered, total) {
      g.qcm.answered = answered;
      g.qcm.total = total;
    },
    roundEnd(d) {
      g.roundsSeen += 1;
      g.roundCard = d.card ?? null;
      if (d.card?.mode === "won")
        g.cardsInPlay = [
          ...g.cardsInPlay,
          { card: d.card.card, round: d.round },
        ];
      if (g.gameMode === "qcm" && d.correctChoiceIndex !== undefined)
        g.qcm.reveal = d.correctChoiceIndex;
      g.slots = answerSlots(d);
      if (d.cover) {
        g.coverSrc = d.cover;
        g.showCover = true;
      }
      g.summaryShow = true;
      g.summaryReason = d.reason;
      g.summaryFinder =
        d.totalFound > 0
          ? `\u{1F3C6} 1er : ${d.firstFinder} — ${d.totalFound} joueur(s) ont tout trouvé`
          : "❌ Personne n’a trouvé";
      g.syncWaiting = false;
      g.guessDisabled = true;
      g.timerPct = 0;
      g.deckSpin = false;
      g.player.endRound();
      g.history = [d, ...g.history];
      g.currentRoundInfo = null;
    },
    gameOver(scores) {
      g.player.endRound();
      g.guessDisabled = true;
      g.timerPct = 0;
      g.deckSpin = false;
      g.summaryShow = false;
      g.gameoverScores = scores;
      g.gameoverShow = true;
      g.heldRound = null;
      g.iRequestedReplay = false;
      g.stopRejoinCountdown();
      // Relance automatique, sauf pour ceux qui ne peuvent pas lancer la partie
      if (g.canReplay) g.startRejoinCountdown("replay");
    },
    achievements(list) {
      if (Array.isArray(list)) g.achToasts = [...g.achToasts, ...list];
    },
    resultId(id) {
      g.shareResultId = id;
    },
    serverError(msg) {
      g.errorMsg = msg;
      g.later("error", 4000, () => {
        g.errorMsg = "";
      });
      g.startDisabled = false;
      g.startLoading = false;
    },
    joinRefused(info) {
      g.joinConflict = info;
    },
    // Un autre onglet a pris la main : ne pas se remettre dans la partie
    takenOver() {
      g.takenOver = true;
    },
    kicked() {
      goto("/rooms");
    },
    adminPause() {
      g.player.pause();
    },
    adminResume() {
      g.player.resume();
    },
    announce(message) {
      g.adminAnnounceMsg = message;
      g.later("announce", 8000, () => {
        g.adminAnnounceMsg = "";
      });
    },
    blocked(locked) {
      g.adminLocked = locked;
      g.startDisabled = locked;
    },
  };
}
