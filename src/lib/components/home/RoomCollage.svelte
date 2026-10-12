<script>
  import { POSTER_COVERS } from './covers.js';
  import { reveal } from './reveal.js';

  let { home, rooms } = $props();

  const COLLAGE_ROTS = [-2.5, 1.8, -1.2, 2.2, -0.8, 1.5, -3.1, 0.7, -1.8, 2.4];
  const COLLAGE_TY   = [0, -8, 5, -12, 7, -4, 2, 10, -6, 4];

  let collageCards = $derived([...rooms].sort((a, b) => (b.online || 0) - (a.online || 0)).slice(0, 10));
</script>

{#if rooms.length > 0}
  <div class="collage-grid">
    {#each collageCards as room, i (room.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
      <div
        class="cc"
        class:cc--live={room.online > 0}
        style="--rot:{COLLAGE_ROTS[i % COLLAGE_ROTS.length]}deg; --ty:{COLLAGE_TY[i % COLLAGE_TY.length]}px"
        role="button"
        tabindex="0"
        onclick={() => home.joinRoom(room.id, room.game_mode)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && home.joinRoom(room.id, room.game_mode)}
        use:reveal={i * 50}
      >
        <div class="cc-img" style="background-image:url('{room.cover_url ?? POSTER_COVERS[i % POSTER_COVERS.length]}')">
          {#if room.online > 0}
            <span class="cc-live-badge">● Live</span>
          {/if}
        </div>
        <div class="cc-info">
          <div class="cc-name">{room.emoji} {room.name}</div>
          <div class="cc-status" class:cc-status--live={room.online > 0}>
            {room.online > 0 ? `${room.online} joueur${room.online > 1 ? 's' : ''} en jeu` : 'Lance la partie →'}
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="collage-empty"><p>{home.rooms.length === 0 ? 'Chargement des rooms…' : 'Aucune room dans ce mode pour le moment.'}</p></div>
{/if}

<style>
  /* ── Collage grid ── */
  .collage-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 24px;
    padding: 16px 56px 32px;
  }
  .collage-empty {
    padding: 40px 48px;
    color: var(--mid);
    font-size: 0.85rem;
  }

  .cc {
    transform: rotate(var(--rot, 0deg)) translateY(var(--ty, 0px));
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    cursor: pointer;
    background: #fafafa;
    box-shadow: 4px 8px 24px rgba(0,0,0,0.3);
    position: relative;
    z-index: 1;
  }
  .cc:hover {
    transform: rotate(0deg) translateY(-6px) scale(1.05);
    z-index: 10;
    box-shadow: 6px 14px 36px rgba(0,0,0,0.4);
  }
  .cc--live {
    box-shadow: 0 0 0 2px var(--accent), 4px 8px 24px rgba(0,0,0,0.3);
  }
  .cc--live:hover {
    box-shadow: 0 0 0 2px var(--accent), 6px 14px 36px rgb(var(--accent-rgb) / 0.25);
  }
  .cc-img {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #222;
    background-size: cover;
    background-position: center;
    position: relative;
    display: block;
  }
  .cc-live-badge {
    position: absolute;
    top: 8px; left: 8px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.5rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 8px;
  }

  .cc-info {
    background: #fafafa;
    padding: 9px 11px 12px;
    border-top: 2px solid #080808;
  }
  .cc-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
    color: #080808;
  }
  .cc-status {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(0,0,0,0.62);
    margin-top: 4px;
  }
  .cc-status--live { color: #a21caf; }

  @media (max-width: 900px) {
    .collage-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px 24px 24px; }
  }

  @media (max-width: 600px) {
    .collage-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; padding: 14px 16px 28px; }
    .cc { --rot: 0deg; --ty: 0px; }
  }

  @media (max-width: 380px) {
    .collage-grid { grid-template-columns: 1fr; gap: 10px; }
  }
</style>
