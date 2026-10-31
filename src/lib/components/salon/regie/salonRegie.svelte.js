import { io } from "socket.io-client";
import { SupportChat } from "../support/supportChat.svelte.js";
import { loadSalonPlaylists } from "../../../data/salonPlaylists.js";
import { listenRegie } from "./regieEvents.js";
import {
  takeSalonKeyFromUrl,
  patchSalonPlaylists,
} from "../../../client/salonClient.js";

export const PHASES = {
  lobby: "En attente",
  starting: "Lancement",
  round: "Manche en cours",
  summary: "Réponse affichée",
  gameover: "Partie terminée",
};

// État de la régie du mode Salon (pilotage depuis un second écran) et connexion.
export class SalonRegie {
  code = $state("");
  key = $state("");
  socket = null;
  error = $state("");
  ready = $state(false);

  phase = $state("lobby");
  paused = $state(false);
  round = $state(0);
  settings = $state({});
  players = $state([]);
  teams = $state(null);
  night = $state(null);
  buzzer = $state(null);
  videoOutage = $state(null);
  mediaCheck = $state(null);
  intermission = $state(null);
  finale = $state(null);
  timerVal = $state(0);
  timerMax = $state(30);
  timerOn = $state(false);
  track = $state(null);
  history = $state([]);
  volume = $state(100);
  notice = $state("");
  confirmKick = $state(null);
  pro = $state(false);
  upsell = $state(null);
  // null tant que le serveur n'a pas répondu : on n'alarme pas à tort.
  screens = $state(null);
  onglet = $state("direct");
  helpOpen = $state(false);
  userId = $state(null);
  chat = new SupportChat();

  allPlaylists = $state([]);
  pickerIds = $state([]);
  pickerOpen = $state(false);
  saving = $state(false);
  #sb;

  idle = $derived(this.phase === "lobby" || this.phase === "gameover");
  live = $derived(this.phase === "round" || this.phase === "summary");
  step = $derived(this.settings.answerMode === "multiple" ? 100 : 1);
  answered = $derived(
    this.players.filter((p) => p.answeredThisRound || p.foundThisRound).length,
  );
  origin = $derived(
    typeof window === "undefined" ? "" : window.location.origin,
  );
  // L'écran TV demande la clé : ce lien est privé, comme celui de la régie
  tvUrl = $derived(
    `${this.origin}/salon/host?code=${this.code}&key=${this.key}`,
  );
  regieUrl = $derived(
    `${this.origin}/salon/regie?code=${this.code}&key=${this.key}`,
  );

  constructor(sb) {
    this.#sb = sb;
  }

  send = (ev, payload) => this.socket?.emit(ev, payload);
  // Fonction Pro : en gratuit, on montre l'offre au lieu d'envoyer
  gate = (feature, fn) => (this.pro ? fn() : (this.upsell = feature));
  setSetting = (patch) =>
    this.idle || this.pro
      ? this.send("salon_update_settings", patch)
      : (this.upsell = "liveSettings");

  flash(msg) {
    this.notice = msg;
    setTimeout(() => {
      if (this.notice === msg) this.notice = "";
    }, 4000);
  }

  copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      this.flash(`${what} copié.`);
    } catch {
      this.flash("Copie impossible.");
    }
  };

  mergeRoster(list) {
    const old = Object.fromEntries(this.players.map((p) => [p.username, p]));
    this.players = list
      .map((p) => ({ ...old[p.username], ...p }))
      .sort((a, b) => b.score - a.score);
  }

  applyScores(scores) {
    const m = Object.fromEntries(scores.map((s) => [s.username, s.score]));
    this.players = this.players
      .map((p) => ({ ...p, score: m[p.username] ?? p.score }))
      .sort((a, b) => b.score - a.score);
  }

  kick = (username) => {
    if (this.confirmKick !== username) {
      this.confirmKick = username;
      return;
    }
    this.send("salon_kick", { username });
    this.confirmKick = null;
  };

  setVolume = (v) => {
    if (!this.pro) {
      this.upsell = "volume";
      return;
    }
    this.volume = v;
    this.send("salon_volume", { volume: v });
  };

  openPlaylists = () => {
    this.pickerIds = [...(this.settings.playlistIds || [])];
    this.pickerOpen = true;
  };

  savePlaylists = async () => {
    this.saving = true;
    try {
      const d = await patchSalonPlaylists(this.#sb, this.code, this.pickerIds);
      this.pickerOpen = false;
      this.flash(`Nouvelle sélection : ${d.trackCount} titres.`);
    } catch (e) {
      this.flash(e.message);
    } finally {
      this.saving = false;
    }
  };

  async mount() {
    this.code =
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- lu une seule fois, pas un état
      new URLSearchParams(window.location.search).get("code")?.toUpperCase() ||
      "";
    if (!this.code) {
      this.error = "Code de salon manquant.";
      return;
    }
    this.key = takeSalonKeyFromUrl(this.code) || "";
    if (!this.key) {
      this.error =
        "Ce navigateur n'a pas la clé de ce salon. Ouvre le lien de régie donné à la création du salon.";
      return;
    }
    this.#connect();
    const {
      data: { session },
    } = await this.#sb.auth.getSession();
    this.userId = session?.user.id ?? null;
    this.allPlaylists = await loadSalonPlaylists(
      this.#sb,
      session?.user.id ?? null,
    ).catch(() => []);
  }

  #connect() {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    this.socket = socket;
    socket.on("connect", () =>
      this.send("salon_join_control", { code: this.code, key: this.key }),
    );
    this.chat.attach(socket);

    listenRegie(this, socket);
  }

  destroy() {
    this.socket?.disconnect();
  }
}
