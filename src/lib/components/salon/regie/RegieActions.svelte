<script>
  /**
   * Barre d'actions de la régie, hors des onglets : Pause reste sous le pouce
   * quel que soit l'onglet. « Terminer la partie », seule action irréversible,
   * passe par le menu « ⋯ » avec confirmation.
   *
   * @type {{
   *   phase: string, paused: boolean, pro: boolean, joueurs: number, countStart?: boolean,
   *   buzzer?: { username: string }|null, note?: string,
   *   onAction: (evenement: string) => void,
   *   onGate: (feature: string, fn: () => void) => void,
   *   onJudge: (correct: boolean) => void,
   * }}
   */
  let { phase, paused, pro, joueurs, countStart = true, buzzer = null, note = '', onAction, onGate, onJudge } = $props();

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

{#if phase === 'lobby'}
  <footer class="rg-bar">
    <button class="rg-btn on rg-lance" onclick={() => onAction('salon_start')} disabled={!joueurs}>
      {joueurs ? 'Lancer la partie' : 'En attente de joueurs'}
    </button>
    {#if joueurs && countStart}<p>La TV lance un décompte de 5 secondes.</p>{/if}
  </footer>
{:else}
  <footer class="rg-bar jeu">
    <p>{note}</p>
    <div class="ra-acts">
      {#if buzzer && phase === 'round'}
        <button class="rg-btn on" onclick={() => onJudge(true)}>Bonne réponse</button>
        <button class="rg-btn" onclick={() => onJudge(false)}>Raté</button>
      {:else if live}
        <button class="rg-btn on" onclick={() => onAction(paused ? 'salon_resume' : 'salon_pause')}>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
        {#if phase === 'round'}
          <button class="rg-btn" onclick={() => onGate('reveal', () => onAction('salon_reveal'))}>
            Révéler{#if !pro}<span class="pro-tag">Pro</span>{/if}
          </button>
        {:else}
          <button class="rg-btn" onclick={() => onAction('salon_next_round')}>Manche suivante</button>
        {/if}
      {:else}
        <span></span><span></span>
      {/if}
      <button class="rg-btn" onclick={(e) => { e.stopPropagation(); menuOuvert = !menuOuvert; confirmeFin = false; }}
        aria-haspopup="true" aria-expanded={menuOuvert} aria-label="Autres actions">⋯</button>
    </div>
    {#if menuOuvert}
      <div class="ra-menu">
        <button onclick={(e) => { e.stopPropagation(); onAction('salon_restart'); menuOuvert = false; }} disabled={phase === 'round'}>
          Recommencer la partie
        </button>
        <button class="ra-danger" class:confirme={confirmeFin} onclick={(e) => { e.stopPropagation(); terminer(); }}>
          {confirmeFin ? 'Confirmer : terminer' : 'Terminer la partie'}{#if !pro}<span class="pro-tag">Pro</span>{/if}
        </button>
      </div>
    {/if}
  </footer>
{/if}

<style>
  .jeu > p { display: none; }

  .ra-acts { display: grid; grid-template-columns: 1fr 1fr 60px; gap: 8px; }
  .ra-acts .rg-btn { min-height: 60px; padding: 0 6px; }
  .ra-acts .pro-tag { font-size: 11px; padding: 2px 6px; }

  .ra-menu {
    position: absolute; right: 16px; bottom: calc(100% + 8px); z-index: 60;
    display: grid; min-width: 250px; padding: 6px;
    border: 1px solid var(--line-2); border-radius: 18px; background: #14141d;
    box-shadow: 0 30px 60px -20px #000;
  }
  .ra-menu button {
    min-height: 52px; padding: 0 14px; border: 0; border-radius: 12px; background: none;
    text-align: left; color: var(--text); font: inherit; font-weight: 600; font-size: 16px; cursor: pointer;
  }
  .ra-menu button:hover:not(:disabled) { background: var(--surface2); }
  .ra-menu button:disabled { color: var(--muted); cursor: default; }
  .ra-menu .ra-danger { color: var(--danger); }
  .ra-menu .ra-danger.confirme { background: rgb(248 113 113 / 0.14); }

  @media (min-width: 900px) {
    .jeu { flex-direction: row; }
    .jeu > p { display: block; }
    .ra-acts { grid-template-columns: 220px 220px 60px; flex-shrink: 0; }
    .ra-menu { right: 24px; }
  }
</style>
