<script>
  /** Téléphone pendant l'entracte ou le podium final de la soirée. */
  let { intermission = null, finale = null, username = '', myTeam = null } = $props();

  let reprise = $derived(
    intermission?.until
      ? new Date(intermission.until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
      : null
  );
  let place = $derived(
    finale
      ? (finale.teams
          ? finale.teams.findIndex(t => t.id === myTeam)
          : finale.players.findIndex(p => p.username === username)) + 1
      : 0
  );
</script>

<div class="sp-evening" class:fin={finale}>
  {#if finale}
    <p class="sx-kicker">Fin de la soirée · {finale.games} partie{finale.games > 1 ? 's' : ''}</p>
    <div class="sp-big">Regarde la TV !</div>
    {#if place > 0}
      <div class="sp-place" style="--medal:{['#f6c945', '#d4dbe3', '#d58a4e'][place - 1] ?? 'var(--mid)'}">{place}<sup>{place === 1 ? 're' : 'e'}</sup></div>
      <p>{finale.teams ? 'Ton équipe termine' : 'Tu termines'} à la {place === 1 ? '1re' : `${place}e`} place de la soirée.</p>
    {/if}
  {:else}
    <p class="sx-kicker">Entracte</p>
    <div class="sp-big">{reprise ? `Reprise vers ${reprise}` : 'On reprend très vite'}</div>
    <p>Garde cette page ouverte : la partie suivante arrivera ici.</p>
  {/if}
</div>

<style>
  .sp-evening {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    background: var(--bg);
    text-align: center;
  }
  .sp-evening p { color: var(--mid); line-height: 1.5; }
  .sp-evening.fin {
    background: radial-gradient(ellipse 90% 50% at 50% 100%, rgb(var(--accent-rgb) / 0.2), transparent 70%), #050506;
    color: #fff;
  }
  .sp-place {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 7rem;
    line-height: 1;
    color: var(--medal);
    text-shadow: 0 0 30px color-mix(in srgb, var(--medal) 50%, transparent);
    animation: sp-place 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }
  .sp-place sup { font-size: 0.35em; }
  @keyframes sp-place {
    from { opacity: 0; transform: scale(0.5); }
  }
</style>
