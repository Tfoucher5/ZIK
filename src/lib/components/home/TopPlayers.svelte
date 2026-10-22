<script>
  import { dicebear } from '$lib/shared/utils.js';
  import { reveal } from './reveal.js';

  let { players = [] } = $props();
</script>

<section class="chart" id="leaderboards" use:reveal>
  <div class="chart-head">
    <div>
      <h2 class="chart-h">Top Joueurs</h2>
      <span class="chart-sub">Niveau ELO actuel · Rooms en ligne</span>
    </div>
  </div>

  {#if players.length === 0}
    <p class="chart-empty">Chargement…</p>
  {:else}
    {#each players.slice(0, 5) as p, i (p.username)}
      <a href="/user/{p.username}" class="chart-row">
        <span class="chart-pos" class:top3={i < 3}>{i + 1}</span>
        <img class="chart-avatar" src={p.avatar_url || dicebear(p.username)} alt={p.username} width="32" height="32" loading="lazy" decoding="async" />
        <div class="chart-info">
          <div class="c-nm">{p.username}</div>
          <div class="c-sb">{p.games_played} partie{p.games_played !== 1 ? 's' : ''}</div>
        </div>
        <div class="chart-elo">{p.elo}<small title="Score de niveau : il monte quand tu bats des joueurs mieux classés">pts ELO ⓘ</small></div>
      </a>
    {/each}
  {/if}

  <div class="chart-cta-wrap">
    <a href="/classements" class="chart-cta">Classement complet →</a>
  </div>
</section>

<style>
  .chart {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.04);
    position: relative;
    overflow: hidden;
  }
  .chart::before {
    content: 'ZIK.';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-8deg);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 28vw;
    color: transparent;
    -webkit-text-stroke: 2px rgb(var(--accent-rgb) / 0.14);
    pointer-events: none;
    letter-spacing: -0.04em;
    line-height: 1;
    white-space: nowrap;
  }
  .chart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .chart-h {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 5vw, 3.5rem);
    text-transform: uppercase;
    letter-spacing: -1px;
  }
  .chart-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    margin-bottom: 36px;
    display: block;
  }
  .chart-empty { color: var(--mid); font-size: 0.85rem; padding: 24px 0; }

  .chart-cta-wrap {
    padding: 40px 0 0;
    display: flex;
    justify-content: center;
  }
  .chart-cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text);
    background: transparent;
    border: 2px solid rgb(var(--c-glass) / 0.25);
    padding: 14px 48px;
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    display: inline-block;
    position: relative;
    z-index: 1;
  }
  .chart-cta:hover { border-color: var(--accent); color: var(--accent); }
  .chart-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: #222;
    flex-shrink: 0;
  }
  .chart-row {
    display: grid;
    grid-template-columns: 56px 36px 1fr 110px;
    gap: 16px;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.05);
    cursor: pointer;
    position: relative;
    text-decoration: none;
    color: inherit;
    transition: color 0.15s;
  }
  .chart-row::after {
    content: '';
    position: absolute;
    left: 0; bottom: 0; right: 0; height: 1px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.25s;
  }
  .chart-row:hover::after { transform: scaleX(1); }
  .chart-pos {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.8rem;
    line-height: 1;
    color: rgb(var(--c-glass) / 0.5);
    letter-spacing: -1px;
  }
  .top3 { color: var(--accent) !important; }
  .chart-info { min-width: 0; }
  .c-nm {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
  }
  .c-sb {
    font-size: 0.8rem;
    color: var(--mid);
  }
  .chart-elo {
    text-align: right;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.8rem;
    letter-spacing: -0.5px;
  }
  .chart-elo small {
    font-size: 0.72rem;
    color: var(--mid);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    display: block;
    cursor: help;
  }

  @media (max-width: 900px) {
    .chart { padding: 48px 24px; }
  }

  @media (max-width: 600px) {
    .chart { padding: 60px 16px; }
    .chart-row { grid-template-columns: 40px 28px 1fr 80px; gap: 10px; padding: 18px 0; }
    .chart-avatar { width: 28px; height: 28px; }
  }
</style>
