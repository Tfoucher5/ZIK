<script>
  import { getContext, onMount } from "svelte";
  import {
    MAX_ATTEMPTS,
    SNIPPET_DURATIONS,
    durationForAttempt,
    computeStreak,
    buildShareGrid,
    waveformForDate,
  } from "$lib/zikle/shared.js";

  let { date, dayNumber, previewUrl } = $props();

  const _ctx = getContext("zik");
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  const STORAGE_KEY = "zikle_history"; // { [date]: { attempts: string[], won: boolean } }
  const TOTAL = SNIPPET_DURATIONS[SNIPPET_DURATIONS.length - 1]; // 16s
  const BARS = 72;
  const rowIndices = Array.from({ length: MAX_ATTEMPTS }, (_, i) => i);

  const bars = waveformForDate(date, BARS);

  let audioEl;
  let query = $state("");
  let suggestions = $state([]);
  let highlighted = $state(-1);
  let attempts = $state([]); // track_id[] tentés
  let attemptLabels = $state([]); // "Artiste — Titre" par essai
  let finished = $state(false);
  let won = $state(false);
  let reveal = $state(null); // { artist, title, cover_url }
  let streak = $state(0);
  let startedAt = $state(0);
  let shareCopied = $state(false);
  let leaderboard = $state([]);
  let errorMsg = $state("");
  let playing = $state(false);
  let progress = $state(0); // 0..1 sur la fenêtre débloquée
  let justUnlocked = $state(false);
  let shakeRow = $state(-1);
  let authInitDone = false;

  const unlocked = $derived(finished ? TOTAL : durationForAttempt(attempts.length));
  const unlockedRatio = $derived(unlocked / TOTAL);

  function loadGuestHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveGuestResult(d, attemptIds, isWon) {
    const history = loadGuestHistory();
    history[d] = { attempts: attemptIds, won: isWon, labels: attemptLabels };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  // Les libellés ne sont pas stockés côté serveur (seuls les track_id le sont) :
  // on les restaure depuis le localStorage quand ils existent, sinon on affiche
  // au moins « Passé » pour les tours sautés.
  function restoreLabels(attemptIds, saved) {
    return attemptIds.map(
      (id, i) => saved?.[i] || (id === "__skip__" ? "Passé" : "Essai joué"),
    );
  }

  async function computeAndSetStreak() {
    if (user) {
      const { data: rows } = await sb
        .from("daily_results")
        .select("date, won")
        .order("date", { ascending: false })
        .limit(400);
      streak = computeStreak(rows || [], date);
    } else {
      const history = loadGuestHistory();
      const rows = Object.entries(history).map(([d, v]) => ({ date: d, won: v.won }));
      streak = computeStreak(rows, date);
    }
  }

  async function fetchRevealAndLeaderboard(attemptIds, isWon) {
    const solveTime = Math.round((Date.now() - startedAt) / 1000);
    const res = await fetch("/api/zikle/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        date,
        attempts: attemptIds.length,
        won: isWon,
        solve_time_seconds: solveTime,
        guesses: attemptIds,
      }),
    });
    if (!res.ok) {
      errorMsg = "Impossible de récupérer le résultat, réessaie plus tard.";
      return;
    }
    const payload = await res.json();
    reveal = payload.track;

    const lbRes = await fetch(`/api/zikle/leaderboard?date=${date}`);
    leaderboard = lbRes.ok ? await lbRes.json() : [];
  }

  // Ne décide invité vs connecté qu'une fois authReady vrai : tant que le parent
  // n'a pas résolu la session (cf. (site)/+layout.svelte), `user` vaut toujours
  // null même pour un connecté, ce qui écraserait son état avec le localStorage invité.
  async function initFromAuthState(isGuest) {
    if (isGuest) {
      const history = loadGuestHistory();
      const todays = history[date];
      if (todays) {
        finished = true;
        won = todays.won;
        attempts = todays.attempts;
        attemptLabels = restoreLabels(todays.attempts, todays.labels);
        await fetchRevealAndLeaderboard(todays.attempts, todays.won);
      }
    } else {
      const { data: existing } = await sb
        .from("daily_results")
        .select("attempts, won, guesses")
        .eq("date", date)
        .maybeSingle();
      if (existing) {
        finished = true;
        won = existing.won;
        attempts = existing.guesses;
        attemptLabels = restoreLabels(existing.guesses, null);
        await fetchRevealAndLeaderboard(existing.guesses, existing.won);
      }
    }
    await computeAndSetStreak();
  }

  onMount(() => {
    startedAt = Date.now();
    return () => clearPlayback();
  });

  $effect(() => {
    if (!authReady || authInitDone) return;
    authInitDone = true;
    initFromAuthState(!user);
  });

  // ── Lecture audio ──────────────────────────────────────────────────────────
  let rafId;
  let stopTimer;

  function clearPlayback() {
    cancelAnimationFrame(rafId);
    clearTimeout(stopTimer);
    rafId = null;
    stopTimer = null;
    playing = false;
  }

  function tick(dur) {
    if (!audioEl) return;
    progress = Math.min(1, audioEl.currentTime / dur);
    if (audioEl.currentTime >= dur) {
      audioEl.pause();
      clearPlayback();
      progress = 0;
      return;
    }
    rafId = requestAnimationFrame(() => tick(dur));
  }

  function playSnippet() {
    if (!audioEl || playing) return;
    clearPlayback();
    errorMsg = "";
    const dur = unlocked;
    audioEl.currentTime = 0;
    playing = true;
    progress = 0;
    audioEl.play().catch(() => {
      playing = false;
      errorMsg = "Lecture impossible, réessaie.";
    });
    rafId = requestAnimationFrame(() => tick(dur));
    // Filet de sécurité si requestAnimationFrame est throttlé (onglet en arrière-plan).
    stopTimer = setTimeout(() => {
      if (!audioEl) return;
      audioEl.pause();
      clearPlayback();
      progress = 0;
    }, dur * 1000 + 250);
  }

  function onAudioError() {
    clearPlayback();
    errorMsg = "Cet extrait n'a pas pu être chargé, réessaie plus tard.";
  }

  // ── Recherche ──────────────────────────────────────────────────────────────
  let searchTimer;
  function onQueryInput() {
    clearTimeout(searchTimer);
    highlighted = -1;
    if (query.trim().length < 2) {
      suggestions = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(query.trim())}`);
      suggestions = res.ok ? await res.json() : [];
    }, 200);
  }

  function onQueryKeydown(e) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlighted = (highlighted + 1) % suggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = highlighted <= 0 ? suggestions.length - 1 : highlighted - 1;
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      submitGuess(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      suggestions = [];
      highlighted = -1;
    }
  }

  async function authHeader() {
    if (!user) return {};
    const { data: session } = await sb.auth.getSession();
    const token = session?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function flashUnlock() {
    justUnlocked = true;
    setTimeout(() => (justUnlocked = false), 900);
  }

  async function submitGuess(track) {
    if (finished) return;
    errorMsg = "";
    const res = await fetch("/api/zikle/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ date, track_id: track.id }),
    });
    if (!res.ok) {
      errorMsg = "Erreur serveur, cet essai n'a pas été compté — réessaie.";
      return;
    }
    const { correct } = await res.json();
    const rowIdx = attempts.length;
    attempts = [...attempts, track.id];
    attemptLabels = [...attemptLabels, `${track.artist} — ${track.title}`];
    query = "";
    suggestions = [];
    highlighted = -1;

    if (correct) {
      await endRound(true);
    } else if (attempts.length >= MAX_ATTEMPTS) {
      await endRound(false);
    } else {
      clearPlayback();
      shakeRow = rowIdx;
      setTimeout(() => (shakeRow = -1), 500);
      flashUnlock();
    }
  }

  async function skipAttempt() {
    if (finished) return;
    const rowIdx = attempts.length;
    attempts = [...attempts, "__skip__"];
    attemptLabels = [...attemptLabels, "Passé"];
    if (attempts.length >= MAX_ATTEMPTS) {
      await endRound(false);
    } else {
      clearPlayback();
      shakeRow = rowIdx;
      setTimeout(() => (shakeRow = -1), 500);
      flashUnlock();
    }
  }

  async function endRound(isWon) {
    clearPlayback();
    finished = true;
    won = isWon;
    await fetchRevealAndLeaderboard(attempts, isWon);
    if (!user) saveGuestResult(date, attempts, isWon);
    await computeAndSetStreak();
  }

  async function share() {
    const text = buildShareGrid(dayNumber, attempts, won ? attempts.at(-1) : "", won);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* partage annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      shareCopied = true;
      setTimeout(() => (shareCopied = false), 2000);
    } catch {
      errorMsg = "Copie impossible sur ce navigateur.";
    }
  }

  function fmtTime(s) {
    return `0:${String(Math.round(s)).padStart(2, "0")}`;
  }
</script>

<audio bind:this={audioEl} src={previewUrl} preload="auto" onerror={onAudioError}></audio>

<section class="zk">
  <!-- Bandeau d'en-tête : numéro du jour + série -->
  <div class="zk-head">
    <span class="zk-eyebrow">Zikle <b>#{dayNumber}</b></span>
    <span class="zk-rule" aria-hidden="true"></span>
    {#if streak > 0}
      <span class="zk-streak">Série <b>{streak}</b></span>
    {/if}
  </div>

  <!-- Grille des essais -->
  <ol class="zk-rows">
    {#each rowIndices as i (i)}
      {@const filled = i < attempts.length}
      {@const isWin = finished && won && i === attempts.length - 1}
      {@const isCurrent = i === attempts.length && !finished}
      <li
        class="zk-row"
        class:zk-row-filled={filled && !isWin}
        class:zk-row-win={isWin}
        class:zk-row-current={isCurrent}
        class:zk-row-shake={shakeRow === i}
        style="--i: {i}"
      >
        <span class="zk-row-n">{i + 1}</span>
        <span class="zk-row-label">
          {#if filled}{attemptLabels[i] || "—"}{/if}
        </span>
        <span class="zk-row-mark" aria-hidden="true">
          {#if isWin}✓{:else if filled}✕{/if}
        </span>
      </li>
    {/each}
  </ol>

  <!-- Signature : la forme d'onde qui se déverrouille -->
  <div class="zk-wave-block">
    <div class="zk-wave" class:zk-wave-unlocking={justUnlocked} class:zk-wave-live={playing}>
      {#each bars as h, i (i)}
        {@const pos = i / BARS}
        <span
          class="zk-bar"
          class:zk-bar-on={pos < unlockedRatio}
          class:zk-bar-played={playing && pos < unlockedRatio * progress}
          style="--h: {h}; --i: {i}"
        ></span>
      {/each}
      {#if playing}
        <span class="zk-playhead" style="left: {unlockedRatio * progress * 100}%"></span>
      {/if}
      <span class="zk-wave-edge" style="left: {unlockedRatio * 100}%" aria-hidden="true"></span>
    </div>
    <div class="zk-wave-scale">
      <span>{fmtTime(0)}</span>
      <span class="zk-wave-now">{fmtTime(unlocked)} débloqué</span>
      <span>{fmtTime(TOTAL)}</span>
    </div>
  </div>

  {#if errorMsg}
    <p class="zk-error" role="alert">{errorMsg}</p>
  {/if}

  {#if !finished}
    <!-- Lecture -->
    <button class="zk-play" onclick={playSnippet} disabled={playing}>
      <span class="zk-play-ico" aria-hidden="true">
        {#if playing}
          <span class="zk-eq"><i></i><i></i><i></i><i></i></span>
        {:else}
          <span class="zk-tri"></span>
        {/if}
      </span>
      <span class="zk-play-txt">{playing ? "Lecture" : "Écouter"}</span>
      <span class="zk-play-dur">{unlocked}s</span>
    </button>

    <!-- Saisie -->
    <div class="zk-input-row">
      <div class="zk-search">
        <input
          class="zk-search-input"
          type="text"
          placeholder="Titre ou artiste…"
          autocomplete="off"
          bind:value={query}
          oninput={onQueryInput}
          onkeydown={onQueryKeydown}
        />
        {#if suggestions.length}
          <ul class="zk-suggestions">
            {#each suggestions as s, i (s.id)}
              <li>
                <button class:zk-sug-on={i === highlighted} onclick={() => submitGuess(s)}>
                  <span class="zk-sug-artist">{s.artist}</span>
                  <span class="zk-sug-title">{s.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      <button class="zk-skip" onclick={skipAttempt}>Passer</button>
    </div>
  {:else}
    <!-- Résultat -->
    <div class="zk-result">
      <div class="zk-result-art">
        {#if reveal?.cover_url}
          <img src={reveal.cover_url} alt="" />
        {/if}
        <span class="zk-result-badge" class:zk-badge-win={won}>
          {won ? `${attempts.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}
        </span>
      </div>
      <div class="zk-result-txt">
        <p class="zk-result-kicker">{won ? "Trouvé" : "Raté"}</p>
        {#if reveal}
          <p class="zk-result-artist">{reveal.artist}</p>
          <h2 class="zk-result-title">{reveal.title}</h2>
        {/if}
        <div class="zk-result-actions">
          <button class="zk-share" onclick={share}>
            {shareCopied ? "Copié !" : "Partager"}
          </button>
          <a class="zk-archives" href="/zikle/archives">Archives</a>
        </div>
      </div>
    </div>

    {#if leaderboard.length}
      <div class="zk-lb">
        <h3 class="zk-lb-title">Classement du jour</h3>
        <ol class="zk-lb-list">
          {#each leaderboard.slice(0, 5) as row, i (row.username)}
            <li>
              <span class="zk-lb-rank">{i + 1}</span>
              <span class="zk-lb-name">{row.username}</span>
              <span class="zk-lb-score">{row.attempts}/{MAX_ATTEMPTS}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  {/if}
</section>

<style>
  /* ═══ Scène ═══════════════════════════════════════════════════════════════
     DA brutalist magenta : Barlow Condensed 900 capitales, angles nets,
     bordures plutôt qu'ombres, JetBrains Mono pour les chiffres.
     Signature : la forme d'onde qui se déverrouille = la mécanique visible. */
  .zk {
    --zk-cond: "Barlow Condensed", sans-serif;
    --zk-mono: "JetBrains Mono", ui-monospace, monospace;
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: min(860px, 92vw);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(14px, 2.6vh, 26px);
    padding: 0 20px;
  }

  /* ── En-tête ── */
  .zk-head {
    display: flex;
    align-items: center;
    gap: 14px;
    animation: zk-in 0.5s ease both;
  }
  .zk-eyebrow,
  .zk-streak {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dim);
    white-space: nowrap;
  }
  .zk-eyebrow b,
  .zk-streak b {
    font-family: var(--zk-mono);
    font-weight: 700;
    letter-spacing: 0;
    color: var(--accent);
  }
  .zk-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--border2), transparent);
  }

  /* ── Grille des essais ── */
  .zk-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .zk-row {
    display: grid;
    grid-template-columns: 30px 1fr 26px;
    align-items: center;
    gap: 10px;
    height: clamp(38px, 6vh, 52px);
    padding: 0 16px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
    animation: zk-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.05s + var(--i) * 0.045s);
    transition:
      background 0.25s,
      border-color 0.25s;
  }
  .zk-row-n {
    font-family: var(--zk-mono);
    font-size: 0.72rem;
    color: var(--dim);
  }
  .zk-row-label {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mid);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .zk-row-mark {
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.9rem;
    text-align: right;
  }

  .zk-row-current {
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.05);
    animation:
      zk-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both,
      zk-breathe 2.4s ease-in-out 0.6s infinite;
  }
  .zk-row-filled {
    border-left-color: var(--danger);
    background: rgb(var(--c-glass) / 0.05);
  }
  .zk-row-filled .zk-row-label {
    color: var(--text);
  }
  .zk-row-filled .zk-row-mark {
    color: var(--danger);
  }
  .zk-row-win {
    border-color: var(--accent);
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.25);
  }
  .zk-row-win .zk-row-label {
    color: var(--text);
  }
  .zk-row-win .zk-row-mark {
    color: var(--accent);
  }
  .zk-row-shake {
    animation: zk-shake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  /* ── Signature : forme d'onde ── */
  .zk-wave-block {
    display: flex;
    flex-direction: column;
    gap: 7px;
    animation: zk-in 0.5s 0.35s ease both;
  }
  .zk-wave {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    height: clamp(66px, 12vh, 118px);
    padding: 0 3px;
    background: rgb(var(--c-glass) / 0.02);
    border: 1px solid var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .zk-bar {
    flex: 1;
    min-width: 0;
    height: calc(var(--h) * 100%);
    background: rgb(var(--c-glass) / 0.11);
    border-radius: 1px;
    transform-origin: center;
    animation: zk-grow 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.4s + var(--i) * 0.006s);
    transition:
      background 0.35s,
      box-shadow 0.35s;
  }
  .zk-bar-on {
    background: rgb(var(--accent-rgb) / 0.55);
  }
  .zk-bar-played {
    background: var(--accent);
    box-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.7);
  }
  /* Danse des barres pendant la lecture : uniquement la zone débloquée. */
  .zk-wave-live .zk-bar-on {
    animation: zk-dance 0.62s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -0.045s);
  }
  .zk-wave-unlocking .zk-bar-on {
    animation: zk-unlock 0.9s ease both;
    animation-delay: calc(var(--i) * 0.008s);
  }

  .zk-playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--text);
    box-shadow: 0 0 12px rgb(var(--c-glass) / 0.8);
    pointer-events: none;
  }
  .zk-wave-edge {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: repeating-linear-gradient(
      to bottom,
      rgb(var(--accent-rgb) / 0.7) 0 4px,
      transparent 4px 8px
    );
    pointer-events: none;
    transition: left 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .zk-wave-scale {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--zk-mono);
    font-size: 0.62rem;
    color: var(--dim);
  }
  .zk-wave-now {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }

  /* ── Bouton lecture ── */
  .zk-play {
    -webkit-appearance: none;
    appearance: none;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 0;
    height: clamp(54px, 8.4vh, 74px);
    background: var(--accent);
    border: none;
    color: var(--on-accent);
    cursor: pointer;
    font-family: var(--zk-cond);
    text-align: left;
    animation: zk-in 0.5s 0.45s ease both;
    transition:
      filter 0.15s,
      transform 0.1s,
      box-shadow 0.2s;
    box-shadow: 0 6px 30px rgb(var(--accent-rgb) / 0.32);
  }
  .zk-play:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 8px 38px rgb(var(--accent-rgb) / 0.5);
  }
  .zk-play:active:not(:disabled) {
    transform: translateY(1px);
  }
  .zk-play:disabled {
    cursor: default;
  }
  .zk-play-ico {
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(54px, 8.4vh, 74px);
    align-self: stretch;
    background: rgb(0 0 0 / 0.16);
    flex-shrink: 0;
  }
  .zk-tri {
    width: 0;
    height: 0;
    margin-left: 3px;
    border-style: solid;
    border-width: 8px 0 8px 13px;
    border-color: transparent transparent transparent var(--on-accent);
  }
  .zk-eq {
    display: flex;
    align-items: flex-end;
    gap: 2.5px;
    height: 17px;
  }
  .zk-eq i {
    display: block;
    width: 3px;
    height: 100%;
    background: var(--on-accent);
    transform-origin: bottom;
    animation: zk-eq 0.62s ease-in-out infinite;
  }
  .zk-eq i:nth-child(1) {
    animation-delay: -0.5s;
  }
  .zk-eq i:nth-child(2) {
    animation-delay: -0.22s;
  }
  .zk-eq i:nth-child(3) {
    animation-delay: -0.37s;
  }
  .zk-eq i:nth-child(4) {
    animation-delay: -0.06s;
  }
  .zk-play-txt {
    flex: 1;
    font-weight: 900;
    font-size: 1.02rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .zk-play-dur {
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.86rem;
    padding-right: 18px;
    opacity: 0.72;
  }

  /* ── Saisie ── */
  .zk-input-row {
    display: flex;
    gap: 8px;
    animation: zk-in 0.5s 0.55s ease both;
  }
  .zk-search {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .zk-search-input {
    width: 100%;
    height: clamp(46px, 6.6vh, 56px);
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 2px;
    padding: 0 16px;
    color: var(--text);
    font-family: "Barlow", sans-serif;
    font-size: 0.92rem;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .zk-search-input::placeholder {
    color: var(--dim);
  }
  .zk-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.14);
  }

  .zk-suggestions {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 30;
    list-style: none;
    margin: 0;
    padding: 4px;
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 2px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
    max-height: 250px;
    overflow-y: auto;
    animation: zk-in 0.18s ease both;
  }
  .zk-suggestions button {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-left: 2px solid transparent;
    color: var(--text);
    padding: 8px 12px;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .zk-suggestions button:hover,
  .zk-suggestions button.zk-sug-on {
    background: rgb(var(--accent-rgb) / 0.09);
    border-left-color: var(--accent);
  }
  .zk-sug-artist {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-sug-title {
    font-size: 0.88rem;
    color: var(--text);
  }

  .zk-skip {
    -webkit-appearance: none;
    appearance: none;
    height: clamp(46px, 6.6vh, 56px);
    padding: 0 26px;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 2px;
    color: var(--mid);
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.76rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .zk-skip:hover {
    background: rgb(var(--c-glass) / 0.06);
    color: var(--text);
    border-color: var(--text);
  }

  .zk-error {
    margin: 0;
    padding: 9px 14px;
    background: rgb(248 113 113 / 0.1);
    border-left: 3px solid var(--danger);
    color: var(--danger);
    font-size: 0.84rem;
    animation: zk-in 0.3s ease both;
  }

  /* ── Résultat ── */
  .zk-result {
    display: flex;
    gap: 22px;
    align-items: stretch;
    padding: 18px;
    background: var(--bg2);
    border: 1px solid var(--border2);
    animation: zk-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .zk-result-art {
    position: relative;
    width: clamp(100px, 24vw, 168px);
    aspect-ratio: 1;
    flex-shrink: 0;
    background: #0a0a0a;
    overflow: hidden;
  }
  .zk-result-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    animation: zk-reveal-art 0.7s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .zk-result-badge {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 3px 8px;
    background: var(--danger);
    color: #000;
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.74rem;
  }
  .zk-badge-win {
    background: var(--accent);
    color: var(--on-accent);
  }
  .zk-result-txt {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .zk-result-kicker {
    margin: 0 0 5px;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-result-artist {
    margin: 0;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .zk-result-title {
    margin: 0 0 16px;
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: clamp(1.7rem, 6.4vw, 3.2rem);
    line-height: 0.94;
    letter-spacing: -0.015em;
    text-transform: uppercase;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .zk-result-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .zk-result-actions .zk-share {
    flex: 1;
    min-width: 150px;
    padding: 12px 20px;
  }
  .zk-share {
    -webkit-appearance: none;
    appearance: none;
    padding: 9px 20px;
    background: var(--accent);
    border: none;
    border-radius: 2px;
    color: var(--on-accent);
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: 0.76rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      filter 0.15s,
      box-shadow 0.2s;
    box-shadow: 0 4px 20px rgb(var(--accent-rgb) / 0.3);
  }
  .zk-share:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 26px rgb(var(--accent-rgb) / 0.45);
  }
  .zk-archives {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .zk-archives:hover {
    color: var(--accent);
  }

  /* ── Classement ── */
  .zk-lb {
    animation: zk-in 0.5s 0.2s ease both;
  }
  .zk-lb-title {
    margin: 0 0 8px;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-lb-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .zk-lb-list li {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
  }
  .zk-lb-rank,
  .zk-lb-score {
    font-family: var(--zk-mono);
    font-size: 0.74rem;
    color: var(--dim);
  }
  .zk-lb-name {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ═══ Animations ═══ */
  @keyframes zk-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes zk-slide {
    from {
      opacity: 0;
      transform: translateX(-14px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes zk-grow {
    from {
      transform: scaleY(0.04);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
  @keyframes zk-pop {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes zk-reveal-art {
    from {
      opacity: 0;
      transform: scale(1.25);
      filter: blur(14px);
    }
    to {
      opacity: 1;
      transform: scale(1);
      filter: blur(0);
    }
  }
  @keyframes zk-breathe {
    0%,
    100% {
      background: rgb(var(--accent-rgb) / 0.05);
    }
    50% {
      background: rgb(var(--accent-rgb) / 0.12);
    }
  }
  @keyframes zk-shake {
    10%,
    90% {
      transform: translateX(-2px);
    }
    20%,
    80% {
      transform: translateX(4px);
    }
    30%,
    50%,
    70% {
      transform: translateX(-6px);
    }
    40%,
    60% {
      transform: translateX(6px);
    }
  }
  @keyframes zk-dance {
    from {
      transform: scaleY(0.72);
    }
    to {
      transform: scaleY(1.18);
    }
  }
  @keyframes zk-unlock {
    0% {
      background: var(--text);
      box-shadow: 0 0 18px rgb(var(--c-glass) / 0.9);
    }
    100% {
      background: rgb(var(--accent-rgb) / 0.55);
      box-shadow: none;
    }
  }
  @keyframes zk-eq {
    0%,
    100% {
      transform: scaleY(0.35);
    }
    50% {
      transform: scaleY(1);
    }
  }

  @media (max-width: 560px) {
    .zk-result {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    .zk-result-art {
      width: 100%;
      aspect-ratio: 16 / 9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-head,
    .zk-row,
    .zk-bar,
    .zk-wave-block,
    .zk-play,
    .zk-input-row,
    .zk-suggestions,
    .zk-result,
    .zk-result-art img,
    .zk-lb,
    .zk-error,
    .zk-eq i,
    .zk-wave-live .zk-bar-on,
    .zk-wave-unlocking .zk-bar-on,
    .zk-row-current,
    .zk-row-shake {
      animation: none !important;
    }
  }
</style>
