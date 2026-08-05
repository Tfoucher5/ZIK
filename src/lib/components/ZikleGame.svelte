<script>
  import { getContext, onMount } from "svelte";
  import {
    MAX_ATTEMPTS,
    durationForAttempt,
    computeStreak,
    buildShareGrid,
  } from "$lib/zikle/shared.js";

  let { date, dayNumber, previewUrl } = $props();

  const _ctx = getContext("zik");
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  const STORAGE_KEY = "zikle_history"; // { [date]: { attempts: string[], won: boolean } }

  let audioEl;
  let query = $state("");
  let suggestions = $state([]);
  let attempts = $state([]); // track_id[] tentés
  let attemptLabels = $state([]); // "Artiste - Titre" affichés dans la grille des essais
  let finished = $state(false);
  let won = $state(false);
  let reveal = $state(null); // { artist, title, cover_url }
  let streak = $state(0);
  let startedAt = $state(0);
  let shareCopied = $state(false);
  let leaderboard = $state([]);
  let errorMsg = $state("");
  let authInitDone = false;

  function loadGuestHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveGuestResult(d, attemptIds, isWon) {
    const history = loadGuestHistory();
    history[d] = { attempts: attemptIds, won: isWon };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
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
        await fetchRevealAndLeaderboard(existing.guesses, existing.won);
      }
    }
    await computeAndSetStreak();
  }

  onMount(() => {
    startedAt = Date.now();
  });

  $effect(() => {
    if (!authReady || authInitDone) return;
    authInitDone = true;
    const isGuest = !user;
    initFromAuthState(isGuest);
  });

  let stopListener;
  function playSnippet() {
    if (!audioEl) return;
    if (stopListener) audioEl.removeEventListener("timeupdate", stopListener);
    const dur = durationForAttempt(attempts.length);
    audioEl.currentTime = 0;
    audioEl.play();
    stopListener = () => {
      if (audioEl.currentTime >= dur) {
        audioEl.pause();
        audioEl.removeEventListener("timeupdate", stopListener);
        stopListener = null;
      }
    };
    audioEl.addEventListener("timeupdate", stopListener);
  }

  let searchTimer;
  function onQueryInput() {
    clearTimeout(searchTimer);
    if (query.trim().length < 2) {
      suggestions = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(query.trim())}`);
      suggestions = res.ok ? await res.json() : [];
    }, 200);
  }

  async function authHeader() {
    if (!user) return {};
    const { data: session } = await sb.auth.getSession();
    const token = session?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
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
    attempts = [...attempts, track.id];
    attemptLabels = [...attemptLabels, `${track.artist} - ${track.title}`];
    query = "";
    suggestions = [];

    if (correct) {
      await endRound(true);
    } else if (attempts.length >= MAX_ATTEMPTS) {
      await endRound(false);
    }
  }

  async function skipAttempt() {
    if (finished) return;
    attempts = [...attempts, "__skip__"];
    attemptLabels = [...attemptLabels, "(passé)"];
    if (attempts.length >= MAX_ATTEMPTS) await endRound(false);
  }

  async function endRound(isWon) {
    finished = true;
    won = isWon;

    await fetchRevealAndLeaderboard(attempts, isWon);

    if (!user) saveGuestResult(date, attempts, isWon);
    await computeAndSetStreak();
  }

  async function share() {
    const text = buildShareGrid(dayNumber, attempts, won ? attempts.at(-1) : "", won);
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      shareCopied = true;
      setTimeout(() => (shareCopied = false), 2000);
    }
  }
</script>

<audio bind:this={audioEl} src={previewUrl} preload="auto"></audio>

{#if streak > 0}
  <p class="zikle-streak">🔥 Série : {streak} jour{streak > 1 ? "s" : ""}</p>
{/if}

{#if errorMsg}
  <p class="zikle-error">{errorMsg}</p>
{/if}

{#if !finished}
  <button onclick={playSnippet}>▶️ Écouter ({durationForAttempt(attempts.length)}s)</button>

  <div class="zikle-search">
    <input
      type="text"
      placeholder="Titre ou artiste..."
      bind:value={query}
      oninput={onQueryInput}
    />
    {#if suggestions.length}
      <ul class="zikle-suggestions">
        {#each suggestions as s (s.id)}
          <li>
            <button onclick={() => submitGuess(s)}>{s.artist} - {s.title}</button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <button onclick={skipAttempt}>Passer</button>

  <ol class="zikle-attempts">
    {#each attemptLabels as label}
      <li>❌ {label}</li>
    {/each}
  </ol>
  <p>{attempts.length} / {MAX_ATTEMPTS} essais</p>
{:else}
  <div class="zikle-result">
    {#if won}
      <p>🎉 Trouvé en {attempts.length} essai{attempts.length > 1 ? "s" : ""} !</p>
    {:else}
      <p>😢 Perdu — c'était :</p>
    {/if}
    {#if reveal}
      <p><strong>{reveal.artist} - {reveal.title}</strong></p>
      {#if reveal.cover_url}<img src={reveal.cover_url} alt="" width="120" />{/if}
    {/if}
    <button onclick={share}>Partager le résultat</button>
    {#if shareCopied}<span>Copié !</span>{/if}
    {#if leaderboard.length}
      <h2>Classement du jour</h2>
      <ol>
        {#each leaderboard as row}
          <li>{row.username} — {row.attempts} essai{row.attempts > 1 ? "s" : ""}{row.solve_time_seconds ? ` (${row.solve_time_seconds}s)` : ""}</li>
        {/each}
      </ol>
    {/if}
  </div>
{/if}
