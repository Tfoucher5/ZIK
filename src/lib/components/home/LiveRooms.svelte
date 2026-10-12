<script>
  import { POSTER_COVERS } from './covers.js';

  let { home } = $props();
</script>

{#if home.liveRooms.length > 0}
  <div class="live-strip">
    <div class="live-strip-head">
      <h2 class="live-strip-title"><span class="live-strip-dot"></span>En direct</h2>
      <span class="live-strip-sub">{home.totalOnline} joueur{home.totalOnline > 1 ? 's' : ''} en ligne — rejoins une partie en cours</span>
    </div>
    <div class="live-strip-row">
      {#each home.liveRooms.slice(0, 6) as room, i (room.id)}
        <button
          class="live-card"
          class:featured={i === 0}
          onclick={() => home.joinRoom(room.id, room.game_mode)}
        >
          <div class="live-card-img" style="background-image:url('{room.cover_url ?? POSTER_COVERS[i % POSTER_COVERS.length]}')"></div>
          <div class="live-card-body">
            <span class="live-card-mode">{room.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
            <span class="live-card-name">{room.emoji} {room.name}</span>
            <span class="live-card-count"><i></i>{room.online} joueur{room.online > 1 ? 's' : ''} en jeu</span>
          </div>
          <span class="live-card-join">Rejoindre →</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* ── Live strip — rooms en cours ── */
  .live-strip {
    margin: 0 48px 56px;
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
    background:
      radial-gradient(ellipse at 0% 0%, rgb(var(--accent-rgb) / 0.08) 0%, transparent 55%),
      var(--bg2);
    padding: 24px 24px 28px;
    position: relative;
  }
  .live-strip::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent);
  }
  .live-strip-head {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .live-strip-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    text-transform: uppercase;
    letter-spacing: -0.5px;
    line-height: 1;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .live-strip-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--accent);
    animation: live-pulse 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes live-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgb(var(--accent-rgb) / 0.5); }
    50%      { box-shadow: 0 0 0 8px rgb(var(--accent-rgb) / 0); }
  }
  .live-strip-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--mid);
  }
  .live-strip-row {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: thin;
  }
  .live-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px 12px 12px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    cursor: pointer;
    flex-shrink: 0;
    min-width: 260px;
    text-align: left;
    color: var(--text);
    transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .live-card:hover {
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.07);
    transform: translateY(-3px);
  }
  .live-card.featured {
    border-width: 2px;
    border-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.06);
    min-width: 300px;
  }
  .live-card-img {
    width: 58px; height: 58px;
    background: #222;
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
  }
  .live-card.featured .live-card-img { width: 72px; height: 72px; }
  .live-card-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .live-card-mode {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--dim);
  }
  .live-card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .live-card.featured .live-card-name { font-size: 1.3rem; }
  .live-card-count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .live-card-count i {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: live-pulse 1.6s ease-in-out infinite;
  }
  .live-card-join {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--on-accent);
    background: var(--accent);
    padding: 7px 14px;
    margin-left: auto;
    flex-shrink: 0;
  }

  @media (max-width: 900px) {
    .live-strip { margin: 0 24px 44px; padding: 20px 16px 22px; }
  }

  @media (max-width: 600px) {
    .live-strip { margin: 0 16px 40px; }
    .live-card, .live-card.featured { min-width: min(86vw, 320px); }
  }
</style>
