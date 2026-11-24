<!-- Haut de page, posé sur l'affiche de la porte : h1 en texte (LCP), les deux entrées de l'immeuble -->
<script>
  import ResumeBand from '#lib/components/accueil/ResumeBand.svelte';

  let { on } = $props();
</script>

<div class="ov hero" class:on>
  <ResumeBand />
  <div class="tete">
    <h1 id="h1">
      <span class="ln"><span>Le blind test</span></span>
      <span class="ln"><span>qui fait</span></span>
      <span class="ln"><span>la <span class="mag">soirée</span></span></span>
    </h1>
    <p class="sous">Blind test en ligne ou en soirée, gratuit, sans appli</p>
  </div>
  <div class="bas">
    <p class="lead" style:--i="0">
      En bas, la soirée : une TV, un téléphone chacun. Aux étages, le jeu en ligne : chacun chez soi, tous dans la même
      room.
    </p>
    <div class="ctas" style:--i="1">
      <a class="btn-main deux" href="/salon"><small>En bas</small>Créer une soirée</a>
      <a class="btn-line deux" href="/jouer"><small>Aux étages</small>Jouer en ligne</a>
    </div>
    <div class="cue" style:--i="2">
      <svg viewBox="0 0 14 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        ><path d="M7 2v17M2 14l5 5 5-5" /></svg
      >Fais défiler, pousse la porte
    </div>
  </div>
</div>

<style>
  .hero {
    top: 0;
    bottom: 0;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    justify-items: center;
    text-align: center;
    padding-top: calc(var(--top) + 18px);
    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    transform: none;
  }
  .tete {
    grid-row: 1;
  }
  h1 {
    font-weight: 900;
    font-size: clamp(3rem, 14vw, 8.6rem);
    line-height: 0.84;
    letter-spacing: -0.015em;
  }
  .ln {
    display: block;
    overflow: hidden;
    padding-bottom: 0.05em;
  }
  .ln > span {
    display: inline-block;
    animation: monte 1.1s var(--expo) both;
  }
  .ln:nth-child(2) > span {
    animation-delay: 0.12s;
  }
  .ln:nth-child(3) > span {
    animation-delay: 0.24s;
  }
  @keyframes monte {
    from {
      transform: translateY(110%);
    }
  }
  .mag {
    background: linear-gradient(90deg, #ff00ff, #ff8af5, #ff00ff);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: sheen 6s linear infinite;
  }
  @keyframes sheen {
    to {
      background-position: -200% 0;
    }
  }
  .sous {
    margin-top: 10px;
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--soft);
    animation: arrive 0.9s var(--expo) 0.4s both;
  }
  .hero :global(.resume) {
    grid-row: 3;
    margin-bottom: 10px;
  }
  .bas {
    grid-row: 4;
    display: grid;
    justify-items: center;
    gap: 10px;
    width: 100%;
  }
  .bas > * {
    animation: arrive 0.9s var(--expo) both;
    animation-delay: calc(0.45s + var(--i, 0) * 0.07s);
  }
  @keyframes arrive {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
  }
  .lead {
    color: #e6e7f0;
    font-size: 1rem;
    line-height: 1.45;
    max-width: 22em;
  }
  @media (max-width: 899px) {
    .hero:has(:global(.resume)) .lead {
      display: none;
    }
  }
  .ctas {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }
  .ctas a {
    flex: 1 1 0;
    padding: 0 12px;
    font-size: 17px;
  }
  .deux {
    flex-direction: column;
    gap: 0;
    min-height: 58px;
    line-height: 1;
  }
  small {
    display: block;
    margin-bottom: 3px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.1em;
    line-height: 1;
    opacity: 0.65;
  }
  .cue {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 30px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--soft);
  }
  .cue svg {
    width: 14px;
    height: 22px;
    animation: cue 1.6s var(--out) infinite;
  }
  @keyframes cue {
    0% {
      transform: translateY(-4px);
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    100% {
      transform: translateY(6px);
      opacity: 0;
    }
  }

  @media (min-width: 900px) {
    .hero {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      text-align: left;
      width: calc(var(--gut) + min(620px, 46vw));
      right: auto;
      padding-right: 0;
    }
    .hero :global(.resume) {
      margin-bottom: 14px;
    }
    h1 {
      font-size: clamp(3rem, 7vw, 7rem);
    }
    .sous {
      font-size: 12.5px;
      margin-top: 16px;
      letter-spacing: 0.12em;
    }
    .bas {
      justify-items: start;
      gap: 16px;
      margin-top: 18px;
    }
    .lead {
      font-size: 1.2rem;
      max-width: 26em;
    }
    .ctas {
      justify-content: flex-start;
      width: auto;
    }
    .ctas a {
      flex: none;
      padding: 0 28px;
      font-size: 18px;
    }
  }
  /* Téléphone en paysage : tout tient sous le bandeau, les deux boutons visibles */
  @media (orientation: landscape) and (max-height: 500px) {
    .hero {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      text-align: left;
      width: calc(var(--gut) + min(620px, 60vw));
      right: auto;
      padding: calc(var(--top) + 8px) 0 12px var(--gut);
    }
    .hero :global(.resume) {
      margin-bottom: 8px;
    }
    h1 {
      font-size: 14svh;
    }
    .sous {
      margin-top: 8px;
    }
    .bas {
      justify-items: start;
      gap: 8px;
      margin-top: 10px;
    }
    .lead,
    .cue {
      display: none;
    }
    .ctas {
      justify-content: flex-start;
      width: auto;
    }
    .ctas a {
      flex: none;
      padding: 0 20px;
    }
  }
</style>
