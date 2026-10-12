<script>
  import LiveRooms from './LiveRooms.svelte';
  import RoomCollage from './RoomCollage.svelte';

  let { home } = $props();

  let roomsTab = $state('classic');
  let tabRooms = $derived(home.rooms.filter(r => roomsTab === 'qcm' ? r.game_mode === 'qcm' : r.game_mode !== 'qcm'));
</script>

<section class="poster-wall" id="rooms">
  <LiveRooms {home} />

  <div class="pw-head">
    <div class="pw-head-left">
      <h2 class="pw-title">Jouer <em>en ligne</em></h2>
      {#if home.totalOnline > 0 && home.liveRooms.length === 0}
        <span class="pw-live">● {home.totalOnline} en ligne</span>
      {/if}
      <p class="pw-sub">Choisis une room par thème et joue contre les autres joueurs, sans inscription.</p>
    </div>
    <div class="pw-mode">
      <div class="pw-tabs" role="tablist" aria-label="Mode de jeu">
        <button role="tab" aria-selected={roomsTab === 'classic'} class:active={roomsTab === 'classic'} onclick={() => roomsTab = 'classic'}>Classique</button>
        <button role="tab" aria-selected={roomsTab === 'qcm'} class:active={roomsTab === 'qcm'} onclick={() => roomsTab = 'qcm'}>QCM</button>
      </div>
      <p class="pw-mode-help">
        {roomsTab === 'qcm' ? 'QCM : choisis parmi 4 réponses.' : 'Classique : tape le titre ou l’artiste.'}
      </p>
    </div>
  </div>

  <RoomCollage {home} rooms={tabRooms} />

  <div class="pw-cta-wrap">
    <a href="/rooms" class="pw-cta">Voir toutes les rooms →</a>
  </div>
</section>

<style>
  .poster-wall {
    padding: 72px 0 80px;
    background: var(--bg);
    position: relative;
  }

  /* ── Onglets Classique / QCM ── */
  .pw-tabs {
    display: inline-flex;
    border: 1px solid rgb(var(--c-glass) / 0.18);
  }
  .pw-tabs button {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    padding: 10px 26px;
    background: none;
    border: none;
    color: var(--dim);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .pw-tabs button.active {
    background: var(--accent);
    color: var(--on-accent);
  }
  .pw-tabs button:not(.active):hover { color: var(--text); }
  .pw-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 48px;
    margin-bottom: 48px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pw-head-left { display: flex; align-items: baseline; gap: 8px 16px; flex-wrap: wrap; }
  .pw-sub { flex-basis: 100%; font-size: 1rem; color: var(--mid); }
  .pw-mode { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  .pw-mode-help { font-size: 0.9rem; color: var(--mid); }
  .pw-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    text-transform: uppercase;
    letter-spacing: -1px;
    line-height: 1;
  }
  .pw-title em {
    -webkit-text-stroke: 2px var(--text);
    color: transparent;
    font-style: normal;
  }
  .pw-live {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
  }

  .pw-cta-wrap {
    padding: 40px 48px 0;
    display: flex;
    justify-content: center;
  }
  .pw-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--on-accent);
    background: var(--accent);
    border: 2px solid var(--accent);
    padding: 14px 48px;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    display: inline-block;
  }
  .pw-cta:hover { background: transparent; color: var(--accent); }

  @media (max-width: 900px) {
    .pw-head { padding: 0 24px; }
    .pw-cta-wrap { padding: 28px 24px 0; }
  }

  @media (max-width: 600px) {
    .pw-head { padding: 0 16px; }
    .pw-mode { width: 100%; align-items: stretch; }
    .pw-tabs { width: 100%; }
    .pw-tabs button { flex: 1; padding: 12px 0; }
    .pw-cta-wrap { padding: 32px 16px 0; }
    .pw-cta { width: 100%; text-align: center; }
  }
</style>
