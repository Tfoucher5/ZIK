<script>
  let { selectedCount, totalTracks, maxRounds, error, creating, loading = false, onCreate } = $props();
</script>

<div class="bar">
  <div class="in">
    {#if error}
      <p class="err" role="alert">{error}</p>
    {:else if loading}
      <p class="recap">Chargement des playlists…</p>
    {:else if !selectedCount}
      <p class="recap">Choisis au moins une playlist</p>
    {:else}
      <p class="recap"><b>{selectedCount}</b> playlist{selectedCount > 1 ? 's' : ''} · <b>{totalTracks}</b> titres · <b>{maxRounds}</b> manches</p>
    {/if}
    <button type="button" class="btn-main" onclick={onCreate} disabled={creating || loading || !selectedCount}>
      {creating ? 'Création…' : 'Créer la soirée'}
    </button>
  </div>
</div>

<style>
  .bar {
    position: sticky;
    bottom: 0;
    z-index: 5;
    border-top: 1px solid var(--line-2);
    background: rgba(5, 5, 7, 0.94);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
  }
  .in {
    display: grid;
    gap: 8px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .recap, .err { font-size: 14px; line-height: 1.3; text-align: center; color: var(--muted); }
  .recap b { font-family: var(--mono); font-weight: 700; color: var(--text); }
  .err { color: var(--danger); }
  .btn-main { width: 100%; border: 0; }
  .btn-main:disabled { background: rgba(255, 255, 255, 0.08); color: var(--muted); box-shadow: none; transform: none; cursor: default; }

  @media (min-width: 900px) {
    .in { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-block: 14px; }
    .recap, .err { font-size: 15px; text-align: left; }
    .btn-main { width: auto; min-width: 280px; }
  }
</style>
