<script>
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import TrackCover from './TrackCover.svelte';
  import TrackFlags from './TrackFlags.svelte';

  /** Titres du catalogue : liste sur mobile, tableau sur PC, pagination. */
  let { tracks, count, page, totalPages, onOpen, onPage } = $props();

  const fmt = (n) => n.toLocaleString('fr-FR');
</script>

<p class="a-muted count">{fmt(count)} titre{count > 1 ? 's' : ''}</p>
<ul class="a-list mobile">
  {#each tracks as t (t.id)}
    <li>
      <button class="a-row" type="button" onclick={() => onOpen(t.id)}>
        <TrackCover {t} />
        <span class="a-row-main">
          <span class="a-row-title">{t.title}</span>
          <span class="a-row-sub">{t.artist}</span>
          <span class="tags">
            <TrackFlags {t} />
            <em class="a-tag">{t.playlistCount} playlist{t.playlistCount > 1 ? 's' : ''}</em>
          </span>
        </span>
      </button>
    </li>
  {/each}
</ul>

<div class="a-table-wrap desktop">
  <table class="a-table">
    <thead>
      <tr>
        <th>Titre</th>
        <th class="num">Playlists</th>
        <th class="num">Zikle</th>
        <th>État</th>
        <th>Source</th>
        <th>Ajouté</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each tracks as t (t.id)}
        <tr>
          <td>
            <button class="cell" type="button" onclick={() => onOpen(t.id)}>
              <TrackCover {t} size="sm" />
              <span class="cell-main"><b>{t.title}</b><span class="a-muted">{t.artist}</span></span>
            </button>
          </td>
          <td class="num">{t.playlistCount}</td>
          <td class="num">{t.zikleDays || '—'}</td>
          <td><span class="tags"><TrackFlags {t} /></span></td>
          <td class="a-muted">{t.source}</td>
          <td class="a-muted nowrap">{ago(t.created_at)}</td>
          <td>
            <div class="row-actions">
              <button class="a-btn small" type="button" onclick={() => onOpen(t.id)}>Ouvrir</button>
              <button class="a-btn small" type="button" onclick={() => onOpen(t.id, 'video')}>Réparer</button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if totalPages > 1}
  <nav class="a-pager">
    <button class="a-btn small" disabled={page <= 1} onclick={() => onPage(page - 1)}>← Précédent</button>
    <span>{page} / {totalPages}</span>
    <button class="a-btn small" disabled={page >= totalPages} onclick={() => onPage(page + 1)}>Suivant →</button>
  </nav>
{/if}

<style>
  .count { font-size: 0.82rem; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .a-row .tags { margin-top: 3px; }

  .desktop { display: none; }
  @media (min-width: 900px) {
    .mobile { display: none; }
    .desktop { display: block; }
  }
  .cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 240px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--a-fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cell:hover b { color: var(--a-accent); }
  .cell-main { display: grid; min-width: 0; }
  .cell-main .a-muted { font-size: 0.82rem; }
  .row-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .nowrap { white-space: nowrap; }
</style>
