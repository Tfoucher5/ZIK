<script>
  import LiveRooms from './LiveRooms.svelte';
  import RoomCollage from './RoomCollage.svelte';

  let { home } = $props();

  const MODES = [
    { id: 'qcm', label: 'QCM', tag: 'Facile', desc: 'Choisis parmi 4 réponses' },
    { id: 'classic', label: 'Classique', tag: 'Expert', desc: 'Tape le titre ou l’artiste, classement ELO' },
  ];

  let roomsTab = $state('qcm');
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
  </div>

  <div class="pw-modes" role="radiogroup" aria-label="Mode de jeu">
    {#each MODES as m (m.id)}
      <button role="radio" aria-checked={roomsTab === m.id} class:active={roomsTab === m.id} onclick={() => roomsTab = m.id}>
        <span class="pw-mode-label">{m.label} <span class="pw-mode-tag">{m.tag}</span></span>
        <span class="pw-mode-desc">{m.desc}</span>
      </button>
    {/each}
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

  /* ── Choix du mode QCM / Classique ── */
  .pw-modes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 320px));
    gap: 12px;
    padding: 0 48px;
    margin-bottom: 40px;
  }
  .pw-modes button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 16px 20px;
    background: rgb(var(--c-glass) / 0.04);
    border: 2px solid rgb(var(--c-glass) / 0.18);
    color: var(--mid);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .pw-modes button:hover { border-color: rgb(var(--c-glass) / 0.4); color: var(--text); }
  .pw-modes button.active {
    border-color: var(--accent);
    background: rgb(var(--c-glass) / 0.08);
    color: var(--text);
  }
  .pw-mode-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pw-mode-tag {
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    padding: 3px 8px;
    border: 1px solid currentColor;
  }
  .active .pw-mode-tag { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .pw-mode-desc { font-size: 0.9rem; }
  .pw-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 48px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pw-head-left { display: flex; align-items: baseline; gap: 8px 16px; flex-wrap: wrap; }
  .pw-sub { flex-basis: 100%; font-size: 1rem; color: var(--mid); }
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
    .pw-head, .pw-modes { padding: 0 24px; }
    .pw-cta-wrap { padding: 28px 24px 0; }
  }

  @media (max-width: 600px) {
    .pw-head, .pw-modes { padding: 0 16px; }
    .pw-modes { grid-template-columns: 1fr 1fr; gap: 8px; }
    .pw-modes button { padding: 12px 14px; }
    .pw-mode-label { font-size: 1.15rem; flex-wrap: wrap; gap: 6px; }
    .pw-mode-desc { font-size: 0.8rem; }
    .pw-cta-wrap { padding: 32px 16px 0; }
    .pw-cta { width: 100%; text-align: center; }
  }
</style>
