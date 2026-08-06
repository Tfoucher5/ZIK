<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { getContext } from 'svelte';
  import TrackPickerModal from '$lib/components/admin/TrackPickerModal.svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let pickerOpen = $state(false);
  let deleteResultsModal = $state(false);
  let busy = $state(false);

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR');
  }

  async function pickTrack(track) {
    pickerOpen = false;
    busy = true;
    const fd = new FormData();
    fd.set('_token', token);
    fd.set('date', data.today);
    fd.set('track_id', track.id);
    await fetch('/admin/zikle?/setTrack', { method: 'POST', body: fd });
    busy = false;
    invalidateAll();
  }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Zikle</h1>
    <span class="zk-date">{data.today}</span>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.{form.added !== undefined ? ` (+${form.added} au pool)` : ''}</div>
  {/if}

  <div class="grid">
    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">Morceau du jour</span>
      </div>

      {#if data.todaySong}
        <div class="track-row">
          {#if data.todaySong.tracks?.cover_url}
            <img src={data.todaySong.tracks.cover_url} alt="" class="cover" />
          {/if}
          <div>
            <div class="track-name">{data.todaySong.tracks?.artist} — {data.todaySong.tracks?.title}</div>
            <div class="track-id">id: {data.todaySong.track_id}</div>
          </div>
        </div>
      {:else}
        <p class="hint">Aucun morceau tiré pour aujourd'hui (pool probablement vide).</p>
      {/if}

      {#if data.todayStats}
        <div class="stat-grid">
          <div class="stat-block">
            <span class="stat-val">{data.todayStats.total_players}</span>
            <span class="stat-lbl">Joueurs</span>
          </div>
          <div class="stat-block">
            <span class="stat-val">{data.todayStats.won_count}</span>
            <span class="stat-lbl">Gagnés</span>
          </div>
          <div class="stat-block">
            <span class="stat-val">{data.todayStats.avg_attempts}</span>
            <span class="stat-lbl">Essais moy.</span>
          </div>
        </div>
      {/if}

      <div class="actions">
        <button class="btn" onclick={() => pickerOpen = true} disabled={busy}>Choisir un morceau</button>
        <form method="POST" action="?/rerollRandom" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
          <input type="hidden" name="_token" value={token}>
          <input type="hidden" name="date" value={data.today}>
          <button class="btn" type="submit">Reroll aléatoire</button>
        </form>
        {#if data.todayStats?.total_players > 0}
          <button class="btn btn-danger" onclick={() => deleteResultsModal = true}>Réinitialiser les résultats</button>
        {/if}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">Pool</span>
      </div>
      <div class="stat-grid">
        <div class="stat-block">
          <span class="stat-val">{data.poolCount}</span>
          <span class="stat-lbl">Titres disponibles</span>
        </div>
        <div class="stat-block">
          <span class="stat-val stat-val-sm">{fmt(data.poolLastAdded)}</span>
          <span class="stat-lbl">Dernier ajout</span>
        </div>
      </div>
      <div class="actions">
        <a href="/admin/zikle/pool" class="btn">Gérer le pool</a>
        <form method="POST" action="?/refreshPool" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
          <input type="hidden" name="_token" value={token}>
          <button class="btn" type="submit">Rafraîchir (charts Deezer)</button>
        </form>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <span class="panel-label">Historique</span>
      <span class="panel-sub">{data.history.length} derniers jours</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Morceau</th>
            <th>Parties</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.history as h (h.id)}
            <tr>
              <td class="td-dim">{h.date}</td>
              <td class="td-strong">{h.tracks?.artist} — {h.tracks?.title}</td>
              <td class="td-num">{h.plays}</td>
              <td class="td-actions">
                <a href="/admin/zikle/{h.date}" class="link">Détail →</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

{#if pickerOpen}
  <TrackPickerModal onPick={pickTrack} onClose={() => pickerOpen = false} />
{/if}

{#if deleteResultsModal}
  <div class="modal-overlay" onclick={() => deleteResultsModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Réinitialiser les résultats</div>
      <p class="modal-warn">Supprimer tous les résultats du <strong>{data.today}</strong> ({data.todayStats?.total_players ?? 0} joueurs) ?</p>
      <form method="POST" action="?/deleteDayResults" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteResultsModal = false; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="date" value={data.today}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deleteResultsModal = false}>Annuler</button>
          <button type="submit" class="btn btn-danger">Supprimer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .zk {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-green: #22c55e;
    --c-red: #ef4444;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .zk-head { display: flex; align-items: baseline; gap: 12px; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-head { display: flex; align-items: baseline; gap: 10px; }
  .panel-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text); }
  .panel-sub { font-size: 0.75rem; color: var(--c-muted); }

  .track-row { display: flex; align-items: center; gap: 12px; }
  .cover { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .track-name { font-weight: 600; font-size: 0.9rem; }
  .track-id { font-size: 0.72rem; color: var(--c-muted); margin-top: 2px; }

  .hint { font-size: 0.82rem; color: var(--c-muted); }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; }
  .stat-block { display: flex; flex-direction: column; gap: 3px; }
  .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 600; color: var(--c-text); line-height: 1; }
  .stat-val-sm { font-size: 0.85rem; }
  .stat-lbl { font-size: 0.72rem; color: var(--c-muted); }

  .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  .btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .link { font-size: 0.8rem; color: var(--c-muted); transition: color 0.15s; }
  .link:hover { color: var(--c-text); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    padding: 8px 12px;
    border-bottom: 1px solid var(--c-border);
  }
  td { padding: 10px 12px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; }
  .td-num { font-family: 'JetBrains Mono', monospace; }
  .td-actions { text-align: right; }

  .alert { font-size: 0.84rem; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
  .alert-ok { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }
  .modal {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 24px;
    width: 400px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
    font-family: 'Inter', system-ui, sans-serif;
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-warn strong { color: var(--c-text); }
  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
