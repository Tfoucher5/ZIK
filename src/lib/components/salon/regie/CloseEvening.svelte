<script>
  /** « Fermer la soirée » : ferme le salon tout de suite pour la TV et tous les téléphones. */
  let { onClose } = $props();
  let confirme = $state(false);
</script>

<div class="ce">
  {#if confirme}
    <p role="alert">Les téléphones afficheront « L'hôte a fermé la soirée. » et les joueurs devront saisir un nouveau code pour rejouer. La partie en cours compte.</p>
    <div class="ce-actions">
      <button class="sx-btn" onclick={() => (confirme = false)}>Annuler</button>
      <button class="sx-btn ce-fermer" onclick={onClose}>Confirmer : fermer la soirée</button>
    </div>
  {:else}
    <button class="sx-btn ce-fermer" onclick={() => (confirme = true)}>Fermer la soirée</button>
    <p>Un PC en veille ou un onglet fermé ne ferme rien : la soirée attend votre retour.</p>
  {/if}
</div>

<style>
  .ce { margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border); }
  .ce p { margin: 10px 0 0; font-size: 0.82rem; color: var(--dim); }
  .ce p[role='alert'] { margin: 0 0 12px; color: var(--text); }
  .ce-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .ce-fermer { min-height: 44px; border-color: var(--danger); color: var(--danger); }
</style>
