<script>
  let { recap } = $props();

  const day = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const MEDALS = ['🥇', '🥈', '🥉'];
</script>

<section class="vn-card or">
  <div class="vn-card-head">
    <h2>Récap de votre dernière soirée</h2>
    <span class="vn-card-sub or-day">{day(recap.date)}</span>
  </div>
  <div class="or-grid">
    <div class="or-figs">
      <p><b>{recap.players}</b> joueur{recap.players > 1 ? 's' : ''}</p>
      <p><b>{recap.games}</b> partie{recap.games > 1 ? 's' : ''}</p>
      <p><b>+{recap.newFollowers}</b> {recap.newFollowers > 1 ? 'nouveaux abonnés' : 'nouvel abonné'}</p>
    </div>
    {#if recap.podium.length}
      <ol class="or-podium">
        {#each recap.podium as p, i (i)}
          <li><span aria-hidden="true">{MEDALS[i]}</span><b>{p.name}</b><small>{p.points} pts</small></li>
        {/each}
      </ol>
    {/if}
  </div>
  {#if !recap.newFollowers}
    <p class="or-tip">Astuce : affichez votre QR code à l'entrée ou sur les tables. Ceux qui suivent votre lieu sont prévenus de vos prochaines soirées.</p>
  {/if}
</section>

<style>
  .or { margin-bottom: 20px; }
  .or-day { text-transform: capitalize; }
  .or-grid { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 20px 32px; align-items: center; }
  .or-figs { display: flex; flex-direction: column; gap: 6px; }
  .or-figs p { font-size: 0.88rem; color: var(--mid); }
  .or-figs b { font-family: "Barlow Condensed", sans-serif; font-size: 1.6rem; font-weight: 900; color: var(--text); margin-right: 4px; }
  .or-podium { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .or-podium li { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); }
  .or-podium b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
  .or-podium small { font-size: 0.8rem; color: var(--mid); }
  .or-tip { margin-top: 14px; font-size: 0.8rem; line-height: 1.5; color: var(--dim); }
  @media (max-width: 600px) {
    .or-grid { grid-template-columns: 1fr; }
    .or-figs { flex-direction: row; flex-wrap: wrap; gap: 4px 16px; }
  }
</style>
