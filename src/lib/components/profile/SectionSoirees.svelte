<script>
  import { fmtDate } from '$lib/shared/profile/stats.js';

  let { sb, userId } = $props();
  let soirees = $state(null);
  let failed = $state(false);

  function load() {
    failed = false;
    sb.from('salon_players')
      .select('id, score, rank, team, departed, created_at, games(player_count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        failed = !!error;
        soirees = data ?? [];
      });
  }

  $effect(() => {
    if (sb && userId) load();
  });

  const place = (r) => (r === 1 ? '1re place' : `${r}e place`);
</script>

<div class="case soirees">
  {#if failed}
    <p class="pv-empty">Impossible de charger tes soirées. <button class="retry" onclick={load}>Réessayer</button></p>
  {:else if soirees === null}
    <p class="pv-empty">Chargement…</p>
  {:else if soirees.length}
    {#each soirees as s (s.id)}
      <div class="row" class:top={s.rank === 1 && !s.departed}>
        <span class="date">{fmtDate(s.created_at)}</span>
        <span class="rank">
          {place(s.rank)}{#if s.games?.player_count} <small>sur {s.games.player_count}</small>{/if}
        </span>
        <span class="team">{s.team ?? ''}</span>
        {#if s.departed}<span class="left">a quitté avant la fin</span>{/if}
        <span class="score">{s.score}</span>
      </div>
    {/each}
  {:else}
    <p class="pv-empty">Aucune soirée jouée avec ton compte. Connecte-toi sur ton téléphone avant de rejoindre une soirée ZIK pour la retrouver ici.</p>
  {/if}
</div>

<style>
  .soirees { padding: 6px 0 4px; }
  .pv-empty { padding: 20px; }
  .retry { background: none; border: 0; padding: 0; min-height: 44px; color: inherit; font: inherit; text-decoration: underline; cursor: pointer; }
  .row { display: grid; grid-template-columns: 100px 1fr 1fr auto 80px; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); }
  .row:last-child { border-bottom: none; }
  .date { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; color: var(--mid); }
  .rank { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.9rem; }
  .rank small { margin-left: 0.35em; font-weight: 600; color: var(--dim); }
  .top .rank { color: var(--gold); }
  .team { font-size: 0.82rem; color: var(--mid); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .left { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .score { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.85rem; text-align: right; grid-column: 5; }

  @media (max-width: 640px) {
    .row { grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px 16px; }
    .date { grid-column: 1 / -1; }
    .team, .left { grid-column: 1; }
    .score { grid-column: 2; grid-row: 2; }
  }
</style>
