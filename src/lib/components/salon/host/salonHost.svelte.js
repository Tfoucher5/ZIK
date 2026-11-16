import { watchConnection } from "../connection.js";
import { io } from "socket.io-client";
import { listenHost } from "./hostEvents.js";
import { SupportChat } from "../support/supportChat.svelte.js";
import { loadSalonPlaylists } from "../../../data/salonPlaylists.js";
import {
  takeSalonKeyFromUrl,
  patchSalonPlaylists,
} from "../../../client/salonClient.js";

const PREP = "zik_salon_prep";

// État de l'écran TV du mode Salon (l'hôte) et connexion à la partie.
export class SalonHost {
  code = $state("");
  key = null;
  // L'écran TV n'existe qu'avec la clé du salon : personne d'autre ne l'ouvre
  joined = $state(false);
  pro = $state(false);
  socket = null;

  // Changement de playlist en cours de salon
  allPlaylists = $state([]);
  pickerOpen = $state(false);
  pickerIds = $state([]);
  savingPlaylist = $state(false);
  pickerError = $state("");
  playlistNotice = $state("");
  canChangePlaylists = $state(false);

  // Partie
  phase = $state("lobby");
  players = $state([]);
  round = $state(0);
  total = $state(10);
  timerVal = $state(0);
  timerMax = $state(30);
  timerStarted = $state(false);
  roundEnd = $state(null);
  gameOver = $state(null);
  teams = $state(null);
  night = $state(null);
  buzzer = $state(null);
  videoOutage = $state(null);
  adminNotice = $state("");
  // Le serveur redémarre (déploiement) : reprise automatique à la reconnexion
  restarting = $state(false);
  // Cet écran a perdu le réseau (affiché après quelques secondes)
  connLost = $state(false);
  // Après un redémarrage : « mise à jour terminée », la manche repart seule
  restored = $state(null);
  mediaCheck = $state(null);
  specialIntro = $state(false);
  special = $state(null);
  intermission = $state(null);
  finale = $state(null);
  // QR en grand (régie ou TV seule), renvoyé par le serveur
  qrBig = $state(false);
  // Relance demandée (salon_restarted) : la phase reste gameover jusqu'à la manche 1
  relaunching = $state(false);
  // Le podium de la partie a déjà été révélé : pas de deuxième fois au remontage
  overRevealed = false;
  // Intro éclair : la musique est coupée, une reprise après un buzz raté ne la relance pas
  flashCut = false;
  paused = $state(false);
  settings = $state({});
  choices = $state(null);
  error = $state("");
  startSec = $state(0);
  nextSec = $state(0);
  nextShown = $state(true);
  volume = $state(100);
  #beforeMute = 100;
  // Régies branchées (badge) ; null tant que le serveur n'a rien dit
  controls = $state(null);
  // Téléphones en file à l'entrée (salon gratuit plein), le nombre seul
  waiting = $state(0);
  helpOpen = $state(false);
  // « Prépare la TV » passée (code affiché) ; le son entendu ou non au test
  prepDone = $state(false);
  tvSound = null;
  userId = $state(null);
  chat = new SupportChat();

  /** Lecteur vidéo (HostCenter), branché par bind:this */
  hostCenter = null;
  #sb;

  timerLevel = $derived(
    !this.timerMax || this.timerVal / this.timerMax >= 0.4
      ? ""
      : this.timerVal / this.timerMax >= 0.2
        ? "warn"
        : "danger",
  );
  deltas = $derived(
    Object.fromEntries(
      (this.roundEnd?.scores ?? []).map((s) => [s.username, s.delta]),
    ),
  );

  constructor(sb) {
    this.#sb = sb;
  }

  // `share` : changé sur la TV, la régie doit le voir ; venu de la régie, déjà connu
  applyVolume = (v, share = true) => {
    this.volume = v;
    localStorage.setItem("zik_salon_vol", String(v));
    this.hostCenter?.setVolume(v);
    if (share) this.socket?.emit("salon_tv_volume", { volume: v });
  };

