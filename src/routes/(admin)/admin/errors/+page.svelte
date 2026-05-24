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
  let interval = null;

  const filtered = $derived(
    entries.filter(e => {
      if (filterLevel !== 'all' && e.level !== filterLevel) return false;
      if (searchText.trim() && !e.msg.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    })
  );

  const errorCount  = $derived(entries.filter(e => e.level === 'error').length);
  const warnCount   = $derived(entries.filter(e => e.level === 'warn').length);

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
    if (!confirm('Vider tous les logs ?')) return;
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

<div class="err-page">
  <div class="page-header">
    <span class="page-title">// ERROR_LOG</span>
    <span class="badge-error">{errorCount} errors</span>
    <span class="badge-warn">{warnCount} warns</span>
    {#if loading}<span class="loading-dot">●</span>{/if}
    {#if lastFetch}<span class="last-fetch">dernière MAJ {new Date(lastFetch).toLocaleTimeString('fr-FR')}</span>{/if}
  </div>

  <div class="toolbar">
    <div class="filters">
      <button class="filter-btn" class:active={filterLevel === 'all'}   onclick={() => filterLevel = 'all'}>ALL ({entries.length})</button>
      <button class="filter-btn filter-err" class:active={filterLevel === 'error'} onclick={() => filterLevel = 'error'}>ERROR ({errorCount})</button>
      <button class="filter-btn filter-wrn" class:active={filterLevel === 'warn'}  onclick={() => filterLevel = 'warn'}>WARN ({warnCount})</button>
    </div>
    <input class="search-input" type="text" placeholder="Filtrer les messages..." bind:value={searchText} />
    <label class="auto-toggle">
      <input type="checkbox" bind:checked={autoRefresh} />
      AUTO-REFRESH 5s
    </label>
    <button class="act-btn act-refresh" onclick={fetchLog}>↺ REFRESH</button>
    <button class="act-btn act-clear"   onclick={clearLog}>✕ CLEAR ALL</button>
  </div>

  {#if filtered.length === 0}
    <div class="empty">
      {entries.length === 0 ? 'Aucune erreur enregistrée.' : 'Aucune entrée correspond aux filtres.'}
    </div>
  {:else}
    <div class="log-list">
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

<style>
.err-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.1em; }
.badge-error {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; padding: 2px 8px;
  border-radius: 3px; border: 1px solid rgba(255,68,68,0.4);
  color: #ff4444; background: rgba(255,68,68,0.08);
}
.badge-warn {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; padding: 2px 8px;
  border-radius: 3px; border: 1px solid rgba(255,179,0,0.4);
  color: #ffb300; background: rgba(255,179,0,0.08);
}
.loading-dot { color: #00ff41; animation: blink 0.8s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
.last-fetch { font-size: 0.65rem; color: rgba(0,255,65,0.3); margin-left: auto; }

.toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px;
  border: 1px solid rgba(0,255,65,0.12);
  border-radius: 4px;
  background: rgba(0,255,65,0.02);
}
.filters { display: flex; gap: 4px; }
.filter-btn {
  background: transparent; border: 1px solid rgba(0,255,65,0.15); border-radius: 3px;
  color: rgba(0,255,65,0.4); font-family: inherit; font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em; padding: 4px 10px; cursor: pointer; transition: all 0.1s;
}
.filter-btn.active, .filter-btn:hover { color: #00ff41; border-color: rgba(0,255,65,0.4); background: rgba(0,255,65,0.06); }
.filter-err.active { color: #ff4444; border-color: rgba(255,68,68,0.5); background: rgba(255,68,68,0.06); }
.filter-wrn.active { color: #ffb300; border-color: rgba(255,179,0,0.5); background: rgba(255,179,0,0.06); }

.search-input {
  flex: 1; min-width: 160px; background: rgba(0,255,65,0.04); border: 1px solid rgba(0,255,65,0.2);
  border-radius: 3px; color: #00ff41; font-family: inherit; font-size: 0.78rem;
  padding: 5px 10px; outline: none;
}
.search-input::placeholder { color: rgba(0,255,65,0.2); }
.search-input:focus { border-color: rgba(0,255,65,0.4); }

.auto-toggle {
  display: flex; align-items: center; gap: 6px; font-size: 0.62rem; letter-spacing: 0.08em;
  color: rgba(0,255,65,0.4); cursor: pointer; user-select: none;
}
.auto-toggle input { accent-color: #00ff41; }

.act-btn {
  background: transparent; border: 1px solid rgba(0,255,65,0.25); border-radius: 3px;
  color: rgba(0,255,65,0.5); font-family: inherit; font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.08em; padding: 5px 12px; cursor: pointer; transition: all 0.1s; white-space: nowrap;
}
.act-btn:hover { color: #00ff41; border-color: rgba(0,255,65,0.5); background: rgba(0,255,65,0.06); }
.act-clear { border-color: rgba(255,68,68,0.25); color: rgba(255,68,68,0.5); }
.act-clear:hover { color: #ff4444; border-color: rgba(255,68,68,0.5); background: rgba(255,68,68,0.06); }

.empty { font-size: 0.8rem; color: rgba(0,255,65,0.3); padding: 32px 0; text-align: center; }

.log-list {
  display: flex; flex-direction: column; gap: 2px;
  border: 1px solid rgba(0,255,65,0.1); border-radius: 4px; overflow: hidden;
}
.log-entry {
  display: grid;
  grid-template-columns: 130px 56px 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 7px 14px;
  border-bottom: 1px solid rgba(0,255,65,0.05);
  font-size: 0.75rem;
  line-height: 1.5;
}
.log-entry:last-child { border-bottom: none; }
.log-entry:hover { background: rgba(0,255,65,0.03); }
.log-entry.is-error { background: rgba(255,68,68,0.03); border-left: 2px solid rgba(255,68,68,0.4); }
.log-entry.is-warn  { background: rgba(255,179,0,0.03); border-left: 2px solid rgba(255,179,0,0.35); }

.log-ts   { color: rgba(0,255,65,0.3); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.log-level { font-weight: 700; letter-spacing: 0.08em; font-size: 0.62rem; flex-shrink: 0; }
.lvl-err  { color: #ff4444; }
.lvl-wrn  { color: #ffb300; }
.log-msg  { color: rgba(0,255,65,0.75); word-break: break-word; white-space: pre-wrap; }
.log-entry.is-error .log-msg { color: rgba(255,150,150,0.85); }
.log-entry.is-warn  .log-msg { color: rgba(255,200,100,0.85); }
</style>
