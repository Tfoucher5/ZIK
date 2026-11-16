<script>
  /**
   * « Fermer la soirée » : ferme tout de suite pour la TV et tous les téléphones,
   * après une confirmation qui s'ouvre en bas de l'écran. `barre` : gros bouton
   * de la barre d'actions (podium de la soirée), sinon bouton rouge discret.
   * @type {{ onClose: () => void, barre?: boolean }}
   */
  let { onClose, barre = false } = $props();
  let confirme = $state(false);
</script>

{#if barre}
  <button class="rg-btn ce-barre" type="button" onclick={() => (confirme = true)}>Fermer la soirée</button>
  <p class="ce-note">Une confirmation est demandée.</p>
{:else}
  <div class="ce">
    <button class="rg-fermer" type="button" onclick={() => (confirme = true)}>Fermer la soirée</button>
    <small>Un PC en veille ou un onglet fermé ne ferme rien : la soirée attend ton retour.</small>
  </div>
{/if}

{#if confirme}
  <button class="ce-voile" type="button" tabindex="-1" aria-label="Annuler" onclick={() => (confirme = false)}></button>
  <div class="ce-feuille" role="alertdialog" aria-modal="true" aria-labelledby="ce-titre">
    <h2 id="ce-titre">Fermer la soirée ?</h2>
    <ul>
      <li>Les téléphones afficheront « L'hôte a fermé la soirée. »</li>
      <li>Pour rejouer, il faudra un nouveau code.</li>
      <li>Les parties déjà jouées restent comptées.</li>
    </ul>
    <p>Juste une pause ? Un PC en veille ou un onglet fermé ne ferme rien : la soirée attend ton retour.</p>
    <div class="ce-deux">
      <button class="rg-btn" type="button" onclick={() => (confirme = false)}>Annuler</button>
      <button class="rg-btn rouge" type="button" onclick={onClose}>Fermer la soirée</button>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => { if (confirme && e.key === 'Escape') confirme = false; }} />

<style>
  .ce { display: grid; gap: 8px; justify-items: start; padding-top: 18px; }
  .ce small, .ce-note { font-size: 14px; line-height: 1.4; color: var(--muted); }
  .ce-note { text-align: center; }
  .ce-barre { min-height: 72px; font-size: 26px; }

  .ce-voile { position: fixed; inset: 0; z-index: 90; border: 0; background: rgb(0 0 0 / 0.6); cursor: default; }
  .ce-feuille {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 91;
    display: grid; gap: 10px; max-width: 640px; margin: 0 auto;
    padding: 18px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--line-2); border-radius: 22px 22px 0 0; background: #0e0e16;
  }
  .ce-feuille h2 { font-family: var(--titre); font-weight: 900; font-size: 40px; line-height: 0.92; text-transform: uppercase; }
  .ce-feuille ul { list-style: none; display: grid; gap: 6px; font-size: 16px; line-height: 1.35; color: var(--soft); }
  .ce-feuille li { position: relative; padding-left: 16px; }
  .ce-feuille li::before { content: ''; position: absolute; left: 0; top: 0.55em; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); }
  .ce-feuille p { font-size: 14px; line-height: 1.4; color: var(--muted); }
  .ce-deux { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; }
  .ce-deux .rg-btn { font-size: 20px; }
</style>
