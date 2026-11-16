<script>
  /**
   * « Fermer la soirée » : ferme tout de suite pour la TV et tous les téléphones,
   * après une confirmation en fenêtre modale en bas de l'écran (focus sur
   * « Annuler », Échap ferme, le focus revient au bouton). `barre` : gros bouton
   * de la barre d'actions (podium de la soirée), sinon bouton rouge discret.
   * @type {{ onClose: () => void, barre?: boolean }}
   */
  let { onClose, barre = false } = $props();
  let dlg = $state();
  let annuler = $state();

  function ouvrir() {
    dlg.showModal();
    annuler.focus();
  }
</script>

{#if barre}
  <button class="rg-btn ce-barre" type="button" onclick={ouvrir}>Fermer la soirée</button>
  <p>Une confirmation est demandée.</p>
{:else}
  <div class="ce">
    <button class="rg-fermer" type="button" onclick={ouvrir}>Fermer la soirée</button>
    <small>Un PC en veille ou un onglet fermé ne ferme rien : la soirée attend ton retour.</small>
  </div>
{/if}

<!-- Un clic sur le voile (hors de la feuille) annule -->
<dialog bind:this={dlg} class="ce-feuille" aria-labelledby="ce-titre" onclick={(e) => { if (e.target === dlg) dlg.close(); }}>
  <h2 id="ce-titre">Fermer la soirée ?</h2>
  <ul>
    <li>Les téléphones afficheront « L'hôte a fermé la soirée. »</li>
    <li>Pour rejouer, il faudra un nouveau code.</li>
    <li>Les parties déjà jouées restent comptées.</li>
  </ul>
  <p>Juste une pause ? Un PC en veille ou un onglet fermé ne ferme rien : la soirée attend ton retour.</p>
  <div class="ce-deux">
    <button class="rg-btn" type="button" bind:this={annuler} onclick={() => dlg.close()}>Annuler</button>
    <button class="rg-btn rouge" type="button" onclick={onClose}>Fermer la soirée</button>
  </div>
</dialog>

<style>
  .ce { display: grid; gap: 8px; justify-items: start; padding-top: 18px; }
  .ce small { font-size: 14px; line-height: 1.4; color: var(--muted); }
  .ce-barre { min-height: 72px; font-size: 26px; }
  @media (min-width: 900px) {
    .ce-barre { width: auto; min-width: 340px; padding: 0 40px; }
  }

  .ce-feuille {
    inset: auto 0 0 0; width: 100%; max-width: 640px; margin: 0 auto;
    padding: 18px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border: 0; border-top: 1px solid var(--line-2); border-radius: 22px 22px 0 0;
    background: #0e0e16; color: var(--text);
  }
  .ce-feuille[open] { display: grid; gap: 10px; }
  .ce-feuille::backdrop { background: rgb(0 0 0 / 0.6); }
  .ce-feuille h2 { font-family: var(--titre); font-weight: 900; font-size: 40px; line-height: 0.92; text-transform: uppercase; }
  .ce-feuille ul { list-style: none; display: grid; gap: 6px; font-size: 16px; line-height: 1.35; color: var(--soft); }
  .ce-feuille li { position: relative; padding-left: 16px; }
  .ce-feuille li::before { content: ''; position: absolute; left: 0; top: 0.55em; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); }
  .ce-feuille p { font-size: 14px; line-height: 1.4; color: var(--muted); }
  .ce-deux { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; }
  .ce-deux .rg-btn { font-size: 20px; }
</style>
