<script>
  import PlaylistTile from './PlaylistTile.svelte';

  /** Playlists les plus jouées, d'après les parties de leur room liée. */
  let { top } = $props();

  const maxPlays = $derived(Math.max(1, ...top.map((p) => p.plays)));
  const fmt = (n) => n.toLocaleString('fr-FR');
</script>

<section class="a-section">
  <div class="a-section-head"><h2>Les plus jouées</h2></div>
  {#if top.length}
    <ol class="top">
      {#each top as p, i (p.id)}
        <li>
          <a href="/admin/playlists/{p.id}">
            <span class="rank">{i + 1}</span>
            <PlaylistTile emoji={p.emoji} small />
            <span class="top-main">
              <span class="top-name">{p.name}</span>
              <span class="a-meter"><i style="width:{(p.plays / maxPlays) * 100}%"></i></span>
            </span>
            <span class="top-n"><b>{fmt(p.plays)}</b><small>{p.month} ce mois</small></span>
          </a>
        </li>
      {/each}
    </ol>
    <p class="a-muted foot">Parties lancées dans la room liée à chaque playlist.</p>
  {:else}
    <p class="a-muted">Aucune playlist n'est liée à une room pour l'instant.</p>
  {/if}
</section>

<style>
  .top { display: grid; gap: 4px; list-style: none; }
  .top a { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-radius: 10px; color: var(--a-fg); }
  .top a:hover { background: var(--a-surface2); }
  .rank { width: 16px; font-family: var(--a-display); font-weight: 800; color: var(--a-dim); }
  .top-main { flex: 1; display: grid; gap: 5px; min-width: 0; }
  .top-name { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .top-n { display: grid; text-align: right; font-variant-numeric: tabular-nums; }
  .top-n small { font-size: 0.7rem; color: var(--a-dim); }
  .foot { font-size: 0.78rem; }
</style>
