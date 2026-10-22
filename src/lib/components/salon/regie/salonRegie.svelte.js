import { io } from "socket.io-client";
import { SupportChat } from "../support/supportChat.svelte.js";
import { loadSalonPlaylists } from "../../../data/salonPlaylists.js";
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

  #applyScores(scores) {
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

    socket.on("salon_control_joined", (d) => {
      this.ready = true;
      this.pro = d.pro;
      this.error = "";
      this.settings = d.settings;
      this.mergeRoster(d.players);
      this.teams = d.teams;
      this.phase = d.phase;
      this.paused = d.paused;
      this.round = d.currentRound;
      this.timerVal = d.timerVal;
      this.timerMax = d.timerMax;
      this.timerOn = d.timerActive;
      this.track = d.track;
      this.history = d.history;
      this.pickerIds = [...(d.settings.playlistIds || [])];
      this.chat.update(d.support);
    });

    socket.on("salon_roster", ({ players, teams }) => {
      this.mergeRoster(players);
      this.teams = teams;
    });
    socket.on("salon_settings", ({ settings }) => {
      this.settings = settings;
    });
    socket.on("salon_paused", ({ paused }) => {
      this.paused = paused;
    });
    socket.on("salon_game_starting", () => {
      this.phase = "starting";
      this.history = [];
    });
    socket.on("salon_round_start", (d) => {
      this.phase = "round";
      this.round = d.round;
      this.track = d.hostInfo;
      this.timerOn = false;
      this.timerVal = 0;
      this.players = this.players.map((p) => ({
        ...p,
        foundThisRound: false,
        answeredThisRound: false,
      }));
    });
    socket.on("salon_timer_started", ({ max }) => {
      this.timerVal = max;
      this.timerMax = max;
      this.timerOn = true;
    });
    socket.on("salon_timer_update", ({ current, max }) => {
      this.timerVal = current;
      this.timerMax = max;
      this.timerOn = true;
    });
    socket.on("salon_player_answered", ({ username, correct, answered }) => {
      this.players = this.players.map((p) =>
        p.username === username
          ? {
              ...p,
              answeredThisRound: answered === true || p.answeredThisRound,
              foundThisRound: correct ?? p.foundThisRound,
            }
          : p,
      );
    });
    socket.on("salon_scores_update", ({ scores, teams }) => {
      this.#applyScores(scores);
      if (teams) this.teams = teams;
    });
    socket.on("salon_round_end", (d) => {
      this.phase = "summary";
      this.timerOn = false;
      this.teams = d.teams;
      this.history = [...this.history, { answer: d.answer, cover: d.cover }];
      this.#applyScores(d.scores);
    });
    socket.on("salon_game_over", (d) => {
      this.phase = "gameover";
      this.teams = d.teams;
      this.track = null;
    });
    socket.on("salon_restarted", ({ players }) => {
      this.mergeRoster(players);
      this.history = [];
    });
    socket.on("salon_playlists_changed", ({ trackCount, appliedNow }) =>
      this.flash(
        `Playlist changée (${trackCount} titres), ${appliedNow ? "dès la manche suivante" : "pour la prochaine partie"}.`,
      ),
    );
    socket.on("salon_screens", ({ count }) => {
      this.screens = count;
    });
    socket.on("salon_pro_required", ({ feature }) => {
      this.upsell = feature;
    });
    socket.on("salon_pro", ({ pro }) => {
      this.pro = pro;
      this.upsell = null;
      this.flash("ZIK Pro activé pour ce salon.");
    });
    socket.on("salon_error", ({ message }) => {
      this.error = message;
    });
  }

  destroy() {
    this.socket?.disconnect();
  }
}
