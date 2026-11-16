<script>
  import { FINALE_WINNER_MS } from '$lib/data/salonOptions.js';
  import PlayTop from './PlayTop.svelte';

  /** Téléphone pendant l'entracte ou le podium de la soirée. */
  let { intermission = null, finale = null, myTeam = null, username = '', code = '' } = $props();

  let reprise = $derived(
    intermission?.until
      ? new Date(intermission.until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
      : null
  );
  let place = $derived(
    finale
      ? (finale.teams
          ? finale.teams.findIndex(t => t.id === myTeam) + 1
          : (finale.ranking.me?.rank ?? 0))
      : 0
  );
  // La place n'arrive qu'une fois le vainqueur montré sur la TV
  const open = $derived(!!finale);
  let shown = $state(false);
  $effect(() => {
    shown = false;
    if (!open) return;
    const t = setTimeout(() => (shown = true), FINALE_WINNER_MS);
    return () => clearTimeout(t);
  });
  const medal = $derived(['var(--gold)', 'var(--silver)', 'var(--bronze)'][place - 1] ?? 'var(--accent)');
  const games = $derived(finale ? `Fin de la soirée · ${finale.games} partie${finale.games > 1 ? 's' : ''}` : '');
</script>

<div class="sp-evening" class:aplat={shown && place > 0} style:--mc={medal}>
  <PlayTop {username} {code} />
  <div class="c" aria-live="polite">
    {#if finale && shown && place > 0}
      <p class="k">{games}</p>
      <div class="place">{place}<span class="e">{place === 1 ? 're' : 'e'}</span></div>
      <p class="hint">{finale.teams ? 'Ton équipe termine' : 'Tu termines'} à la {place === 1 ? '1re' : `${place}e`} place de la soirée.</p>
    {:else if finale}
      <p class="k">{games}</p>
      <h1 class="h">Regarde la TV&nbsp;!</h1>
      {#if place > 0}<p class="hint">Ta place arrive juste après le podium.</p>{/if}
    {:else}
      <p class="k">Entracte</p>
      <h1 class="h">{reprise ? `Reprise vers ${reprise}` : 'On reprend très vite'}</h1>
      <p class="hint">Garde cette page ouverte : la partie suivante arrivera ici.</p>
    {/if}
  </div>
  {#if finale && shown && place > 0}<p class="h bas">Regarde la TV&nbsp;!</p>{/if}
</div>

<style>
  .sp-evening {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: calc(16px + env(safe-area-inset-top)) 20px calc(18px + env(safe-area-inset-bottom));
    background: linear-gradient(180deg, #140c1b, #07070b);
    color: var(--text);
    overflow-y: auto;
  }
  .aplat {
    background: var(--mc);
    color: #000;
  }
  .c {
    flex: 1;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 14px;
    text-align: center;
  }
  .k {
    font-family: var(--s-mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .aplat .k {
    color: inherit;
    opacity: 0.75;
  }
  .h {
    margin: 0;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2.8rem, 16vw, 4rem);
    line-height: 0.92;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .bas {
    text-align: center;
    font-size: 2.75rem;
    padding-bottom: 12px;
  }
  .hint {
    max-width: 17em;
    font-size: 17px;
    line-height: 1.4;
    color: var(--mid);
  }
  .aplat .hint {
    color: #000;
    font-weight: 600;
    font-size: 19px;
  }
  .place {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: min(260px, 62vw);
    line-height: 0.8;
    animation: titre 0.7s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .e {
    font-size: 0.3em;
    vertical-align: top;
    margin-left: 0.04em;
  }
  @keyframes titre {
    from { opacity: 0; transform: translateY(30px) scale(0.8); }
  }
  @media (prefers-reduced-motion: reduce) {
    .place { animation: none; }
  }
</style>
