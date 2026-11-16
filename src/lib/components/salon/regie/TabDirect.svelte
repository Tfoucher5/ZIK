<script>
  import RegieAnswer from './RegieAnswer.svelte';
  import TitresJoues from './TitresJoues.svelte';
  import { RAISONS } from './reponse.js';
  /**
   * Onglet « Direct » : ce qui se passe maintenant à gauche, les titres joués
   * à droite (dessous au téléphone). `haut` : avant-partie ou fin de partie.
   *
   * @type {{
   *   phase: string, etat: ReturnType<typeof import('./onglets.js').etatManche>,
   *   track: any, answerMode: string, volume: number, pro: boolean, history: any[],
   *   onVolume: (v: number) => void,
   *   onReport: (reason: string, round?: number) => void,
   *   haut?: import('svelte').Snippet,
   * }}
   */
  let { phase, etat, track, answerMode, volume, pro, history, onVolume, onReport, haut } = $props();

  const live = $derived(phase === 'round' || phase === 'summary');
  let signale = $state(null);

  // Un signalement par titre : on repart de zéro à la manche suivante
  $effect(() => {
    void track?.title;
    signale = null;
  });

  function signaler(raison) {
    signale = raison;
    onReport(raison);
  }
</script>

<div class:rg-cols={history.length}>
  <div class="rg-col">
    {@render haut?.()}

    {#if live || phase === 'starting'}
      <p class="rg-k"><b aria-hidden="true">●</b>{etat.kicker}</p>
      <h1 class="rg-h1">{etat.titre}<span>{etat.sous}</span></h1>
      <span class="rg-jauge"><i style="--p:{etat.p}"></i></span>
    {/if}

    {#if live && track}
      <section class="td-titre">
        <p class="rg-k">{phase === 'round' ? 'Titre en cours' : 'Sur la TV'}</p>
        <RegieAnswer {track} {phase} {answerMode} />
      </section>
      <ul class="rg-g">
        <li>
          {#if signale}
            <p class="td-merci">Merci, c'est noté : « {signale} ». On corrige la vidéo pour les prochaines fois.</p>
          {:else}
            <details>
              <summary class="rg-l"><b>Un souci avec la vidéo ?</b><small>Dis-le, on la corrige pour les prochaines fois.</small><em>Signaler</em></summary>
              <div class="rg-chips">
                {#each RAISONS as r (r)}<button type="button" onclick={() => signaler(r)}>{r}</button>{/each}
              </div>
            </details>
          {/if}
        </li>
      </ul>
    {/if}

    {#if phase !== 'gameover'}
      <label class="td-vol">
        <span>Volume de la TV {#if !pro}<span class="pro-tag">ZIK Pro</span>{/if}<b>{volume} %</b></span>
        <input type="range" min="0" max="100" step="5" value={volume} style="--v:{volume}%"
          oninput={(e) => { onVolume(+e.currentTarget.value); if (!pro) e.currentTarget.value = String(volume); }}>
      </label>
    {/if}
  </div>

  {#if history.length}
    <div class="rg-col"><TitresJoues {history} onReport={(raison, manche) => onReport(raison, manche)} /></div>
  {/if}
</div>

<style>
  .rg-col { display: grid; gap: 14px; align-content: start; min-width: 0; }
  .td-titre { display: grid; gap: 8px; padding-top: 4px; }
  .td-merci { padding: 14px 0; font-size: 15px; line-height: 1.4; color: var(--soft); }

  .td-vol { display: grid; }
  .td-vol > span { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--muted); }
  .td-vol .pro-tag { margin: 0; }
  .td-vol b { margin-left: auto; font-family: var(--mono); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
  .td-vol input { -webkit-appearance: none; appearance: none; width: 100%; height: 44px; margin: 0; background: none; cursor: pointer; }
  .td-vol input::-webkit-slider-runnable-track {
    height: 6px; border-radius: 6px;
    background: linear-gradient(90deg, var(--violet), var(--accent)) 0 / var(--v, 80%) 100% no-repeat, var(--line-2);
  }
  .td-vol input::-webkit-slider-thumb {
    -webkit-appearance: none; width: 26px; height: 26px; margin-top: -10px;
    border: 0; border-radius: 50%; background: var(--text); box-shadow: 0 2px 8px #000;
  }
  .td-vol input::-moz-range-track { height: 6px; border-radius: 6px; background: var(--line-2); }
  .td-vol input::-moz-range-progress { height: 6px; border-radius: 6px; background: linear-gradient(90deg, var(--violet), var(--accent)); }
  .td-vol input::-moz-range-thumb { width: 26px; height: 26px; border: 0; border-radius: 50%; background: var(--text); }
</style>
