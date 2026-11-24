<script>
  import { SALON_INTERMISSIONS } from '#lib/data/salonOptions.js';

  /**
   * La soirée entre deux parties, en lignes : entracte (rien ne repart tout
   * seul), musique, podium de la soirée (ZIK Pro), et leurs états en cours.
   * `musique` absent : la ligne Musique n'apparaît pas (Réglages l'a déjà).
   *
   * @type {{ pro: boolean, night: any, intermission: any, finale: any, musique?: string, lobby?: boolean,
   *   onSend: (ev: string, payload?: any) => void, onUpsell: (f: string) => void,
   *   onPlaylists?: () => void }}
   */
  let { pro, night, intermission, finale, musique, lobby = false, onSend, onUpsell, onPlaylists } = $props();

  let confirmeReset = $state(false);

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

{#snippet ligne(titre, sous, action, onclick, extra = {})}
  <li>
    <button class="rg-l" class:confirme={extra.confirme} type="button" {onclick} disabled={extra.disabled}>
      <b>{titre}{#if extra.pro}<span class="pro-tag">ZIK Pro</span>{/if}</b><small>{sous}</small>
      {#if !extra.disabled}<em>{action}</em>{/if}
    </button>
  </li>
{/snippet}

<ul class="rg-g">
  {#if finale}
    {@render ligne('Fermer le podium', 'La TV revient à la dernière partie.', 'Fermer', () => onSend('salon_evening_close'))}
    {@render ligne('Nouvelle soirée', 'Remet le classement de la soirée à zéro.', confirmeReset ? 'Confirmer' : 'Remettre à zéro', nouvelleSoiree, { confirme: confirmeReset })}
    {@render ligne('Encore une partie', 'Mêmes joueurs, même code. Le podium se ferme.', 'Lancer', () => onSend('salon_restart'))}
  {:else}
    {#if intermission}
      {@render ligne("Terminer l'entracte", lobby ? "La TV revient à l'attente des joueurs." : 'La TV revient au podium de la partie.', 'Terminer', () => onSend('salon_evening_close'))}
    {:else}
      <li>
        <details>
          <summary class="rg-l"><b>Entracte</b><small>La TV affiche une pause. Rien ne repart tout seul.</small><em>Choisir</em></summary>
          <div class="rg-chips">
            {#each SALON_INTERMISSIONS as m (m)}
              <button type="button" onclick={() => onSend('salon_intermission', { minutes: m })}>{m ? `${m} min` : 'Sans heure'}</button>
            {/each}
          </div>
        </details>
      </li>
    {/if}
    {#if musique && onPlaylists}
      {@render ligne('Musique', musique, 'Changer', onPlaylists)}
    {/if}
    {#if !intermission}
      {@render ligne('Podium de la soirée',
        !pro ? 'Le classement de toute la soirée, en grand sur la TV.' : night ? `${night.games} partie${night.games > 1 ? 's' : ''} cumulée${night.games > 1 ? 's' : ''}. Pour finir la soirée.` : 'Disponible après la première partie terminée.',
        'Afficher', podium, { pro: true, disabled: pro && !night })}
    {/if}
  {/if}
</ul>
