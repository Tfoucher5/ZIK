<script>
  /**
   * Barre d'actions de la régie.
   *
   * Volontairement **hors des onglets** : un exploitant qui consulte la liste
   * des joueurs pendant une manche doit garder Pause sous le pouce. C'est la
   * seule entorse à « même rendu partout », et elle est délibérée.
   *
   * « Terminer la partie » n'y figure pas : c'est la seule action
   * irréversible de l'écran, elle passe derrière un menu avec confirmation
   * pour qu'un geste de travers ne coupe pas la soirée d'un client.
   *
   * @type {{
   *   phase: string, paused: boolean, pro: boolean, joueurs: number,
   *   onAction: (evenement: string) => void,
   *   onGate: (feature: string, fn: () => void) => void,
   * }}
   */
  let { phase, paused, pro, joueurs, onAction, onGate } = $props();

  let menuOuvert = $state(false);
  let confirmeFin = $state(false);

  const live = $derived(phase === 'round' || phase === 'summary');

  function terminer() {
    if (!confirmeFin) { confirmeFin = true; return; }
    confirmeFin = false;
    menuOuvert = false;
    onGate('endGame', () => onAction('salon_end_game'));
  }
</script>

<svelte:window onclick={() => { menuOuvert = false; confirmeFin = false; }} />

<div class="ra">
  <div class="ra-interieur">
  <div class="ra-principal">
    {#if phase === 'lobby'}
      <button class="sx-btn sx-btn-primary sx-btn-lg ra-large" onclick={() => onAction('salon_start')} disabled={!joueurs}>
        {joueurs ? 'Lancer la partie' : 'En attente de joueurs'}
      </button>
    {:else if phase === 'gameover'}
      <button class="sx-btn sx-btn-primary sx-btn-lg ra-large" onclick={() => onAction('salon_restart')}>Rejouer</button>
    {:else if live}
      <button class="sx-btn sx-btn-primary ra-large" onclick={() => onAction(paused ? 'salon_resume' : 'salon_pause')}>
        {paused ? 'Reprendre' : 'Pause'}
      </button>
      {#if phase === 'round'}
        <button class="sx-btn ra-large" onclick={() => onGate('reveal', () => onAction('salon_reveal'))}>
          Révéler{#if !pro}<i class="ra-pro">Pro</i>{/if}
        </button>
      {:else}
        <button class="sx-btn ra-large" onclick={() => onAction('salon_next_round')}>Manche suivante</button>
      {/if}
    {/if}
  </div>

  {#if phase !== 'lobby'}
    <div class="ra-menu-wrap">
      <button class="sx-btn ra-plus" onclick={(e) => { e.stopPropagation(); menuOuvert = !menuOuvert; confirmeFin = false; }} aria-haspopup="true" aria-expanded={menuOuvert} aria-label="Autres actions">⋯</button>
      <div class="ra-menu" class:ouvert={menuOuvert}>
        <button onclick={(e) => { e.stopPropagation(); onAction('salon_restart'); menuOuvert = false; }} disabled={phase === 'round'}>
          Recommencer la partie
        </button>
        <button class="ra-danger" class:confirme={confirmeFin} onclick={(e) => { e.stopPropagation(); terminer(); }}>
          {confirmeFin ? 'Confirmer : terminer' : 'Terminer la partie'}{#if !pro}<i class="ra-pro">Pro</i>{/if}
        </button>
      </div>
    </div>
  {/if}
  </div>
</div>

<style>
  .ra {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 18px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }
  /* Le contenu de la barre suit la colonne de 900px ; le fond, lui, va d'un
     bord à l'autre pour que la barre reste lisible comme un socle. */
  .ra-interieur {
    display: flex; align-items: center; gap: 10px;
    width: 100%; max-width: 900px; margin: 0 auto;
  }
  .ra-principal { display: flex; gap: 10px; flex: 1; min-width: 0; }
  /* Cibles larges : la régie se pilote au doigt sur tablette. */
  .ra-large { flex: 1; min-height: 52px; }

  .ra-menu-wrap { position: relative; flex-shrink: 0; }
  .ra-plus { min-height: 52px; min-width: 52px; font-size: 1.2rem; line-height: 1; }

  .ra-menu {
    display: none; position: absolute; bottom: calc(100% + 8px); right: 0; z-index: 60;
    min-width: 230px; padding: 6px;
    background: var(--bg2); border: 1px solid var(--border2); border-radius: 3px;
    box-shadow: 0 14px 40px rgb(0 0 0 / 0.35);
    flex-direction: column; gap: 2px;
  }
  .ra-menu.ouvert { display: flex; }
  .ra-menu button {
    display: block; width: 100%; text-align: left;
    padding: 11px; border: none; background: none; border-radius: 2px;
    font: inherit; font-size: 0.86rem; color: var(--text); cursor: pointer;
  }
  .ra-menu button:hover:not(:disabled) { background: var(--surface2); }
  .ra-menu button:disabled { opacity: 0.45; cursor: default; }
  .ra-danger { color: var(--danger); }
  .ra-danger.confirme { background: rgb(248 113 113 / 0.14); font-weight: 700; }

  .ra-pro {
    font-style: normal; font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    margin-left: 7px; padding: 2px 6px; border-radius: 2px;
    background: rgb(var(--accent-rgb) / 0.16); color: var(--accent);
  }

  @media (max-width: 640px) {
    .ra { padding-left: 12px; padding-right: 12px; }
    .ra-large { min-height: 48px; }
  }
</style>
