<script>
  /**
   * En-tête de la régie : marque, code, aide et liens privés. L'alerte d'écran
   * TV (absent ou en double) reste visible sur tous les onglets : l'exploitant
   * n'a aucun autre moyen de le savoir depuis un téléphone.
   *
   * @type {{
   *   code: string, screens: number|null, joueurs: number,
   *   pro: boolean, maxGratuit: number, prep: boolean,
   *   tvUrl: string, regieUrl: string,
   *   onCopy: (url: string, quoi: string) => void,
   *   onUpsell: (f: string) => void,
   *   onHelp: () => void,
   * }}
   */
  let { code, screens, joueurs, pro, maxGratuit, prep, tvUrl, regieUrl, onCopy, onUpsell, onHelp } = $props();

  let menuOuvert = $state(false);
</script>

<svelte:window onclick={() => (menuOuvert = false)} />

<header class="rh">
  <div class="rh-ligne">
    <span class="rh-logo">ZIK<i></i><em>Régie</em></span>
    {#if !pro}
      <button class="rh-free" onclick={() => onUpsell('players')}>
        Gratuit · {joueurs} / {maxGratuit} <b>Passer à Pro</b>
      </button>
    {/if}
    <span class="rh-code">{code}</span>
    <button class="rh-b" onclick={onHelp} title="Un admin ZIK te répond en direct">Aide</button>
    <div class="rh-menu-wrap">
      <button class="rh-b" onclick={(e) => { e.stopPropagation(); menuOuvert = !menuOuvert; }} aria-haspopup="true" aria-expanded={menuOuvert}>
        Liens
      </button>
      <div class="rh-menu" class:ouvert={menuOuvert}>
        <a href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>
        <button onclick={() => onCopy(tvUrl, "Lien de l'écran TV")}>Copier le lien TV</button>
        <button onclick={() => onCopy(regieUrl, 'Lien de régie')}>Copier le lien régie</button>
        <p>Ces liens donnent le contrôle de la soirée. Ne les partage pas avec les joueurs.</p>
      </div>
    </div>
  </div>

  <!-- Avant la partie, la checklist de l'onglet Direct le dit déjà. -->
  {#if !prep && screens === 0}
    <div class="rh-tv rh-tv-absent" role="alert">
      <span>Aucun écran TV connecté : la musique ne jouera pas.</span>
      <a class="rh-b" href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>
    </div>
  {:else if !prep && screens > 1}
    <div class="rh-tv rh-tv-double" role="alert">
      <span>{screens} écrans TV ouverts : le son va jouer en double. Fermes-en un.</span>
    </div>
  {/if}
</header>

<style>
  .rh { border-bottom: 1px solid var(--line); flex-shrink: 0; }

  .rh-ligne {
    display: flex; align-items: center; gap: 8px;
    min-height: 56px; padding: 0 12px 0 16px;
  }
  .rh-logo {
    display: inline-flex; align-items: baseline; margin-right: auto;
    font-family: var(--titre); font-weight: 900; font-size: 26px; line-height: 1; text-transform: uppercase;
  }
  .rh-logo i { width: 0.23em; height: 0.23em; margin-left: 0.1em; border-radius: 50%; background: var(--accent); }
  .rh-logo em {
    margin-left: 0.7em; font-family: var(--mono); font-style: normal; font-weight: 500;
    font-size: 13px; letter-spacing: 0.14em; color: var(--muted);
  }
  .rh-code { margin-right: 4px; font-family: var(--mono); font-weight: 700; font-size: 15px; letter-spacing: 0.1em; }
  .rh-b {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; min-width: 44px; padding: 0 12px;
    border: 1px solid var(--line-2); border-radius: 10px; background: none; color: var(--text);
    font-family: var(--titre); font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase;
    text-decoration: none; cursor: pointer;
  }
  .rh-free {
    min-height: 44px; padding: 0 10px; border: 1px dashed rgb(var(--accent-rgb) / 0.5); border-radius: 10px;
    background: none; color: var(--accent-tint); font: inherit; font-size: 0.75rem; cursor: pointer;
  }

  .rh-menu-wrap { position: relative; }
  .rh-menu {
    display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
    min-width: 250px; padding: 6px;
    background: #14141d; border: 1px solid var(--line-2); border-radius: 18px;
    box-shadow: 0 30px 60px -20px #000;
    flex-direction: column; gap: 2px;
  }
  .rh-menu.ouvert { display: flex; }
  .rh-menu a, .rh-menu button {
    display: flex; align-items: center; width: 100%; min-height: 48px; padding: 0 14px;
    border: none; border-radius: 12px; background: none; text-align: left;
    font: inherit; font-weight: 600; font-size: 15px; color: var(--text); cursor: pointer; text-decoration: none;
  }
  .rh-menu a:hover, .rh-menu button:hover { background: var(--surface2); }
  .rh-menu p { margin: 6px 14px 4px; font-size: 13px; color: var(--muted); line-height: 1.4; }

  .rh-tv {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 9px 16px; font-size: 15px; font-weight: 600; flex-wrap: wrap;
  }
  .rh-tv-absent { background: rgb(248 113 113 / 0.12); color: var(--danger); border-top: 1px solid rgb(248 113 113 / 0.35); }
  .rh-tv-double { background: rgb(255 179 71 / 0.12); color: var(--warn); border-top: 1px solid rgb(255 179 71 / 0.35); }

  @media (max-width: 640px) {
    .rh-free { display: none; }
  }
  @media (min-width: 900px) {
    .rh-ligne { min-height: 64px; padding: 0 16px 0 24px; }
    .rh-logo { font-size: 30px; }
    .rh-code { margin-right: 12px; font-size: 17px; }
  }
</style>
