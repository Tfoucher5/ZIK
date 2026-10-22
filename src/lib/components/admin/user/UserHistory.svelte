<script>
  import { ago } from '$lib/shared/admin/stats-utils.js';

  /** Dernières parties en ligne et parties du mode salon (animées ou jouées). */
  let { data } = $props();

  const salonHosted = $derived.by(() => {
    const h = data.salon.hosted;
    const counts = h.map((g) => g.player_count ?? 0);
    const monthAgo = Date.now() - 30 * 86400000;
    return {
      month: h.filter((g) => new Date(g.started_at).getTime() > monthAgo).length,
      avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
      max: counts.length ? Math.max(...counts) : 0,
      limits: h.reduce((n, g) => n + (g.limit_hits ?? 0), 0),
    };
  });
  const salonRows = $derived(
    [
      ...data.salon.hosted.map((g) => ({ key: `h${g.id}`, host: true, code: g.room_id, at: g.started_at, players: g.player_count, ended: !!g.ended_at })),
      ...data.salon.played.map((p) => ({ key: `p${p.id}`, host: false, code: p.games.room_id, at: p.games.started_at, players: p.games.player_count, rank: p.rank, score: p.score, team: p.team })),
    ]
      .sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0))
      .slice(0, 15),
  );
</script>

<section class="a-section">
  <div class="a-section-head"><h3>Dernières parties</h3><span class="a-muted">{data.stats.games} au total</span></div>
  {#if data.games.length}
    <ul class="a-list">
      {#each data.games as g (g.id)}
        <li class="a-row">
          <span class="rank" class:first={g.rank === 1}>{g.rank ? `${g.rank}e` : '—'}</span>
          <span class="a-row-main">
            <span class="a-row-title">{g.room ? `${g.room.emoji ?? ''} ${g.room.name}` : `Partie ${g.code ?? ''}`}</span>
            <span class="a-row-sub">{g.startedAt ? ago(g.startedAt) : 'date inconnue'}{g.rounds ? ` · ${g.rounds} manches` : ''}{g.players ? ` · ${g.players} joueurs` : ''}</span>
          </span>
          <b class="score">{g.score ?? 0} pts</b>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-empty">Aucune partie enregistrée.</p>
  {/if}
</section>

<section class="a-section">
  <div class="a-section-head"><h3>Mode salon</h3><span class="a-muted">{data.salon.hosted.length} animé{data.salon.hosted.length > 1 ? 's' : ''} · {data.salon.played.length} joué{data.salon.played.length > 1 ? 's' : ''}</span></div>
  {#if data.salon.hosted.length}
    <div class="a-kpis">
      <div class="a-kpi"><span class="a-kpi-label">Parties animées</span><span class="a-kpi-value">{data.salon.hosted.length}</span><span class="a-kpi-sub">{salonHosted.month} sur 30 jours</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Joueurs en moyenne</span><span class="a-kpi-value">{salonHosted.avg}</span><span class="a-kpi-sub">record : {salonHosted.max}</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Bloqué par la limite</span><span class="a-kpi-value">{salonHosted.limits}</span><span class="a-kpi-sub">joueurs refusés (salon plein)</span></div>
    </div>
  {/if}
  {#if salonRows.length}
    <ul class="a-list">
      {#each salonRows as g (g.key)}
        <li class="a-row">
          <em class="a-tag {g.host ? 'accent' : ''}">{g.host ? 'Hôte' : g.rank ? `${g.rank}e` : 'Joueur'}</em>
          <span class="a-row-main">
            <span class="a-row-title">Salon {g.code ?? ''}{g.team ? ` · ${g.team}` : ''}</span>
            <span class="a-row-sub">{g.at ? ago(g.at) : 'date inconnue'}{g.players != null ? ` · ${g.players} joueurs` : ''}{g.host && !g.ended ? ' · pas terminée' : ''}</span>
          </span>
          {#if !g.host}<b class="score">{g.score ?? 0} pts</b>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-empty">Aucun salon lié à ce compte. L’hôte et les joueurs connectés ne sont enregistrés que depuis la refonte de l’admin.</p>
  {/if}
</section>

<style>
  .rank { flex: 0 0 38px; font-family: var(--a-display); font-size: 1.3rem; font-weight: 800; color: var(--a-dim); text-align: center; }
  .rank.first { color: var(--a-warn); }
  .score { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .a-row-title { color: var(--a-fg); }
</style>
