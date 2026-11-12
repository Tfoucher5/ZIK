<script>
  /** Décompte plein écran avant la première manche (TV et téléphones). */
  let { sec = 0 } = $props();
</script>

{#if sec > 0}
  <div class="start-cd" role="status" aria-live="assertive">
    <p class="sx-kicker">La partie commence</p>
    {#key sec}<b>{sec}</b>{/key}
  </div>
{/if}

<style>
  .start-cd {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgb(0 0 0 / 0.95);
    text-align: center;
  }
  .start-cd p {
    font-size: clamp(1.2rem, 3vw, 2.4rem);
  }
  b {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(8rem, 30vw, 22rem);
    line-height: 1;
    color: var(--accent);
    animation: pop 0.4s ease-out;
  }
  @keyframes pop {
    from {
      transform: scale(1.4);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    b {
      animation: none;
    }
  }
</style>
