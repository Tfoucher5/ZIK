<script>
  import RoomCovers from './RoomCovers.svelte';

  let { rooms, store, onJoin } = $props();

  const live = $derived(rooms.filter((r) => r.online > 0).sort((a, b) => b.online - a.online));
  const players = $derived(live.reduce((n, r) => n + r.online, 0));
</script>

{#if live.length}
  <section class="ls" aria-label="Parties en cours">
    <h2 class="ls-title"><span class="ls-dot"></span>En ce moment · {players} joueur{players > 1 ? 's' : ''} en partie</h2>
    <div class="ls-row">
      {#each live as r, i (r.id)}
        <button class="ls-card" onclick={() => onJoin(r)}>
          <span class="ls-cov"><RoomCovers covers={store.covers(r)} seed={i} emoji={r.emoji} /></span>
          <span class="ls-txt">
            <span class="ls-name">{r.name}</span>
            <span class="ls-meta">{r.online} en jeu · {r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
          </span>
          <span class="ls-go">Rejoindre →</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .ls { margin: 0 0 22px; }
  .ls-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .ls-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); animation: ls-pulse 1.4s infinite; }
  @keyframes ls-pulse { 50% { opacity: 0.35; } }
  .ls-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; scroll-snap-type: x proximity; }
  .ls-card {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 320px;
    max-width: 85vw;
    padding: 8px 14px 8px 8px;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    border-radius: 14px;
    background: rgb(var(--accent-rgb) / 0.07);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    scroll-snap-align: start;
    transition: background 0.15s;
  }
  .ls-card:hover { background: rgb(var(--accent-rgb) / 0.14); }
  .ls-cov { position: relative; width: 56px; height: 56px; border-radius: 9px; overflow: hidden; flex-shrink: 0; }
  .ls-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ls-name {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.05rem;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ls-meta { font-size: 0.72rem; color: var(--mid); }
  .ls-go { font-size: 0.72rem; font-weight: 800; color: var(--accent); white-space: nowrap; }
</style>
