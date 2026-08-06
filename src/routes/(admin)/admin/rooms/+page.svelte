<script>
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import { getContext } from 'svelte';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let editModal = $state(null);   // room object en cours d'édition
  let deleteModal = $state(null); // room object à supprimer

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

  function openEdit(room) {
    editModal = { ...room };
  }
  function closeEdit() { editModal = null; }
  function openDelete(room) { deleteModal = room; }
  function closeDelete() { deleteModal = null; }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Rooms</h1>
    <span class="zk-date">{data.total} enregistrements</span>
  </div>

  <div class="toolbar">
    <input
      class="search-input"
      type="text"
      placeholder="Rechercher un nom ou un code…"
      value={searchInput}
      oninput={onSearch}
    />
    <div class="sort-btns">
      {#each [['last_active_at','Actives'],['created_at','Date'],['name','Nom']] as [key, label] (key)}
        <button
          class="chip"
          class:active={data.sort === key}
          onclick={() => setParam('sort', key)}
        >{label}</button>
      {/each}
    </div>
  </div>

  {#if form && !form.success}
    <div class="alert alert-err">{form.error ?? 'Action échouée'}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-ok">Action appliquée.</div>
  {/if}

  <div class="panel">
    {#if data.error}
      <div class="alert alert-err">{data.error}</div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Propriétaire</th>
              <th>Public</th>
              <th>Officiel</th>
              <th>Rounds</th>
              <th>Dernière activité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.rooms as r (r.id)}
              <tr>
                <td class="td-code">{r.emoji} {r.code}</td>
                <td class="td-strong">{r.name}</td>
                <td class="td-dim">{r.profiles?.username ?? '—'}</td>

                <!-- Toggle is_public -->
                <td>
                  <form method="POST" action="?/toggleFlag" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                    <input type="hidden" name="_token" value={token}>
                    <input type="hidden" name="id" value={r.id}>
                    <input type="hidden" name="field" value="is_public">
                    <input type="hidden" name="value" value={String(!r.is_public)}>
                    <button class="flag-btn" class:on={r.is_public}>{r.is_public ? '●' : '○'}</button>
                  </form>
                </td>

                <!-- Toggle is_official -->
                <td>
                  <form method="POST" action="?/toggleFlag" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}>
                    <input type="hidden" name="_token" value={token}>
                    <input type="hidden" name="id" value={r.id}>
                    <input type="hidden" name="field" value="is_official">
                    <input type="hidden" name="value" value={String(!r.is_official)}>
                    <button class="flag-btn flag-official" class:on={r.is_official}>{r.is_official ? '★' : '☆'}</button>
                  </form>
                </td>

                <td class="td-dim">{r.max_rounds}r / {r.round_duration}s</td>
                <td class="td-dim">{fmt(r.last_active_at)}</td>

                <td class="td-actions">
                  <button class="link" onclick={() => openEdit(r)}>Éditer</button>
                  <button class="link link-danger" onclick={() => openDelete(r)}>Supprimer</button>
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

<!-- Modal edit -->
{#if editModal}
  <div class="modal-overlay" onclick={closeEdit} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Éditer {editModal.code}</div>
      <form method="POST" action="?/editRoom" use:enhance={() => ({
        onResult: ({ result }) => { if (result.type === 'success') { closeEdit(); invalidateAll(); } }
      })}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={editModal.id}>
        <label class="field">
          <span class="field-label">Nom</span>
          <input class="field-input" type="text" name="name" value={editModal.name} maxlength="60" required>
        </label>
        <label class="field">
          <span class="field-label">Emoji</span>
          <input class="field-input" type="text" name="emoji" value={editModal.emoji} maxlength="4">
        </label>
        <label class="field">
          <span class="field-label">Description</span>
          <input class="field-input" type="text" name="description" value={editModal.description ?? ''}>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Rounds max</span>
            <input class="field-input field-num" type="number" name="max_rounds" value={editModal.max_rounds} min="3" max="50">
          </label>
          <label class="field">
            <span class="field-label">Durée round (s)</span>
            <input class="field-input field-num" type="number" name="round_duration" value={editModal.round_duration} min="10" max="60">
          </label>
          <label class="field">
            <span class="field-label">Pause (s)</span>
            <input class="field-input field-num" type="number" name="break_duration" value={editModal.break_duration} min="3" max="15">
          </label>
        </div>
        <label class="checkbox">
          <input type="checkbox" name="auto_start" checked={editModal.auto_start}>
          Démarrage automatique
        </label>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={closeEdit}>Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Modal delete -->
{#if deleteModal}
  <div class="modal-overlay" onclick={closeDelete} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Supprimer la room</div>
      <p class="modal-warn">Supprimer <strong>{deleteModal.name}</strong> ({deleteModal.code}) ?</p>
      <form method="POST" action="?/deleteRoom" use:enhance={() => ({
        onResult: ({ result }) => { if (result.type === 'success') { closeDelete(); invalidateAll(); } }
      })}>
        <input type="hidden" name="_token" value={token}>
        <input type="hidden" name="id" value={deleteModal.id}>
        <div class="modal-btns">
          <button type="button" class="btn" onclick={closeDelete}>Annuler</button>
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
    --c-amber: #f59e0b;
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
  }
  td { padding: 9px 12px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .td-code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; }
  .td-actions { display: flex; gap: 10px; }

  .flag-btn {
    background: transparent;
    border: none;
    color: var(--c-muted);
    font-size: 1rem;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }
  .flag-btn.on { color: var(--c-green); }
  .flag-btn.flag-official.on { color: var(--c-amber); }

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
    width: 480px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--c-text);
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-warn strong { color: var(--c-text); }

  .field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .field-label { font-size: 0.72rem; color: var(--c-muted); }
  .field-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 7px 10px;
    outline: none;
  }
  .field-input:focus { border-color: rgba(255, 255, 255, 0.2); }
  .field-num { width: 80px; }
  .field-row { display: flex; gap: 12px; }
  .checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--c-text);
    cursor: pointer;
  }

  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
