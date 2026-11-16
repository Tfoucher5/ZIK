<script>
  /**
   * Décompte de lancement sur la TV : à 5 et 4, on rappelle que le son sort de
   * la TV ; à 3, 2, 1, le gros chiffre. Rien quand le décompte est coupé
   * (le serveur n'en envoie pas). `rejouer` : relance depuis la fin de partie.
   */
  import { eqBars } from './lobbyView.js';

  let { sec = 0, rejouer = false } = $props();

  const bars = eqBars(20, 1.3);
</script>

{#if sec > 0}
  <div class="lc sh-tv" role="timer" aria-live="assertive">
    {#if sec > 3}
      {#if rejouer}<h2>On remet ça.</h2>{:else}<h2>Le son sort<br>de la TV.</h2>{/if}
      <div class="sh-eqz vif">{#each bars as style, i (i)}<i {style}></i>{/each}</div>
      {#if rejouer}<p>Mêmes joueurs · scores à zéro</p>{/if}
      <p>La partie commence dans {sec}</p>
    {:else}
      <p>La partie commence</p>
      {#key sec}<strong>{sec}</strong>{/key}
    {/if}
  </div>
{/if}

<style>
  .lc {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 1.8em;
    padding: 3.33em;
    background: rgb(0 0 0 / 0.97);
    text-align: center;
    pointer-events: none;
  }
  h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 11em;
    line-height: 0.86;
    text-transform: uppercase;
  }
  .sh-eqz {
    width: 47em;
    height: 10.4em;
    gap: 0.6em;
  }
  p {
    font-family: var(--s-mono);
    font-size: 2.08em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--soft, #d6d7e4);
  }
  strong {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 29em;
    line-height: 0.8;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    animation: pop 0.4s ease-out;
  }
  @keyframes pop {
    from {
      transform: scale(1.4);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    strong {
      animation: none;
    }
  }
  @media (max-aspect-ratio: 1/1) {
    .lc {
      font-size: 2.4vw;
    }
    h2 {
      font-size: 6.5em;
    }
    .sh-eqz {
      width: 34em;
    }
  }
</style>
