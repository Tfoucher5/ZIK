<script>
  /**
   * Bandeau d'état de la régie : toujours visible, quelle que soit la taille
   * d'écran et quel que soit l'onglet affiché.
   *
   * Porte l'information que l'exploitant doit pouvoir lire sans réfléchir
   * pendant une prestation : la TV est-elle branchée, où en est la manche,
   * combien de temps reste-t-il, combien ont répondu.
   *
   * @type {{
   *   code: string, phase: string, phaseLabel: string, paused: boolean,
   *   round: number, maxRounds: number,
   *   timerVal: number, timerMax: number, timerOn: boolean,
   *   screens: number|null, joueurs: number, repondu: number,
   *   pro: boolean, maxGratuit: number,
   *   tvUrl: string, regieUrl: string,
   *   onCopy: (url: string, quoi: string) => void,
   *   onUpsell: (f: string) => void,
   *   onHelp: () => void,
   * }}
   */
  let {
    code, phase, phaseLabel, paused, round, maxRounds,
    timerVal, timerMax, timerOn, screens, joueurs, repondu,
    pro, maxGratuit, tvUrl, regieUrl, onCopy, onUpsell, onHelp,
  } = $props();

  let menuOuvert = $state(false);

  const live = $derived(phase === 'round' || phase === 'summary');

  // null tant que le serveur n'a pas répondu : on n'alarme pas à tort.
  const etatTv = $derived(
    screens == null ? 'inconnu' : screens === 0 ? 'absent' : screens === 1 ? 'ok' : 'double',
  );
</script>

<svelte:window onclick={() => (menuOuvert = false)} />

