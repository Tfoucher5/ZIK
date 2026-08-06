<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { getContext } from 'svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let editModal = $state(null);
  let deleteModal = $state(null);

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
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Tracks</h1>
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
    <div class="sort-btns">
      {#each [['created_at','Récents'],['artist','Artiste']] as [key, label] (key)}
        <button
          class="chip"
          class:active={data.sort === key}
          onclick={() => setParam('sort', key)}
        >{label}</button>
      {/each}
    </div>
  </div>

  <div class="panel">
    {#if data.error}
      <div class="alert alert-err">{data.error}</div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Artiste</th>
              <th>Titre</th>
              <th>Source</th>
              <th>Extrait</th>
              <th>Utilisation</th>
              <th>Ajouté</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.tracks as t (t.id)}
              <tr>
                <td>
                  {#if t.cover_url}<img src={t.cover_url} alt="" class="cover" />{/if}
                </td>
                <td class="td-strong">{t.artist}</td>
                <td>{t.title}</td>
                <td class="td-dim">{t.source}</td>
                <td class="td-dim">
                  {#if t.preview_url}
                    <a href={t.preview_url} target="_blank" rel="noreferrer" class="link">Écouter</a>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="td-dim">
                  {t.playlistCount} playlist{t.playlistCount === 1 ? '' : 's'}
                  {#if t.zikleDays > 0}· {t.zikleDays} Zikle{/if}
                </td>
                <td class="td-dim">{fmt(t.created_at)}</td>
                <td class="td-actions">
                  <button class="link" onclick={() => editModal = { ...t }}>Éditer</button>
                  <button class="link link-danger" onclick={() => deleteModal = t}>Supprimer</button>
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

{#if editModal}
  <div class="modal-overlay" onclick={() => editModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Éditer le morceau</div>
      <form method="POST" action="?/editTrack" use:enhance={() => async ({ update }) => { await update({ reset: false }); editModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={editModal.id}>
        <label class="field">
          <span class="field-label">Artiste</span>
          <input class="field-input" type="text" name="artist" value={editModal.artist} required>
        </label>
        <label class="field">
          <span class="field-label">Titre</span>
          <input class="field-input" type="text" name="title" value={editModal.title} required>
        </label>
        <label class="field">
          <span class="field-label">Cover URL</span>
          <input class="field-input" type="text" name="cover_url" value={editModal.cover_url ?? ''} placeholder="https://…">
        </label>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => editModal = null}>Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if deleteModal}
  <div class="modal-overlay" onclick={() => deleteModal = null} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer le morceau</div>
      <p class="modal-warn">
        Supprimer <strong>{deleteModal.artist} — {deleteModal.title}</strong> ?
        {#if deleteModal.playlistCount > 0 || deleteModal.zikleDays > 0}
          <br>Utilisé dans {deleteModal.playlistCount} playlist{deleteModal.playlistCount === 1 ? '' : 's'}{deleteModal.zikleDays > 0 ? ` et ${deleteModal.zikleDays} jour(s) Zikle` : ''} — la suppression sera refusée tant que ce sera le cas.
        {/if}
      </p>
      <form method="POST" action="?/deleteTrack" use:enhance={() => async ({ update }) => { await update({ reset: false }); deleteModal = null; }}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={deleteModal.id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={() => deleteModal = null}>Annuler</button>
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
    --c-indigo: #6366f1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

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

  .sort-btns { display: flex; gap: 4px; }
  .chip {
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-muted);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .chip:hover, .chip.active { background: rgba(255, 255, 255, 0.05); color: var(--c-text); border-color: rgba(255, 255, 255, 0.15); }

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
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { border-color: rgba(99, 102, 241, 0.4); color: var(--c-indigo); }
  .btn-primary:hover:not(:disabled) { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.6); }
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
    white-space: nowrap;
  }
  td { padding: 8px 12px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .cover { width: 34px; height: 34px; border-radius: 4px; object-fit: cover; display: block; }
  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; white-space: nowrap; }
  .td-actions { display: flex; gap: 10px; white-space: nowrap; }

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
    --c-indigo: #6366f1;
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 24px;
    width: 420px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); line-height: 1.5; }
  .modal-warn strong { color: var(--c-text); }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 0.75rem; color: var(--c-muted); }
  .field-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 8px 12px;
    outline: none;
  }
  .field-input:focus { border-color: rgba(255, 255, 255, 0.2); }
  form { display: flex; flex-direction: column; gap: 12px; }

  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
