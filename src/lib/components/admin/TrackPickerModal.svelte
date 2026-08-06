<script>
  let { onPick, onClose } = $props();

  let query = $state('');
  let results = $state([]);
  let loading = $state(false);
  let searched = $state(false);
  let timer;

  function onInput(e) {
    clearTimeout(timer);
    const val = e.target.value;
    query = val;
    if (val.trim().length < 2) { results = []; searched = false; return; }
    timer = setTimeout(async () => {
      loading = true;
      try {
        const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(val.trim())}`);
        results = res.ok ? await res.json() : [];
      } finally {
        loading = false;
        searched = true;
      }
    }, 250);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<div class="modal-overlay" onclick={onClose} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
    <div class="modal-title">Rechercher un morceau</div>
    <input
      class="search-input"
      type="text"
      placeholder="Artiste ou titre…"
      value={query}
      oninput={onInput}
    />
    {#if loading}
      <p class="hint">Recherche…</p>
    {:else if searched && results.length === 0}
      <p class="hint">Aucun résultat.</p>
    {/if}
    {#if results.length > 0}
      <div class="results">
        {#each results as t (t.id)}
          <button type="button" class="result-row" onclick={() => onPick(t)}>
            {#if t.cover_url}<img src={t.cover_url} alt="" class="cover" />{/if}
            <span class="result-text">{t.artist} — {t.title}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="modal-btns">
      <button type="button" class="btn" onclick={onClose}>Annuler</button>
    </div>
  </div>
</div>

<style>
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
    width: 420px;
    max-width: 95vw;
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--c-text);
    font-family: 'Inter', system-ui, sans-serif;
  }
  .modal-title { font-size: 0.95rem; font-weight: 600; }

  .search-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 8px 12px;
    outline: none;
  }
  .search-input::placeholder { color: var(--c-muted); }
  .search-input:focus { border-color: rgba(255, 255, 255, 0.2); }

  .hint { font-size: 0.8rem; color: var(--c-muted); }

  .results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 320px;
    overflow-y: auto;
  }
  .result-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 7px 8px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--c-text);
    font-size: 0.82rem;
    transition: background 0.15s;
  }
  .result-row:hover { background: rgba(255, 255, 255, 0.05); }
  .cover { width: 30px; height: 30px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
  .result-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
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
  .btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
</style>
