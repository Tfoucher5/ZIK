<script>
  /**
   * Onglet « Direct » : ce qui se passe maintenant.
   *
   * Le mode d'emploi n'apparaît qu'en lobby, où il sert ; une fois la partie
   * lancée il encombrait la colonne principale sans rien apporter.
   *
   * @type {{
   *   phase: string, code: string, track: any, answerMode: string,
   *   volume: number, pro: boolean, history: any[],
   *   onVolume: (v: number) => void,
   *   onReport: (reason: string) => void,
   * }}
   */
  let { phase, code, track, answerMode, volume, pro, history, onVolume, onReport } = $props();

  const RAISONS = ['Mauvaise version', 'Pas le bon titre', 'Démarre sur un blanc', 'Pas de son'];
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

{#if phase === 'lobby'}
  <section class="td-bloc">
    <h3 class="sx-kicker">Pour démarrer</h3>
    <ol class="td-help">
      <li><b>Ouvre l'écran TV</b> sur l'ordinateur branché à la télé, par le menu « Liens » en haut.</li>
      <li><b>Les joueurs scannent le QR code</b> affiché sur la TV, ou vont sur zik-music.fr/salon/play avec le code <b>{code}</b>.</li>
      <li><b>Lance la partie</b> quand tout le monde apparaît dans l'onglet Joueurs.</li>
    </ol>
  </section>
{/if}

{#if track}
  <section class="td-bloc">
    <h3 class="sx-kicker">{phase === 'round' ? 'Titre en cours' : 'Dernier titre'}</h3>
    <div class="td-track">
      {#if track.cover}<img src={track.cover} alt="" width="72" height="72" loading="lazy" decoding="async">{/if}
      <div class="td-track-id">
        <b>{track.artist} - {track.title}</b>
        {#if answerMode === 'multiple' && track.correctChoiceIndex != null}
          <small>Bonne réponse : choix {track.correctChoiceIndex + 1}</small>
        {/if}
        {#if phase === 'round'}<small class="td-secret">Visible sur cet écran uniquement</small>{/if}
      </div>
    </div>
    {#if phase === 'round' || phase === 'summary'}
      <div class="td-report">
        {#if signale}
          <p>Merci, c'est noté : « {signale} ». On corrige la vidéo pour les prochaines fois.</p>
        {:else}
          <span>Un souci avec la vidéo ?</span>
          <div class="td-report-btns">
            {#each RAISONS as r (r)}
              <button type="button" onclick={() => signaler(r)}>{r}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<section class="td-bloc">
  <label class="td-volume">
    <span>Volume de la TV <b>{volume} %</b>{#if !pro}<i class="td-pro">Pro</i>{/if}</span>
    <input type="range" min="0" max="100" step="5" value={volume} oninput={(e) => onVolume(+e.target.value)}>
  </label>
</section>

{#if history.length}
  <section class="td-bloc">
    <h3 class="sx-kicker">Titres joués</h3>
    <ol class="td-history">
      {#each [...history].reverse() as h, i (history.length - i)}
        <li><span>{String(history.length - i).padStart(2, '0')}</span>{h.answer}</li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .td-bloc { margin-bottom: 26px; }
  .td-bloc:last-child { margin-bottom: 0; }

  .td-help { margin: 12px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px; }
  .td-help li { font-size: 0.9rem; line-height: 1.5; color: var(--mid); }
  .td-help b { color: var(--text); }

  .td-track { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
  .td-track img { width: 72px; height: 72px; border-radius: 3px; object-fit: cover; flex-shrink: 0; background: var(--surface); }
  .td-track-id { min-width: 0; }
  .td-track-id b { display: block; font-size: 1.05rem; line-height: 1.3; }
  .td-track-id small { display: block; font-size: 0.76rem; color: var(--dim); margin-top: 4px; }
  .td-secret { font-style: italic; }

  .td-report { margin-top: 14px; font-size: 0.82rem; color: var(--dim); }
  .td-report p { color: var(--mid); }
  .td-report-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .td-report-btns button {
    padding: 6px 10px; border: 1px solid var(--border); border-radius: 3px;
    background: var(--surface); color: var(--text); font: inherit; font-size: 0.78rem; cursor: pointer;
  }
  .td-report-btns button:hover { border-color: var(--accent); }

  .td-volume { display: block; }
  .td-volume span { display: block; font-size: 0.86rem; color: var(--mid); margin-bottom: 8px; }
  .td-volume b { color: var(--text); }
  .td-volume input {
    width: 100%;
    /* Sans ça le curseur repasse au bleu natif du navigateur. */
    accent-color: var(--accent);
  }

  .td-pro {
    font-style: normal; font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    margin-left: 7px; padding: 2px 6px; border-radius: 2px;
    background: rgb(var(--accent-rgb) / 0.16); color: var(--accent);
  }

  .td-history { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
  .td-history li {
    display: flex; gap: 12px; align-items: baseline;
    padding: 9px 0; border-bottom: 1px solid var(--border);
    font-size: 0.88rem;
  }
  .td-history li:last-child { border-bottom: none; }
  .td-history span { font-family: var(--s-mono); font-size: 0.72rem; color: var(--dim); flex-shrink: 0; }
</style>
