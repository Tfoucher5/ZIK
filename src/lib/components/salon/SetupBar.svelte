<script>
  let { selectedCount, totalTrackCount, maxRounds, error, creating, onCreate } = $props();
</script>

<div class="st-bar">
  <div class="st-bar-in">
    <p class="st-recap">
      <b>{selectedCount}</b> playlist{selectedCount > 1 ? 's' : ''}
      <i>·</i><b>{totalTrackCount}</b> titres
      <i>·</i><b>{maxRounds}</b> manches
    </p>
    {#if error}<p class="st-error">{error}</p>{/if}
    <button class="st-go" onclick={onCreate} disabled={creating || selectedCount === 0}>
      {creating ? 'Ouverture…' : 'Ouvrir le salon'}
    </button>
  </div>
</div>

<style>
  .st-bar {
    position: fixed;
    inset: auto 0 0;
    z-index: 10;
    background: var(--bg);
    border-top: 2px solid var(--text);
  }
  .st-bar-in {
    max-width: 1040px;
    margin: 0 auto;
    padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .st-recap { font-size: 0.9rem; color: var(--mid); }
  .st-recap b { font-family: var(--s-mono); color: var(--text); font-weight: 600; }
  .st-recap i { font-style: normal; margin: 0 8px; color: var(--dim); }
  .st-error { color: var(--danger); font-size: 0.85rem; }
  .st-go {
    margin-left: auto;
    padding: 15px 30px;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: 3px;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.15rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 4px 4px 0 var(--text);
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .st-go:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--text); }
  .st-go:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--text); }
  .st-go:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

  @media (max-width: 760px) {
    .st-bar-in { flex-wrap: wrap; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
    .st-go { width: 100%; margin-left: 0; }
  }
</style>