  toggleMute = () => {
    if (this.volume > 0) {
      this.#beforeMute = this.volume;
      this.applyVolume(0);
    } else this.applyVolume(this.#beforeMute);
  };

  showCode = () => {
    this.prepDone = true;
    try {
      localStorage.setItem(PREP, this.code);
    } catch {
      /* stockage indisponible : la prépa reviendra au rechargement */
    }
  };

  setTvSound = (ok) => {
    this.tvSound = ok;
    this.socket?.emit("salon_tv_sound", { ok });
  };

  /** Branché par listenCountdowns */
  stopCountdowns = () => {};

  startGame = () => {
    this.socket?.emit("salon_start");
    this.phase = "starting";
  };
  nextRound = () => {
    this.socket?.emit("salon_next_round");
    this.stopCountdowns();
  };
  restartGame = () => {
    this.socket?.emit("salon_restart");
  };
  // La réponse « salon_closed » ramène sur /salon ; connexion coupée : pas de
  // réponse, on part quand même
  closeSalon = () => {
    this.socket?.emit("salon_close");
    setTimeout(() => (window.location.href = "/salon"), 2000);
  };
  setQrBig = (on) => {
    this.socket?.emit("salon_qr_big", { on });
  };
  togglePause = () => {
    this.socket?.emit(this.paused ? "salon_resume" : "salon_pause");
  };

  // Garde les indicateurs de la manche (A/T) quand la liste est renvoyée
  mergeRoster(list) {
    const old = Object.fromEntries(this.players.map((p) => [p.username, p]));
    this.players = list
      .map((p) => ({ ...old[p.username], ...p }))
      .sort((a, b) => b.score - a.score);
  }

  openPicker = () => {
    this.pickerError = "";
    this.pickerIds = [...(this.settings.playlistIds || [])];
    this.pickerOpen = true;
  };

  savePlaylists = async () => {
    if (this.pickerIds.length === 0) {
      this.pickerError = "Sélectionne au moins une playlist.";
      return;
    }
    this.savingPlaylist = true;
    this.pickerError = "";
    try {
      await patchSalonPlaylists(this.#sb, this.code, this.pickerIds);
      this.pickerOpen = false;
    } catch (e) {
      this.pickerError = e.message;
    } finally {
      this.savingPlaylist = false;
    }
  };

  async mount() {
    this.code =
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- lu une seule fois, pas un état
      new URLSearchParams(window.location.search).get("code")?.toUpperCase() ||
      "";
    if (!this.code) {
      window.location.href = "/salon";
      return;
    }
    this.key = takeSalonKeyFromUrl(this.code);
    try {
      this.prepDone = localStorage.getItem(PREP) === this.code;
    } catch {
      /* stockage indisponible */
    }
    const savedVol = parseInt(localStorage.getItem("zik_salon_vol") ?? "100");
    this.volume = Number.isNaN(savedVol) ? 100 : savedVol;
    this.hostCenter?.setVolume(this.volume);
    this.#connect(this.code);

    const {
      data: { session },
    } = await this.#sb.auth.getSession();
    this.userId = session?.user.id ?? null;
    if (session?.user || this.key) {
      this.canChangePlaylists = true;
      try {
        this.allPlaylists = await loadSalonPlaylists(
          this.#sb,
          session?.user.id ?? null,
        );
      } catch {
        this.canChangePlaylists = false;
      }
    }
  }

  #connect(roomCode) {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;
    this.stopWatch?.();
    this.stopWatch = watchConnection(socket, (v) => (this.connLost = v));

    socket.on("connect", () =>
      socket.emit("salon_join_host", { code: roomCode, key: this.key }),
    );
    this.chat.attach(socket);
    listenHost(this, socket);
  }

  destroy() {
    this.socket?.disconnect();
    this.stopCountdowns();
    this.stopWatch?.();
  }
}