<header class="rh">
  <div class="rh-ligne">
    <span class="sh-brand rh-marque">ZIK <span>Régie</span></span>
    <span class="rh-code">{code}</span>

    <span class="rh-phase" class:live={phase === 'round' && !paused} class:paused>
      {paused ? 'En pause' : phaseLabel}{live ? ` · ${round} / ${maxRounds}` : ''}
    </span>

    <div class="rh-droite">
      {#if !pro}
        <button class="rh-free" onclick={() => onUpsell('players')}>
          Gratuit · {joueurs} / {maxGratuit} <b>Passer à Pro</b>
        </button>
      {/if}
      <button class="sx-btn rh-sm rh-aide" onclick={onHelp} title="Un admin ZIK te répond en direct"><span class="rh-long">Appeler un </span>admin</button>
      <div class="rh-menu-wrap">
        <button class="sx-btn rh-sm" onclick={(e) => { e.stopPropagation(); menuOuvert = !menuOuvert; }} aria-haspopup="true" aria-expanded={menuOuvert}>
          Liens
        </button>
        <div class="rh-menu" class:ouvert={menuOuvert}>
          <a href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>
          <button onclick={() => onCopy(tvUrl, "Lien de l'écran TV")}>Copier le lien TV</button>
          <button onclick={() => onCopy(regieUrl, 'Lien de régie')}>Copier le lien régie</button>
          <p>Ces liens donnent le contrôle du salon. Ne les partage pas avec les joueurs.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- État de l'écran TV : l'exploitant n'a aucun autre moyen de le savoir,
       surtout depuis un téléphone ou une tablette. -->
  {#if etatTv === 'absent'}
    <div class="rh-tv rh-tv-absent" role="alert">
      <span>Aucun écran TV connecté — la musique ne jouera pas.</span>
      <a class="sx-btn rh-sm" href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>
    </div>
  {:else if etatTv === 'double'}
    <div class="rh-tv rh-tv-double" role="alert">
      <span>{screens} écrans TV ouverts — le son va jouer en double. Fermes-en un.</span>
    </div>
  {/if}

  <div class="rh-direct">
    {#if live}
      <span class="rh-chrono" class:dim={!timerOn}>{timerOn ? timerVal : '--'}<small>/ {timerMax} s</small></span>
      <span class="rh-repondu">{repondu} / {joueurs} ont répondu</span>
    {:else}
      <span class="rh-chrono dim">{joueurs}<small>joueur{joueurs > 1 ? 's' : ''}</small></span>
    {/if}
    {#if etatTv === 'ok'}<span class="rh-tv-ok">Écran TV connecté</span>{/if}
  </div>
</header>

<style>
  .rh { border-bottom: 1px solid var(--border); flex-shrink: 0; }

  .rh-ligne {
    display: flex; align-items: center; gap: 14px;
    padding: 10px 18px; flex-wrap: wrap;
  }
  .rh-code { font-family: var(--s-mono); font-weight: 600; letter-spacing: 0.2em; }
  .rh-phase {
    padding: 4px 10px; border: 1px solid var(--border2); border-radius: 2px;
    font-family: var(--s-mono); font-size: 0.78rem;
  }
  .rh-phase.live { border-color: var(--success); color: var(--success); }
  .rh-phase.paused { border-color: var(--warn); color: var(--warn); }

  .rh-droite { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .rh-sm { padding: 7px 12px; font-size: 0.82rem; }
  .rh-aide { border-color: var(--accent); color: var(--accent); }
  .rh-free {
    background: none; border: 1px dashed rgb(var(--accent-rgb) / 0.5); color: var(--accent);
    border-radius: 2px; padding: 5px 10px; font: inherit; font-size: 0.75rem; cursor: pointer;
  }

  .rh-menu-wrap { position: relative; }
  .rh-menu {
    display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
    min-width: 240px; padding: 6px;
    background: var(--bg2); border: 1px solid var(--border2); border-radius: 3px;
    box-shadow: 0 14px 40px rgb(0 0 0 / 0.35);
    flex-direction: column; gap: 2px;
  }
  .rh-menu.ouvert { display: flex; }
  .rh-menu a, .rh-menu button {
    display: block; width: 100%; text-align: left;
    padding: 9px 11px; border: none; background: none; border-radius: 2px;
    font: inherit; font-size: 0.85rem; color: var(--text); cursor: pointer; text-decoration: none;
  }
  .rh-menu a:hover, .rh-menu button:hover { background: var(--surface2); }
  .rh-menu p { margin: 6px 11px 4px; font-size: 0.72rem; color: var(--dim); line-height: 1.4; }

  .rh-tv {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 9px 18px; font-size: 0.86rem; font-weight: 600; flex-wrap: wrap;
  }
  .rh-tv-absent { background: rgb(248 113 113 / 0.12); color: var(--danger); border-top: 1px solid rgb(248 113 113 / 0.35); }
  .rh-tv-double { background: rgb(251 191 36 / 0.12); color: var(--warn); border-top: 1px solid rgb(251 191 36 / 0.35); }

  .rh-direct {
    display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
    padding: 8px 18px 12px;
  }
  .rh-chrono {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900;
    font-size: clamp(2rem, 7vw, 3.4rem); line-height: 1; letter-spacing: -0.01em;
    color: var(--accent); font-variant-numeric: tabular-nums;
  }
  .rh-chrono.dim { color: var(--mid); }
  .rh-chrono small {
    font-family: var(--s-mono); font-size: 0.78rem; font-weight: 400;
    color: var(--dim); margin-left: 8px; letter-spacing: 0;
  }
  .rh-repondu { font-family: var(--s-mono); font-size: 0.82rem; color: var(--mid); }
  .rh-tv-ok {
    margin-left: auto; font-size: 0.76rem; color: var(--success);
    display: inline-flex; align-items: center; gap: 6px;
  }
  .rh-tv-ok::before {
    content: ''; width: 8px; height: 8px; border-radius: 50%;
    background: var(--success); box-shadow: 0 0 6px var(--success);
  }

  @media (max-width: 640px) {
    .rh-ligne { gap: 10px; padding: 9px 12px; }
    .rh-free, .rh-long { display: none; }
    .rh-tv, .rh-direct { padding-left: 12px; padding-right: 12px; }
    .rh-tv-ok { margin-left: 0; width: 100%; }
  }
</style>
