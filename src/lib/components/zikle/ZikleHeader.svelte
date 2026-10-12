<script>
  let { dayNumber, streak, showRules } = $props();
</script>

<!-- Bandeau d'en-tête : numéro du jour + série -->
<div class="zk-head">
  <span class="zk-eyebrow">Zikle <b>#{dayNumber}</b></span>
  <span class="zk-rule" aria-hidden="true"></span>
  {#if streak > 0}
    <span class="zk-streak">Série <b>{streak}</b></span>
  {/if}
</div>
{#if showRules}
  <p class="zk-rules">
    Écoute l'extrait et trouve la chanson du jour en 6 essais.
    Chaque essai raté ou passé débloque un peu plus de musique.
  </p>
{/if}

<style>
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

  .zk-rules {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--mid);
    animation: zk-in 0.5s ease both;
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-head {
      animation: none !important;
    }
  }
</style>
