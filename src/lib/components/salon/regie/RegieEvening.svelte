<script>
  import { SALON_INTERMISSIONS } from '$lib/data/salonOptions.js';

  /**
   * Entre deux parties : lancer un entracte (durée facultative, rien ne
   * repart tout seul) ou terminer la soirée sur le podium final (ZIK Pro).
   *
   * @type {{ pro: boolean, night: any, intermission: any, finale: any,
   *   onSend: (ev: string, payload?: any) => void, onUpsell: (f: string) => void }}
   */
  let { pro, night, intermission, finale, finaleSound = true, onSend, onUpsell } = $props();

  let confirmeReset = $state(false);
  const heure = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');

  function podium() {
    if (!pro) return onUpsell('night');
    onSend('salon_finale');
  }

  function nouvelleSoiree(e) {
    e.stopPropagation();
    if (!confirmeReset) { confirmeReset = true; return; }
    confirmeReset = false;
    onSend('salon_reset_night');
  }
</script>

<svelte:window onclick={() => (confirmeReset = false)} />

<section class="re">
  {#if finale}
    <p class="re-etat"><b>Podium final à l'écran.</b> Bravo pour la soirée !</p>
    <div class="re-row">
      <button class="sx-btn" onclick={() => onSend('salon_evening_close')}>Fermer le podium</button>
      <button class="sx-btn re-danger" class:confirme={confirmeReset} onclick={nouvelleSoiree}>
        {confirmeReset ? 'Confirmer : classement à zéro' : 'Nouvelle soirée (classement à zéro)'}
      </button>
    </div>
  {:else if intermission}
    <p class="re-etat"><b>Entracte en cours</b>{intermission.until ? `, reprise affichée vers ${heure(intermission.until)}` : ', sans heure de reprise'}.</p>
    <div class="re-row">
      <button class="sx-btn" onclick={() => onSend('salon_evening_close')}>Terminer l'entracte</button>
    </div>
  {:else}
    <div class="re-bloc">
      <span>Entracte <small>la TV affiche une pause, rien ne repart tout seul</small></span>
      <div class="re-row">
        {#each SALON_INTERMISSIONS as m (m)}
          <button class="sx-btn re-chip" onclick={() => onSend('salon_intermission', { minutes: m })}>{m ? `${m} min` : 'Sans heure'}</button>
        {/each}
      </div>
    </div>
    <div class="re-bloc">
      <span>Fin de soirée</span>
      <button class="sx-btn sx-btn-primary re-final" onclick={podium} disabled={pro && !night}>
        Terminer la soirée : podium final{#if !pro}<i>Pro</i>{/if}
      </button>
      {#if pro && !night}<small class="re-note">Disponible après la première partie terminée.</small>{/if}
      {#if pro}
        <label class="re-son">
          <input type="checkbox" checked={finaleSound} onchange={(e) => onSend('salon_update_settings', { finaleSound: e.currentTarget.checked })}>
          Roulement de tambour sur la TV
        </label>
      {/if}
    </div>
  {/if}
</section>

<style>
  .re {
    display: flex; flex-direction: column; gap: 16px;
    margin-bottom: 24px; padding: 14px;
    border: 1px solid var(--border2); border-radius: 3px;
  }
  .re-bloc { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .re-bloc > span { font-size: 0.84rem; color: var(--mid); }
  .re-bloc small, .re-note { font-size: 0.74rem; color: var(--dim); }
  .re-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .re-chip { min-height: 40px; padding: 8px 12px; font-size: 0.8rem; }
  .re-final { min-height: 48px; }
  .re-final i {
    margin-left: 8px; padding: 2px 6px; border-radius: 2px;
    font-style: normal; font-size: 0.6rem; letter-spacing: 0.1em;
    background: rgb(0 0 0 / 0.2);
  }
  .re-son { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 0.82rem; color: var(--mid); cursor: pointer; }
  .re-son input { width: 16px; height: 16px; accent-color: var(--accent); }
  .re-etat { margin: 0; font-size: 0.9rem; color: var(--mid); }
  .re-etat b { color: var(--text); }
  .re-danger.confirme { border-color: var(--danger); color: var(--danger); }
</style>
