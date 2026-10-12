<script>
  import { getContext, onMount } from "svelte";
  import NotifyPrompt from "$lib/components/notify/NotifyPrompt.svelte";
  import { ZikleSession } from "./session.svelte.js";
  import ZikleHeader from "./ZikleHeader.svelte";
  import ZikleRows from "./ZikleRows.svelte";
  import ZikleWave from "./ZikleWave.svelte";
  import ZiklePlayButton from "./ZiklePlayButton.svelte";
  import ZikleVolume from "./ZikleVolume.svelte";
  import ZikleSearch from "./ZikleSearch.svelte";
  import ZikleResult from "./ZikleResult.svelte";
  import ZikleShareCard from "./ZikleShareCard.svelte";
  import ZikleLeaderboard from "./ZikleLeaderboard.svelte";

  let props = $props();

  const ctx = getContext("zik");
  const game = new ZikleSession(ctx, () => props);
  const player = game.player;
  let authInitDone = false;

  onMount(() => {
    game.startedAt = Date.now();
    player.loadVolume();
    return () => player.clear();
  });

  $effect(() => {
    if (!ctx.authReady || authInitDone) return;
    authInitDone = true;
    game.init(!ctx.user);
  });

  // S'applique aussi quand l'element audio arrive après coup.
  $effect(() => {
    if (player.el) player.el.volume = player.muted ? 0 : player.volume;
  });
</script>

<audio
  bind:this={player.el}
  src={props.previewUrl}
  preload="auto"
  onplay={player.onAudioPlay}
  onerror={player.onAudioError}
></audio>

<section class="zk">
  <ZikleHeader
    dayNumber={props.dayNumber}
    streak={game.streak}
    showRules={!game.finished && game.attempts.length === 0}
  />

  <ZikleRows
    attempts={game.attempts}
    labels={game.attemptLabels}
    finished={game.finished}
    won={game.won}
    shakeRow={game.shakeRow}
  />

  <ZikleWave
    date={props.date}
    unlocked={game.unlocked}
    playing={player.playing}
    progress={player.progress}
    justUnlocked={game.justUnlocked}
  />

  {#if game.errorMsg}
    <p class="zk-error" role="alert">{game.errorMsg}</p>
  {/if}

  {#if !game.finished}
    <ZiklePlayButton
      playing={player.playing}
      unlocked={game.unlocked}
      onclick={() => player.play(game.unlocked)}
    />
    <ZikleVolume {player} />
    <ZikleSearch onGuess={(track) => game.submitGuess(track)} onSkip={game.skipAttempt} />

    <p class="zk-source">
      Les titres sont tirés du top Deezer — que des morceaux qui ont marché.
      <a href="/docs#zikle">Comment ça marche</a>
    </p>
  {:else}
    <ZikleResult
      reveal={game.reveal}
      won={game.won}
      attempts={game.attempts.length}
      shareCopied={game.shareCopied}
      onShare={game.share}
    />

    <NotifyPrompt
      categories={["zikle"]}
      title="Ne rate plus le Zikle"
      text="Un petit rappel vers 18 h les jours où tu n'as pas encore joué. Ta série ne s'arrêtera plus par oubli."
    />

    <ZikleShareCard
      dayNumber={props.dayNumber}
      attempts={game.attempts}
      won={game.won}
      streak={game.streak}
    />

    {#if game.leaderboard.length}
      <ZikleLeaderboard leaderboard={game.leaderboard} />
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

  .zk-source {
    margin: 0;
    text-align: center;
    font-size: 0.74rem;
    line-height: 1.5;
    color: var(--dim);
    animation: zk-in 0.5s 0.6s ease both;
  }
  .zk-source a {
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    transition: color 0.15s;
  }
  .zk-source a:hover {
    color: var(--accent);
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

  /* Global : partagée par tous les composants de la scène Zikle. */
  @keyframes -global-zk-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-error {
      animation: none !important;
    }
  }
</style>
