<script>
  /**
   * Podium de la soirée : tout l'écran passe à la couleur du vainqueur (`mode` « in »),
   * puis l'aplat se replie dans sa colonne du podium (`mode` « fold »).
   */
  import { eqBars } from './lobbyView.js';
  import { fit } from './fitText.js';

  let { winner, games, mode = null } = $props();

  const bars = eqBars(9, 1.3);
  let node;
  let clip = $state('');

  // Le repli vise la colonne d'or, mesurée dans la scène (son haut a 3em de marge)
  $effect(() => {
    if (mode !== 'fold') return void (clip = '');
    const R = node.getBoundingClientRect();
    const r = node.parentElement.querySelector('.r1')?.getBoundingClientRect();
    if (!r) return;
    const em = parseFloat(getComputedStyle(node).fontSize);
    clip = `inset(${r.top - R.top + 3 * em}px ${R.right - r.right}px ${R.bottom - r.bottom}px ${r.left - R.left}px)`;
  });
</script>

<div
  class="fl sh-tv"
  class:in={mode === 'in'}
  class:fold={mode === 'fold'}
  style:--mc={winner.color ?? 'var(--gold)'}
  style:clip-path={clip || null}
  bind:this={node}
  aria-hidden={mode !== 'in'}
>
  <p class="logo">ZIK<i></i><em>Soirée</em></p>
  <div class="c">
    <div>
      <h1 use:fit={winner.name}><span>{winner.name}</span></h1>
      <h2>gagne la soirée</h2>
      <p>{winner.score.toLocaleString('fr-FR')} pts{winner.avg ? ' de moyenne' : ''} · {games} partie{games > 1 ? 's' : ''}</p>
    </div>
    <div class="sh-eqz vif">{#each bars as style, i (i)}<i {style}></i>{/each}</div>
  </div>
</div>

<style>
  .fl {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    padding: 3.33em;
    background: var(--mc);
    color: #000;
    clip-path: inset(100% 0 0 0);
    transition: clip-path 0.55s cubic-bezier(0.7, 0, 0.2, 1);
  }
  .fl:not(.in, .fold) {
    visibility: hidden;
    transition: none;
  }
  .fl.in {
    clip-path: inset(0);
  }
  .fl.fold {
    transition: clip-path 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .logo {
    display: flex;
    align-items: baseline;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 3.2em;
    line-height: 1;
    text-transform: uppercase;
  }
  .logo i {
    width: 0.23em;
    height: 0.23em;
    margin-left: 0.1em;
    border-radius: 50%;
    background: #000;
  }
  .logo em {
    margin-left: 0.7em;
    font-style: normal;
    font-family: var(--s-mono);
    font-weight: 500;
    font-size: 0.46em;
    letter-spacing: 0.14em;
    opacity: 0.7;
  }
  .c {
    margin: auto 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 27em;
    gap: 3.33em;
    align-items: end;
  }
  .logo,
  .c {
    transition: opacity 0.25s;
  }
  .fold .logo,
  .fold .c {
    opacity: 0;
  }
  h1 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 27em;
    line-height: 0.8;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow-x: clip;
    padding-top: 0.12em;
  }
  h2 {
    margin-top: 0.07em;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 7.8em;
    line-height: 0.9;
    text-transform: uppercase;
  }
  .c p {
    margin-top: 0.5em;
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 2.3em;
    line-height: 1.2;
  }
  .sh-eqz {
    height: 32em;
    gap: 0.94em;
  }
  .sh-eqz i {
    background: #000;
    border-radius: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    .fl,
    .logo,
    .c {
      transition: none;
    }
  }
</style>
