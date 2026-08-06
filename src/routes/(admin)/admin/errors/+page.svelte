<script>
  import { getContext, onDestroy } from 'svelte';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let entries = $state([]);
  let loading = $state(false);
  let lastFetch = $state(null);
  let autoRefresh = $state(true);
  let filterLevel = $state('all');
  let searchText = $state('');
  let clearModal = $state(false);
  let interval = null;

  const filtered = $derived(
    entries.filter(e => {
      if (filterLevel !== 'all' && e.level !== filterLevel) return false;
      if (searchText.trim() && !e.msg.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    })
  );

  const errorCount = $derived(entries.filter(e => e.level === 'error').length);
  const warnCount  = $derived(entries.filter(e => e.level === 'warn').length);

  function fmtTs(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  async function fetchLog() {
    if (!token) return;
    loading = true;
    try {
      const res = await fetch(`/api/admin/errors?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      entries = data.entries ?? [];
      lastFetch = Date.now();
    } catch { /* ignore */ } finally {
      loading = false;
    }
  }

  async function clearLog() {
    clearModal = false;
    await fetch(`/api/admin/errors?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    entries = [];
  }

  $effect(() => {
    if (token) fetchLog();
  });

  $effect(() => {
    if (interval) clearInterval(interval);
    if (autoRefresh && token) {
      interval = setInterval(fetchLog, 5000);
    }
    return () => clearInterval(interval);
  });

  onDestroy(() => clearInterval(interval));
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Logs</h1>
    <span class="tag tag-red">{errorCount} erreurs</span>
    <span class="tag tag-amber">{warnCount} warns</span>
    {#if loading}<span class="loading-dot">●</span>{/if}
    {#if lastFetch}<span class="zk-date">dernière MàJ {new Date(lastFetch).toLocaleTimeString('fr-FR')}</span>{/if}
  </div>

  <div class="panel toolbar">
    <div class="filters">
      <button class="chip" class:active={filterLevel === 'all'} onclick={() => filterLevel = 'all'}>Tous ({entries.length})</button>
      <button class="chip chip-red" class:active={filterLevel === 'error'} onclick={() => filterLevel = 'error'}>Erreurs ({errorCount})</button>
      <button class="chip chip-amber" class:active={filterLevel === 'warn'} onclick={() => filterLevel = 'warn'}>Warns ({warnCount})</button>
    </div>
    <input class="search-input" type="text" placeholder="Filtrer les messages…" bind:value={searchText} />
    <label class="checkbox">
      <input type="checkbox" bind:checked={autoRefresh} />
      Auto-refresh 5s
    </label>
    <button class="btn" onclick={fetchLog}>↺ Rafraîchir</button>
    <button class="btn btn-danger" onclick={() => clearModal = true}>✕ Tout vider</button>
  </div>

  {#if filtered.length === 0}
    <p class="hint hint-center">
      {entries.length === 0 ? 'Aucune erreur enregistrée.' : 'Aucune entrée ne correspond aux filtres.'}
    </p>
  {:else}
    <div class="panel log-list">
      {#each filtered as e (e.ts + e.msg.slice(0, 20))}
        <div class="log-entry" class:is-error={e.level === 'error'} class:is-warn={e.level === 'warn'}>
          <span class="log-ts">{fmtTs(e.ts)}</span>
          <span class="log-level" class:lvl-err={e.level === 'error'} class:lvl-wrn={e.level === 'warn'}>
            {e.level.toUpperCase()}
          </span>
          <span class="log-msg">{e.msg}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if clearModal}
  <div class="modal-overlay" onclick={() => clearModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="modal-title">Vider les logs</div>
      <p class="modal-warn">Supprimer définitivement les {entries.length} entrées du journal ?</p>
      <div class="modal-btns">
        <button type="button" class="btn" onclick={() => clearModal = false}>Annuler</button>
        <button type="button" class="btn btn-danger" onclick={clearLog}>Tout vider</button>
      </div>
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
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .zk-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.75rem; color: var(--c-muted); margin-left: auto; }

  .loading-dot { color: var(--c-green); animation: blink 0.8s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .toolbar { flex-direction: row; align-items: center; flex-wrap: wrap; gap: 10px; }
  .filters { display: flex; gap: 4px; }
  .chip {
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-muted);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 5px 10px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .chip:hover, .chip.active { background: rgba(255, 255, 255, 0.05); color: var(--c-text); border-color: rgba(255, 255, 255, 0.15); }
  .chip-red.active { color: var(--c-red); border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.06); }
  .chip-amber.active { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.06); }

  .search-input {
    flex: 1;
    min-width: 160px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.82rem;
    padding: 6px 10px;
    outline: none;
  }
  .search-input::placeholder { color: var(--c-muted); }
  .search-input:focus { border-color: rgba(255, 255, 255, 0.2); }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--c-muted);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .hint { font-size: 0.82rem; color: var(--c-muted); }
  .hint-center { text-align: center; padding: 32px 0; }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-red { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }

  .log-list { padding: 0; gap: 0; overflow: hidden; }
  .log-entry {
    display: grid;
    grid-template-columns: 130px 56px 1fr;
    gap: 10px;
    align-items: baseline;
    padding: 8px 16px;
    border-bottom: 1px solid var(--c-border);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .log-entry:last-child { border-bottom: none; }
  .log-entry:hover { background: rgba(255, 255, 255, 0.02); }
  .log-entry.is-error { border-left: 3px solid var(--c-red); }
  .log-entry.is-warn { border-left: 3px solid var(--c-amber); }

  .log-ts { color: var(--c-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; flex-shrink: 0; }
  .log-level { font-weight: 600; font-size: 0.68rem; flex-shrink: 0; color: var(--c-muted); }
  .lvl-err { color: var(--c-red); }
  .lvl-wrn { color: var(--c-amber); }
  .log-msg { color: var(--c-text); word-break: break-word; white-space: pre-wrap; }

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
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); }
  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
