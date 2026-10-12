<script>
  // safeArea : marge basse mobile qui tient compte de l'encoche (page du jour uniquement).
  let { empty = "", safeArea = false, children } = $props();
</script>

<main class="zikle-page" class:zikle-page-safe={safeArea}>
  <div class="zikle-glow" aria-hidden="true"></div>
  {@render children?.()}
  {#if empty}
    <p class="zikle-empty">{empty}</p>
  {/if}
</main>

<style>
  /* Une seule zone plein écran : la scène est centrée dans le viewport,
     sans en-tête empilé au-dessus (sinon le jeu est poussé hors de l'écran). */
  .zikle-page {
    position: relative;
    /* La nav est fixe : on réserve sa hauteur sans dépasser le viewport,
       sinon la page défile dès qu'on interagit. */
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: 32px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .zikle-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(120vw, 900px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgb(var(--accent-rgb) / 0.09), transparent 62%);
    pointer-events: none;
    z-index: 0;
  }
  .zikle-empty {
    color: var(--mid);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  /* Laisse la place à la bottom-nav mobile */
  @media (max-width: 768px) {
    .zikle-page {
      padding-bottom: 64px;
    }
    .zikle-page-safe {
      padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
