import { tick } from "svelte";
import { emptySlots, emptyQcm } from "./answers.js";

// Une partie relancée par un autre peut tourner pendant qu'on lit encore les
// scores : on retient la manche au lieu d'y basculer de force
const REJOIN_DELAY = 15;

export const focusGuess = () =>
  tick().then(() => document.getElementById("guessInput")?.focus());

// État de la page de jeu et actions du joueur. Les réactions aux événements
// du serveur sont dans gameHandlers.js.
export class GameSession {
  // Paramètres d'URL, lus au montage
  roomId = $state("pop");
  username = $state("Joueur");
  userId = $state(null);
  isGuest = $state(true);

  // ── État de la partie ──
  roomLabel = $state("");
  roundInfo = $state("En attente…");
  timerPct = $state(100);
  timerSecs = $state(null);
  deckSpin = $state(false);
  players = $state([]);
  history = $state([]);
  currentRoundInfo = $state(null);
  slots = $state(emptySlots());
  coverSrc = $state("");
  showCover = $state(false);
  feedback = $state({ msg: "", cls: "" });
  summaryShow = $state(false);
  summaryReason = $state("");
  summaryFinder = $state("");
  errorMsg = $state("");
  joinConflict = $state(null);
  takenOver = $state(false);
  gameMode = $state("classic");
  qcm = $state(emptyQcm());
  guessVal = $state("");
  guessDisabled = $state(true);
  showDcBanner = $state(false);
  volume = $state(50);
  roundLoading = $state(false);
  syncWaiting = $state(false);
  syncReady = $state(0);
  syncTotal = $state(0);

  // Lancement et relance
  showStart = $state(true);
  startDisabled = $state(false);
  startLoading = $state(false);
  adminLocked = $state(false);
  adminAnnounceMsg = $state("");
  isAdmin = $state(false);
  autoStart = $state(false);
  hasOwner = $state(false);
  countdownVal = $state(0);
  showCountdown = $state(false);
  gameoverShow = $state(false);
  gameoverScores = $state([]);
  shareResultId = $state(null);
  heldRound = $state(null);
  rejoinIn = $state(0);
  // 'replay' : la partie va se relancer ; 'rejoin' : une partie tourne déjà
  countdownMode = $state(null);
  iRequestedReplay = false;

  // Cartes : celle de la manche, celles gagnées depuis le début de la partie
  roundCard = $state(null);
  cardsInPlay = $state([]);
  cardsResult = $state(null);
  roundsSeen = $state(0);
  roundTotal = $state(10);
  cardsOff = $state(null);

  // Fenêtres
  quitAsked = $state(false);
  inviteOpen = $state(false);
  canInviteFriends = $state(false);
  reportOpen = $state(false);
  reportType = $state("user");
  reportUsername = $state("");
  reportUserId = $state(null);
  achToasts = $state([]);
  chatOpen = $state(false);
  chatMessages = $state([]);
  chatUnread = $state(0);

  socket = null;
  player = null;
  prevScores = {};
  timers = {};
  #sb;
  #friendSending = false;

  canReplay = $derived(!this.hasOwner || this.autoStart || this.isAdmin);

  constructor(sb) {
    this.#sb = sb;
  }

  getToken = async () =>
    (await this.#sb.auth.getSession())?.data?.session?.access_token ?? null;

  later(key, ms, fn) {
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(fn, ms);
  }

  showFeedback = (msg, cls) => {
    this.feedback = { msg, cls };
    this.later("feedback", 2600, () => {
      this.feedback = { msg: "", cls: "" };
    });
  };

  // Départ en pleine partie d'une room qui donne des cartes
  quitCase() {
    if (
      this.isGuest ||
      this.cardsOff ||
      this.gameoverShow ||
      this.roundsSeen === 0
    )
      return null;
    if (!this.cardsInPlay.length) return "none";
    return this.roundsSeen < Math.ceil(this.roundTotal / 2) ? "lose" : "keep";
  }

  onBack = (e) => {
    if (!this.quitCase()) return;
    e.preventDefault();
    this.quitAsked = true;
  };

  // Fermeture de l'onglet avec des cartes à perdre : alerte du navigateur
  onBeforeUnload = (e) => {
    if (this.quitCase() === "lose") e.preventDefault();
  };

  setVolume = (v) => {
    this.volume = v;
    this.player?.setVolume(v);
  };

  openUserReport = (p) => {
    this.reportType = "user";
    this.reportUsername = p.name;
    this.reportUserId = p.userId || null;
    this.reportOpen = true;
  };

  openBugReport = () => {
    this.reportType = "bug";
    this.reportOpen = true;
  };

  addFriend = async (p) => {
    if (this.#friendSending) return;
    this.#friendSending = true;
    try {
      const token = await this.getToken();
      if (!token) throw new Error("Connecte-toi pour ajouter des amis.");
      const r = await fetch("/api/friend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetId: p.userId, action: "request" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      this.showFeedback(
        d.friendStatus === "friends"
          ? `\u{1F91D} Vous êtes amis avec ${p.name} !`
          : `✅ Demande d'ami envoyée à ${p.name}`,
        "good",
      );
    } catch (e) {
      this.showFeedback(e.message, "cold");
    }
    this.#friendSending = false;
  };

  requestGame = () => {
    if (!this.socket) return;
    this.iRequestedReplay = true;
    this.socket.emit("request_new_game");
    this.startDisabled = true;
    this.startLoading = true;
  };

  stopRejoinCountdown() {
    clearInterval(this.timers.rejoin);
    this.rejoinIn = 0;
    this.countdownMode = null;
  }

  startRejoinCountdown(mode) {
    this.stopRejoinCountdown();
    this.countdownMode = mode;
    this.rejoinIn = REJOIN_DELAY;
    this.timers.rejoin = setInterval(() => {
      this.rejoinIn -= 1;
      if (this.rejoinIn > 0) return;
      const m = this.countdownMode;
      this.stopRejoinCountdown();
      if (m === "replay") this.requestGame();
      else this.joinRunningGame();
    }, 1000);
  }

  // Bascule vers la partie en cours et cale la lecture là où elle en est
  joinRunningGame = () => {
    this.stopRejoinCountdown();
    const d = this.heldRound;
    this.heldRound = null;
    this.gameoverShow = false;
    if (!d) return;
    this.player.playRound(d);
    if (d.audioUrl && !this.player.waitingForSync) this.player.playSynced();
  };

  startCountdownUI = (seconds) => {
    clearInterval(this.timers.countdown);
    this.countdownVal = seconds;
    this.showCountdown = true;
    this.timers.countdown = setInterval(() => {
      if (--this.countdownVal <= 0) this.stopCountdownUI();
    }, 1000);
  };

  stopCountdownUI = () => {
    clearInterval(this.timers.countdown);
    this.showCountdown = false;
    this.countdownVal = 0;
  };

  submitGuess = (val) => {
    if (!this.socket) return;
    this.socket.emit("submit_guess", val);
    focusGuess();
  };

  submitChoice = (index) => {
    if (this.qcm.chosen !== null || this.guessDisabled || !this.socket) return;
    this.qcm.chosen = index;
    this.socket.emit("submit_choice", { choiceIndex: index });
  };

  toggleChat = () => {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) this.chatUnread = 0;
  };

  destroy() {
    this.socket?.disconnect();
    this.player?.destroy();
    Object.values(this.timers).forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
  }
}
