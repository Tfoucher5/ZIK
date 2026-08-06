<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  let { data } = $props();

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
    <h1>Utilisateurs</h1>
    <span class="zk-date">{data.total} enregistrements</span>
  </div>

  <div class="toolbar">
    <input
      class="search-input"
      type="text"
      placeholder="Rechercher un pseudo…"
      value={searchInput}
      oninput={onSearch}
    >
    <div class="sort-btns">
      {#each [['', 'Tous'], ['user', 'Users'], ['super_admin', 'Admins']] as [key, label] (key)}
        <button
          class="chip"
          class:active={data.role === key}
          onclick={() => setParam('role', key)}
        >{label}</button>
      {/each}
    </div>
    <div class="sort-btns">
      {#each [['elo','ELO'],['level','Niveau'],['games_played','Parties'],['created_at','Date']] as [key, label] (key)}
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
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>ELO</th>
              <th>Niveau</th>
              <th>Parties</th>
              <th>Inscrit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.users as u (u.id)}
              <tr>
                <td class="td-user">
                  <img src={u.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${u.username}`} alt="" width="26" height="26" class="avatar">
                  <span class="td-strong">{u.username}</span>
                </td>
                <td><span class="tag" class:tag-amber={u.role === 'super_admin'}>{u.role === 'super_admin' ? 'Admin' : 'User'}</span></td>
                <td class="td-num">{u.elo}</td>
                <td class="td-num">{u.level}</td>
                <td class="td-num">{u.games_played}</td>
                <td class="td-dim">{fmt(u.created_at)}</td>
                <td class="td-actions"><a href="/admin/users/{u.id}" class="link">Ouvrir →</a></td>
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

<style>
  .zk {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-red: #ef4444;
    --c-amber: #f59e0b;
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
    min-width: 220px;
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
    white-space: nowrap;
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
  td { padding: 9px 12px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .td-user { display: flex; align-items: center; gap: 8px; }
  .avatar { border-radius: 6px; flex-shrink: 0; }
  .td-strong { font-weight: 500; }
  .td-num { font-family: 'JetBrains Mono', monospace; }
  .td-dim { color: var(--c-muted); font-size: 0.8rem; }
  .td-actions { text-align: right; }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }

  .pagination { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .page-count { font-size: 0.8rem; color: var(--c-muted); }

  .alert { font-size: 0.84rem; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
</style>
