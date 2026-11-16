<script>
  /**
   * Le podium est un égaliseur : trois colonnes en aplat (or, argent, bronze,
   * ou la couleur de l'équipe) montent du sol, 3e, 2e puis 1re (`step` 1 à 3).
   * Le nom rétrécit jusqu'à tenir dans sa colonne, jamais coupé.
   * `entries` : [{ key, rank, name, score, color?, avg?, tag? }] dans l'ordre des places.
   */
  import { eqBars } from './lobbyView.js';

  let { entries = [], step = 3, tags = true, title = 'Le podium' } = $props();

  const bars = eqBars(44, 1.3);
  const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];
  // À l'écran : 2e, 1re, 3e
  let cols = $derived([entries[1], entries[0], entries[2]].filter(Boolean));

  function fit(node) {
    const run = () => {
      node.style.fontSize = '';
      const min = parseFloat(getComputedStyle(node.parentElement).fontSize) * 1.46;
      let f = parseFloat(getComputedStyle(node).fontSize);
      while (node.firstElementChild.offsetWidth > node.clientWidth + 1 && f > min) {
        f = Math.max(min, f * 0.94);
        node.style.fontSize = `${f}px`;
      }
    };
    const ro = new ResizeObserver(run);
    ro.observe(node.parentElement);
    document.fonts?.ready.then(run);
    return { update: run, destroy: () => ro.disconnect() };
  }
</script>

<div class="pz">
  <h1 class="pt">{title}</h1>
  <div class="sh-eqz pe" class:vif={step < 3} class:off={step >= 3} aria-hidden="true">
    {#each bars as style, i (i)}<i {style}></i>{/each}
  </div>
  <ol class="pod n{cols.length}">
    {#each cols as e (e.key)}
      <li class="col r{e.rank}" class:on={step >= 4 - e.rank} style="--mc:{e.color ?? MEDAL[e.rank - 1]}">
        <div class="in">
          <span class="rg">{e.rank}<span class="e">{e.rank === 1 ? 're' : 'e'}</span></span>
          <span class="nom" use:fit={e.name}><span>{e.name}</span></span>
          <span class="pts">{e.score.toLocaleString('fr-FR')} pts{#if e.avg}<small>de moyenne</small>{/if}</span>
          {#if e.tag}<span class="tag" class:off={!tags}>{e.tag}</span>{/if}
        </div>
      </li>
    {/each}
  </ol>
</div>

<style>
  .pz {
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .pt {
    position: absolute;
    left: 0;
    top: 0;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 4.6em;
    line-height: 0.9;
    text-transform: uppercase;
    white-space: nowrap;
    background: linear-gradient(180deg, #fff 40%, #a8aac0);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .pe {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 13em;
    gap: 0.73em;
    transition: opacity 0.5s;
  }
  .pe.off {
    opacity: 0;
  }
  .pod {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 372fr 520fr 372fr;
    gap: 0.62em;
    align-items: end;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* Moins de trois places : les colonnes gardent leur largeur, centrées */
  .n2 {
    grid-template-columns: 372fr 520fr;
    padding-right: 20%;
  }
  .n1 {
    grid-template-columns: 520fr;
    padding: 0 30%;
  }
  .col {
    position: relative;
    min-width: 0;
    height: 68%;
    overflow: hidden;
  }
  .col.r1 {
    height: 86%;
  }
  .col.r3 {
    height: 56%;
  }
  /* 3em de marge en haut pour le rebond, 4em sous le sol pour qu'il ne décolle jamais */
  .in {
    position: absolute;
    inset: 3em 0 -4em;
    display: flex;
    flex-direction: column;
    padding: 1.15em 1.45em 5em;
    background: var(--mc);
    color: #000;
    transform: translateY(100%);
    transition: transform 0.9s cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  .on .in {
    transform: none;
  }
  .rg {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 4.4em;
    line-height: 0.9;
  }
  .e {
    font-size: 0.46em;
    vertical-align: top;
    margin-left: 0.04em;
  }
  .nom {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 6.45em;
    line-height: 0.9;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow-x: clip;
    padding-top: 0.1em;
  }
  .pts {
    margin-top: 0.16em;
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 2em;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }
  .pts small {
    display: block;
    font-size: 0.74em;
    font-weight: 500;
  }
  .r1 .rg {
    font-size: 6.25em;
  }
  .r1 .nom {
    font-size: 15.6em;
    line-height: 0.84;
  }
  .r1 .pts {
    font-size: 2.7em;
  }
  .tag {
    margin-top: auto;
    align-self: flex-start;
    padding: 0.25em 0.43em;
    border-radius: 0.29em;
    background: #000;
    color: var(--mc);
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 1.46em;
    line-height: 1.15;
    text-transform: uppercase;
    white-space: nowrap;
    transition: opacity 0.5s;
  }
  .tag.off {
    opacity: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .in,
    .tag,
    .pe {
      transition: none;
    }
  }
</style>
