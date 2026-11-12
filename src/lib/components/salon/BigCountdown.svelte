<script>
  /**
   * Gros chiffre au milieu de l'écran : lancement de la partie (avec libellé,
   * fond opaque) ou 3, 2, 1 avant le titre suivant (sans libellé, la réponse
   * reste visible derrière).
   */
  let { sec = 0, label = '' } = $props();
</script>

{#if sec > 0}
  <div class="big-cd" class:voile={!label} role="timer" aria-live="assertive">
    {#if label}<p class="sx-kicker">{label}</p>{/if}
    {#key sec}<b>{sec}</b>{/key}
  </div>
{/if}

<style>
  .big-cd {
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
    pointer-events: none;
  }
  .big-cd.voile {
    background: rgb(0 0 0 / 0.55);
  }
  .big-cd p {
    font-size: clamp(1.2rem, 3vw, 2.4rem);
  }
  b {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(8rem, 30vw, 22rem);
    line-height: 1;
    color: var(--accent);
    text-shadow: 0 0 40px rgb(0 0 0 / 0.6);
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
