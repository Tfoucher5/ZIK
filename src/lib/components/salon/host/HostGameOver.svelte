<script>
  /**
   * Fin de partie sur la TV : le podium monte du sol (3e, 2e, 1re), puis la suite
   * du classement et la bande du bas. Sans son ni confettis. Posé sur la scène :
   * le lecteur vidéo reste monté dessous pour précharger la partie suivante.
   * TV seule (aucune régie connectée) : les commandes de l'hôte à droite.
   */
  import HostPodium from './HostPodium.svelte';
  import HostEndBand from './HostEndBand.svelte';
  import HostEndCommands from './HostEndCommands.svelte';
  import { gameOverView } from './gameOverView.js';

  let { h } = $props();

  let alone = $derived(!h.controls);
  let v = $derived(gameOverView(h.gameOver, h.players, alone ? 4 : 7));
  let step = $state(0);

  $effect(() => {
    if (!h.gameOver) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return void (step = 4);
    step = 0;
    const timers = [500, 1500, 2700, 3900].map((ms, i) => setTimeout(() => (step = i + 1), ms));
    return () => timers.forEach(clearTimeout);
  });
</script>

<section class="fin sh-tv" class:s4={step >= 4} aria-label="Fin de partie">
  <div class="sc">
    <HostPodium entries={v.podium} {step} tags={step >= 4} />
    <aside class="cl">
      {#if v.list.rows.length}
        <header><span>{v.list.title}</span>{#if v.list.count}<span>{v.list.count}</span>{/if}</header>
        <ol>
          {#each v.list.rows as r (r.key)}
            <li class:j={r.color} style:--tc={r.color}>
              <span class="rg">{String(r.rank).padStart(2, '0')}</span>
              <span class="nm">{r.name}</span>
              <span class="pt">{r.score.toLocaleString('fr-FR')}</span>
              {#if r.tag}<small>{r.tag}</small>{/if}
            </li>
          {/each}
          {#if v.list.more}<li class="plus">et {v.list.more} autre{v.list.more > 1 ? 's' : ''}</li>{/if}
        </ol>
      {/if}
      {#if alone}<HostEndCommands {h} gameOver={h.gameOver} />{/if}
    </aside>
  </div>
  <HostEndBand code={h.code} encore={v.encore} onQr={alone ? () => h.setQrBig(true) : null} />
</section>

<style>
  .fin {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    padding: 1.4em 3.33em 1.8em;
    overflow: hidden;
    background: radial-gradient(90% 80% at 30% 0%, #1b0a20, #060608 70%);
  }
  .sc {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 22.9em;
    gap: 3.33em;
    margin-bottom: 1.2em;
  }
  .cl {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-left: 1.9em;
    border-left: 1px solid rgb(255 255 255 / 0.16);
  }
  .cl header {
    display: flex;
    justify-content: space-between;
    padding-bottom: 0.43em;
    font-family: var(--s-mono);
    font-size: 1.46em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .cl ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .cl li {
    display: grid;
    grid-template-columns: 1.6em minmax(0, 1fr) auto;
    column-gap: 0.4em;
    align-items: center;
    min-height: 1.78em;
    padding: 0.14em 0;
    border-top: 1px solid rgb(255 255 255 / 0.08);
    font-size: 1.875em;
    font-weight: 600;
    line-height: 1.1;
  }
  .cl li.j {
    border-left: 0.28em solid var(--tc);
    padding-left: 0.4em;
  }
  .rg {
    font-family: var(--s-mono);
    font-size: 0.78em;
    font-weight: 500;
    color: var(--mid);
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pt {
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 0.83em;
    font-variant-numeric: tabular-nums;
  }
  .cl li small {
    grid-column: 2 / -1;
    margin-top: 0.1em;
    font-family: var(--s-mono);
    font-weight: 500;
    font-size: 0.78em;
    text-transform: uppercase;
    color: var(--soft, #d6d7e4);
  }
  .cl li.plus {
    display: block;
    min-height: 0;
    padding-top: 0.4em;
    font-size: 1.46em;
    font-weight: 400;
    color: var(--mid);
  }
  .cl header,
  .cl ol,
  .fin :global(.bd > *) {
    transition: opacity 0.6s;
  }
  .fin:not(.s4) .cl header,
  .fin:not(.s4) .cl ol,
  .fin:not(.s4) :global(.bd > *) {
    opacity: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .cl header,
    .cl ol,
    .fin :global(.bd > *) {
      transition: none;
    }
  }
  /* TV ouverte sur un écran en hauteur : tout s'empile et la page défile */
  @media (max-aspect-ratio: 1/1) {
    .fin {
      font-size: 2.4vw;
      padding: 1.5em;
      overflow-y: auto;
    }
    .sc {
      flex: none;
      grid-template-columns: 1fr;
    }
    .sc > :global(.pz) {
      height: 70vh;
    }
    .cl {
      padding-left: 0;
      border-left: 0;
    }
    .fin :global(.bd) {
      height: auto;
      grid-template-columns: 1fr;
    }
    .fin :global(.bd .d) {
      flex-wrap: wrap;
    }
  }
</style>
