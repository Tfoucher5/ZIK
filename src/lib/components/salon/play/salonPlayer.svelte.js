import { io } from "socket.io-client";
import { listenPlayer } from "./playerEvents.js";
import { forgetResume, leaveResume, readResume } from "./resume.js";

// Les trois premiers, plus soi-même si on n'y est pas
export function podium(ranking) {
  if (!ranking) return [];
  const { top, me } = ranking;
  return me && me.rank > 3 ? [...top, me] : top;
}

// État du téléphone d'un joueur du mode Salon et connexion à la partie.
export class SalonPlayer {
  // Formulaire pour rejoindre
  codeInput = $state("");
  usernameInput = $state("");
  joinError = $state("");
  joining = $state(false);
  // Téléphone qui jouait récemment dans ce salon : on propose de reprendre sa place
  resume = $state(null);

  // Partie
  joined = $state(false);
  username = $state("");
  code = $state("");
  answerMode = $state("free");
  phase = $state("lobby");
  round = $state(0);
  total = $state(10);
  myScore = $state(0);
  // Classement vu du téléphone : { top, me, count }, jamais la liste complète
  ranking = $state(null);
  timerVal = $state(0);
  startSec = $state(0);
  nextSec = $state(0);
  nextShown = $state(true);
  timerMax = $state(30);
  choices = $state(null);

  // Ce que le joueur a trouvé dans la manche
  foundArtist = $state(false);
  foundTitle = $state(false);
  foundFeats = $state([]);
  foundExtras = $state([]);
  extras = $state([]); // labels des réponses supplémentaires du round
  allFound = $state(false);

  timerStarted = $state(false); // l'hôte a lancé la musique
  chosenIndex = $state(null); // QCM : case choisie par ce joueur
  revealCorrectIndex = $state(null); // QCM : bonne case (envoyée par round_end)

  guess = $state("");
  roundEnd = $state(null);
  finalRanking = $state(null);
  feedback = $state(null);
  error = $state("");

  roster = $state({ recent: [], count: 0 });
  teams = $state(null);
  night = $state(null);
  buzzer = $state(null);
  videoOutage = $state(null);
  adminNotice = $state("");
  // Le serveur redémarre (déploiement) : reprise automatique à la reconnexion
  restarting = $state(false);
  // Après un redémarrage : « mise à jour terminée », la manche repart seule
  restored = $state(null);
  specialIntro = $state(false);
  buzzLocked = $state(false);
  special = $state(null);
  intermission = $state(null);
  finale = $state(null);
  myTeam = $state(null);
  paused = $state(false);

  socket = null;
  revealTimer = null; // délai avant de passer au résumé
  #feedbackTimer = null;
  errorTimer = null;
  #sb;

  myRank = $derived(this.ranking?.me?.rank ?? 0);
  board = $derived(podium(this.ranking));
  teamName = $derived(this.teams?.find((t) => t.id === this.myTeam)?.name);

  constructor(sb) {
    this.#sb = sb;
  }

  showFeedback(data) {
    this.feedback = data;
    clearTimeout(this.#feedbackTimer);
    this.#feedbackTimer = setTimeout(() => {
      this.feedback = null;
    }, 2200);
  }

  pickTeam = (id) => {
    this.myTeam = id;
    this.socket?.emit("salon_pick_team", { team: id });
  };

  submitGuess = () => {
    if (this.allFound || !this.guess.trim()) return;
    this.socket.emit("salon_submit_guess", { guess: this.guess.trim() });
    this.guess = "";
  };

  submitChoice = (index) => {
    if (this.allFound) return;
    this.chosenIndex = index;
    this.allFound = true;
    this.socket.emit("salon_submit_choice", { choiceIndex: index });
  };

  buzz = () => {
    if (this.buzzer || this.buzzLocked || this.allFound) return;
    navigator.vibrate?.(60);
    this.socket.emit("salon_buzz");
  };

  checkResume = (urlCode) => {
    try {
      const r = readResume(localStorage, urlCode);
      this.codeInput = r.code;
      this.usernameInput = r.username;
      this.resume = r.resume;
    } catch {
      /* stockage indisponible : formulaire classique */
    }
  };

  forgetResume = () => {
    try {
      forgetResume(localStorage, this.resume.code);
    } catch {
      /* stockage indisponible */
    }
    this.resume = null;
    this.usernameInput = "";
  };

  leave = () => {
    // Sinon l'ancienne connexion se reconnecte à l'ancien salon après une
    // coupure et y ramène le téléphone
    this.socket?.disconnect();
    this.socket = null;
    this.resume = null;
    try {
      leaveResume(localStorage);
    } catch {
      /* stockage indisponible */
    }
    this.joined = false;
    this.codeInput = "";
  };

  connectAndJoin = () => {
    this.joinError = "";
    this.joining = true;

    const c = this.codeInput.trim().toUpperCase();
    const u = this.usernameInput.trim();
    if (!c || c.length < 6) {
      this.joinError = "Le code fait 6 caractères : il est affiché sur la TV.";
      this.joining = false;
      return;
    }
    if (!u) {
      this.joinError =
        "Choisis un pseudo pour que les autres te reconnaissent.";
      this.joining = false;
      return;
    }

    this.socket?.disconnect();
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;

    socket.on("connect", async () => {
      // Jeton de ce téléphone : lui seul peut reprendre sa place après une coupure
      let token = null;
      try {
        token = localStorage.getItem("zik_salon_player_" + c);
      } catch {
        /* stockage indisponible */
      }
      const auth = this.#sb
        ? (await this.#sb.auth.getSession().catch(() => null))?.data.session
            ?.access_token
        : null;
      socket.emit("salon_join_player", { code: c, username: u, token, auth });
    });
    listenPlayer(this, socket, c, u);
  };

  destroy() {
    this.socket?.disconnect();
    this.stopCountdowns?.();
    clearTimeout(this.#feedbackTimer);
    clearTimeout(this.errorTimer);
    clearTimeout(this.revealTimer);
  }
}
