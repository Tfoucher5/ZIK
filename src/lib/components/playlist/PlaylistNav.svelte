<script>
  let { store, onCreate } = $props();
</script>

<nav class="pnav" aria-label="Mes playlists">
  <div class="pnav-head">
    <span class="pnav-title">Mes playlists</span>
    <button class="pnav-new" onclick={onCreate}>+ Nouvelle</button>
  </div>
  <ul class="pnav-list">
    {#each store.playlists as p (p.id)}
      <li>
        <button class="pnav-item" class:on={p.id === store.current?.id} aria-current={p.id === store.current?.id ? 'true' : undefined}
          onclick={() => { if (p.id !== store.current?.id) store.open(p); }}>
          <span class="pnav-name" title={p.name}>{p.name}</span>
          <span class="pnav-meta">{p.track_count} titre{p.track_count !== 1 ? 's' : ''}{p.is_public ? '' : ' · privée'}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .pnav { display: flex; flex-direction: column; min-height: 0; }
  .pnav-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 0 10px; }
  .pnav-title { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); }
  .pnav-new {
    padding: 6px 12px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    background: none;
    color: var(--mid);
    font: inherit;
    font-size: 0.74rem;
    cursor: pointer;
  }
  .pnav-new:hover { border-color: var(--accent); color: var(--accent); }
  .pnav-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; scrollbar-width: thin; }
  .pnav-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: 10px;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }
  .pnav-item:hover { background: var(--surface2); }
  .pnav-item.on { background: rgb(var(--accent-rgb) / 0.12); box-shadow: inset 3px 0 0 var(--accent); }
  .pnav-name {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pnav-item.on .pnav-name { color: var(--accent); }
  .pnav-meta { font-size: 0.66rem; color: var(--dim); }

  /* Tablette et mobile : bandeau horizontal qui défile */
  @media (max-width: 1100px) {
    .pnav-head { padding: 12px 0 8px; }
    .pnav-list {
      flex-direction: row;
      gap: 6px;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 6px;
      scroll-snap-type: x proximity;
      scrollbar-width: none;
    }
    .pnav-list li { flex: 0 0 auto; scroll-snap-align: start; }
    .pnav-item { width: auto; max-width: 200px; border: 1px solid var(--border2); padding: 7px 14px; }
    .pnav-item.on { border-color: var(--accent); box-shadow: none; }
  }
</style>
