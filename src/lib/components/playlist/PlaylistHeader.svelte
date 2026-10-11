<script>
  let { store, onSettings, onLaunch } = $props();

  const pl = $derived(store.current);
  const n = $derived(store.tracks.length);
</script>

{#if pl}
<div class="phead">
  <div class="phead-txt">
    <h2 class="phead-title" title={pl.name}>{pl.name}</h2>
    <span class="phead-meta">{n} titre{n !== 1 ? 's' : ''} · {pl.is_public ? 'Publique' : 'Privée'}</span>
  </div>
  <div class="phead-acts">
    <button class="phead-gear" onclick={onSettings} aria-label="Réglages de la playlist" title="Renommer, visibilité, supprimer">⚙</button>
    <button class="phead-launch" onclick={onLaunch} disabled={n < 3} title={n < 3 ? 'Il faut au moins 3 titres' : ''}>Lancer une room →</button>
  </div>
</div>
{/if}

<style>
  .phead {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 2px solid var(--accent);
  }
  .phead-txt { flex: 1; min-width: 0; }
  .phead-title {
    margin: 0;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.9rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .phead-meta { display: block; margin-top: 4px; font-size: 0.6rem; color: var(--mid); letter-spacing: 0.12em; text-transform: uppercase; }
  .phead-acts { display: flex; gap: 8px; flex-shrink: 0; }
  .phead-gear {
    width: 40px;
    height: 40px;
    border: 1px solid var(--border2);
    border-radius: 10px;
    background: transparent;
    color: var(--mid);
    font-size: 1rem;
    cursor: pointer;
  }
  .phead-gear:hover { color: var(--text); border-color: var(--text); }
  .phead-launch {
    height: 40px;
    padding: 0 16px;
    border: none;
    border-radius: 10px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .phead-launch:disabled { opacity: 0.4; cursor: not-allowed; }
  @media (max-width: 600px) {
    .phead { flex-wrap: wrap; }
    .phead-title { font-size: 1.5rem; }
    .phead-acts { width: 100%; }
    .phead-launch { flex: 1; }
  }
</style>
