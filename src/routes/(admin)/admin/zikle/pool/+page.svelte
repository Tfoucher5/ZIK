<script>
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { getContext } from 'svelte';
  import TrackPickerModal from '$lib/components/admin/TrackPickerModal.svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let pickerOpen = $state(false);
  let removeModal = $state(null);
  let busy = $state(false);

  function setParam(key, value) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    goto(`?${p.toString()}`);
  }

  let searchInput = $state(data.q);
  let searchTimer = $state(undefined);
  function onSearch(e) {
    clearTimeout(searchTimer);
    const val = e.target.value;
    searchTimer = setTimeout(() => setParam('q', val), 300);
  }
  $effect(() => () => clearTimeout(searchTimer));

  const totalPages = $derived(Math.ceil(data.total / data.pageSize));

  function fmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  async function addTrack(track) {
    pickerOpen = false;
    busy = true;
    const fd = new FormData();
    fd.set('_token', token);
    fd.set('track_id', track.id);
    await fetch('/admin/zikle/pool?/addToPool', { method: 'POST', body: fd });
    busy = false;
    invalidateAll();
  }
</script>

<div class="zk">
  <a href="/admin/zikle" class="back">← Retour</a>

  <div class="zk-head">
    <h1>Pool Zikle</h1>
    <span class="zk-date">{data.total} morceaux</span>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  <div class="toolbar">
    <input
      class="search-input"
      type="text"
      placeholder="Rechercher un artiste ou un titre…"
      value={searchInput}
      oninput={onSearch}
    />
    <button class="btn" onclick={() => pickerOpen = true} disabled={busy}>+ Ajouter un morceau</button>
  </div>

  <div class="panel">
    {#if data.error}
      <div class="alert alert-err">{data.error}</div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Artiste</th>
              <th>Titre</th>
              <th>Extrait</th>
              <th>Ajouté</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.rows as r (r.track_id)}
              <tr>
                <td class="td-strong">{r.tracks?.artist}</td>
                <td>{r.tracks?.title}</td>
                <td class="td-dim">
                  {#if r.tracks?.preview_url}
                    <a href={r.tracks.preview_url} target="_blank" rel="noreferrer" class="link">Écouter</a>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="td-dim">{fmt(r.added_at)}</td>
                <td class="td-actions">
                  <button class="link link-danger" onclick={() => removeModal = r}>Retirer</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if totalPages > 1}
        <div class="pagination">
          <button class="btn" disabled={data.page <= 1} onclick={() => setParam('page', String(data.page - 1))}>◀ Précédent</button>
          <span class="page-count">{data.page} / {totalPages}</span>
          <button class="btn" disabled={data.page >= totalPages} onclick={() => setParam('page', String(data.page + 1))}>Suivant ▶</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if pickerOpen}
  <TrackPickerModal onPick={addTrack} onClose={() => pickerOpen = false} />
{/if}

{#if removeModal}
  <div class="modal-overlay" onclick={() => removeModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Retirer du pool</div>
      <p class="modal-warn">Retirer <strong>{removeModal.tracks?.artist} — {removeModal.tracks?.title}</strong> du pool ?</p>
      <form method="POST" action="?/removeFromPool" use:enhance={() => async ({ update }) => { await update({ reset: false }); removeModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="track_id" value={removeModal.track_id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => removeModal = null}>Annuler</button>
          <button type="submit" class="btn btn-danger">Retirer</button>
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

  .back { font-size: 0.8rem; color: var(--c-muted); transition: color 0.15s; width: fit-content; }
  .back:hover { color: var(--c-text); }

  .zk-head { display: flex; align-items: baseline; gap: 12px; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); }

  .toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .search-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 8px 12px;
    outline: none;
    min-width: 280px;
    flex: 1;
  }
  .search-input::placeholder { color: var(--c-muted); }
  .search-input:focus { border-color: rgba(255, 255, 255, 0.2); }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

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
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .link { background: none; border: none; font-family: inherit; font-size: 0.8rem; color: var(--c-muted); cursor: pointer; padding: 0; transition: color 0.15s; }
  .link:hover { color: var(--c-text); }
  .link-danger { color: rgba(239, 68, 68, 0.6); }
  .link-danger:hover { color: var(--c-red); }

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
  .td-actions { text-align: right; }

  .pagination { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .page-count { font-size: 0.8rem; color: var(--c-muted); }

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
