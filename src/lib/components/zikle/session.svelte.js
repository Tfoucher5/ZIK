import {
  MAX_ATTEMPTS,
  SNIPPET_DURATIONS,
  durationForAttempt,
  computeStreak,
  buildShareGrid,
} from "$lib/shared/zikle/shared.js";
import { loadGuestHistory, saveGuestResult } from "./history.js";
import { SnippetPlayer } from "./player.svelte.js";

export const SKIP = "__skip__"; // marqueur d'un tour passé, stocké parmi les guesses
export const TOTAL = SNIPPET_DURATIONS[SNIPPET_DURATIONS.length - 1]; // 16s

// Les libellés ne sont pas stockés côté serveur (seuls les track_id le sont) :
// on les restaure depuis le localStorage quand ils existent, sinon on affiche
// au moins « Passé » pour les tours sautés.
function restoreLabels(attemptIds, saved) {
  return attemptIds.map((id, i) => (id === SKIP ? "" : (saved?.[i] ?? "")));
}

// Partie du jour : essais, résultat, série et classement.
export class ZikleSession {
  attempts = $state([]); // track_id[] tentés
  attemptLabels = $state([]); // "Artiste — Titre" par essai
  finished = $state(false);
  won = $state(false);
  reveal = $state(null); // { artist, title, cover_url }
  streak = $state(0);
  shareCopied = $state(false);
  leaderboard = $state([]);
  errorMsg = $state("");
  justUnlocked = $state(false);
  shakeRow = $state(-1);
  startedAt = 0;

  unlocked = $derived(
    this.finished ? TOTAL : durationForAttempt(this.attempts.length),
  );

  constructor(ctx, getProps) {
    this.ctx = ctx;
    this.getProps = getProps;
    this.player = new SnippetPlayer((msg) => (this.errorMsg = msg));
  }

  get date() {
    return this.getProps().date;
  }

  async authHeader() {
    if (!this.ctx.user) return {};
    const { data: session } = await this.ctx.sb.auth.getSession();
    const token = session?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async computeAndSetStreak() {
    if (this.ctx.user) {
      const { data: rows } = await this.ctx.sb
        .from("daily_results")
        .select("date, won")
        .order("date", { ascending: false })
        .limit(400);
      this.streak = computeStreak(rows || [], this.date);
    } else {
      const history = loadGuestHistory();
      const rows = Object.entries(history).map(([d, v]) => ({
        date: d,
        won: v.won,
      }));
      this.streak = computeStreak(rows, this.date);
    }
  }

  async fetchRevealAndLeaderboard(attemptIds, isWon) {
    const solveTime = Math.round((Date.now() - this.startedAt) / 1000);
    const res = await fetch("/api/zikle/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await this.authHeader()),
      },
      body: JSON.stringify({
        date: this.date,
        attempts: attemptIds.length,
        won: isWon,
        solve_time_seconds: solveTime,
        guesses: attemptIds,
      }),
    });
    if (!res.ok) {
      this.errorMsg =
        "Impossible de récupérer le résultat, réessaie plus tard.";
      return;
    }
    const payload = await res.json();
    this.reveal = payload.track;

    // Token nécessaire : c'est lui qui permet au serveur de marquer ta ligne
    // (is_me) et de la renvoyer même si tu es hors du top.
    const lbRes = await fetch(`/api/zikle/leaderboard?date=${this.date}`, {
      headers: await this.authHeader(),
    });
    this.leaderboard = lbRes.ok ? await lbRes.json() : [];
  }

  async #restore(attemptIds, isWon, savedLabels) {
    this.finished = true;
    this.won = isWon;
    this.attempts = attemptIds;
    this.attemptLabels = restoreLabels(attemptIds, savedLabels);
    await this.fetchRevealAndLeaderboard(attemptIds, isWon);
  }

  // À n'appeler qu'une fois authReady vrai : tant que le parent n'a pas résolu
  // la session (cf. (site)/+layout.svelte), `user` vaut toujours null même pour
  // un connecté, ce qui écraserait son état avec le localStorage invité.
  async init(isGuest) {
    if (isGuest) {
      const todays = loadGuestHistory()[this.date];
      if (todays)
        await this.#restore(todays.attempts, todays.won, todays.labels);
    } else {
      const { data: existing } = await this.ctx.sb
        .from("daily_results")
        .select("attempts, won, guesses")
        .eq("date", this.date)
        .maybeSingle();
      if (existing) await this.#restore(existing.guesses, existing.won, null);
    }
    await this.computeAndSetStreak();
  }

  #missed(rowIdx) {
    this.player.clear();
    this.shakeRow = rowIdx;
    setTimeout(() => (this.shakeRow = -1), 500);
    this.justUnlocked = true;
    setTimeout(() => (this.justUnlocked = false), 900);
  }

  // Renvoie true si l'essai a été compté (la saisie peut alors être vidée).
  async submitGuess(track) {
    if (this.finished) return false;
    this.errorMsg = "";
    const res = await fetch("/api/zikle/guess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await this.authHeader()),
      },
      body: JSON.stringify({ date: this.date, track_id: track.id }),
    });
    if (!res.ok) {
      this.errorMsg =
        "Erreur serveur, cet essai n'a pas été compté — réessaie.";
      return false;
    }
    const { correct } = await res.json();
    const rowIdx = this.attempts.length;
    this.attempts = [...this.attempts, track.id];
    this.attemptLabels = [
      ...this.attemptLabels,
      `${track.artist} — ${track.title}`,
    ];

    if (correct) {
      await this.endRound(true);
    } else if (this.attempts.length >= MAX_ATTEMPTS) {
      await this.endRound(false);
    } else {
      this.#missed(rowIdx);
    }
    return true;
  }

  skipAttempt = async () => {
    if (this.finished) return;
    const rowIdx = this.attempts.length;
    this.attempts = [...this.attempts, SKIP];
    this.attemptLabels = [...this.attemptLabels, ""];
    if (this.attempts.length >= MAX_ATTEMPTS) {
      await this.endRound(false);
    } else {
      this.#missed(rowIdx);
    }
  };

  async endRound(isWon) {
    this.player.clear();
    this.finished = true;
    this.won = isWon;
    await this.fetchRevealAndLeaderboard(this.attempts, isWon);
    if (!this.ctx.user)
      saveGuestResult(this.date, this.attempts, isWon, this.attemptLabels);
    await this.computeAndSetStreak();
  }

  share = async () => {
    const text = buildShareGrid(
      this.getProps().dayNumber,
      this.attempts,
      this.won ? this.attempts.at(-1) : "",
      this.won,
      { streak: this.streak },
    );
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* partage annulé par l'utilisateur */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.shareCopied = true;
      setTimeout(() => (this.shareCopied = false), 2000);
    } catch {
      this.errorMsg = "Copie impossible sur ce navigateur.";
    }
  };
}
