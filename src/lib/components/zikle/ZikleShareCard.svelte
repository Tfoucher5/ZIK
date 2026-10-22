<script>
  import { durationForAttempt, buildShareSquares } from "$lib/shared/zikle/shared.js";
  import { scoreLabel } from "./history.js";
  import { TOTAL } from "./session.svelte.js";

  let { dayNumber, attempts, won, streak } = $props();

  const shareSquares = $derived(buildShareSquares(attempts, won ? attempts.at(-1) : "", won));
</script>

<!-- Aperçu de ce qui sera partagé : on voit sa performance avant d'envoyer. -->
<div class="zk-card">
  <div class="zk-card-head">
    <span class="zk-card-title">Zikle <b>#{dayNumber}</b></span>
    <span class="zk-card-score" class:zk-card-score-win={won}>
      {scoreLabel(won, attempts.length)}
    </span>
  </div>
  <div class="zk-card-squares">
    {#each shareSquares as sq, i (i)}
      <span style="--i: {i}">{sq}</span>
    {/each}
  </div>
  <p class="zk-card-line">
    {won
      ? `Trouvé en ${durationForAttempt(attempts.length - 1)}s d'extrait`
      : `Pas trouvé en ${TOTAL}s`}
    {#if streak > 1}<span class="zk-card-streak">· Série de {streak} jours</span>{/if}
  </p>
</div>

<style>
  .zk-card {
    padding: 16px 18px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    animation: zk-in 0.5s 0.18s ease both;
  }
  .zk-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .zk-card-title {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-card-title b {
    font-family: var(--zk-mono);
    letter-spacing: 0;
    color: var(--text);
  }
  .zk-card-score {
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.94rem;
    color: var(--danger);
  }
  .zk-card-score-win {
    color: var(--accent);
  }
  .zk-card-squares {
    display: flex;
    gap: 6px;
    font-size: clamp(1.2rem, 4.6vw, 1.6rem);
    line-height: 1;
    margin-bottom: 10px;
  }
  .zk-card-squares span {
    animation: zk-sq 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.25s + var(--i) * 0.07s);
  }
  .zk-card-line {
    margin: 0;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .zk-card-streak {
    color: var(--accent);
  }
  @keyframes zk-sq {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.6);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-card,
    .zk-card-squares span {
      animation: none !important;
    }
  }
</style>
