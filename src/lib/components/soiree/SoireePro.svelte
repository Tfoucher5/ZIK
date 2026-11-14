<script>
  import { reveal } from '$lib/components/home/reveal.js';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS, PRO_PERKS } from '$lib/data/proPlans.js';
  import { PRIX_SOIREE } from './soireeContent.js';
</script>

<section class="sp" use:reveal>
  <div class="sp-free">
    <p class="sp-kicker">Gratuit</p>
    <p class="sp-big"><b>{FREE_MAX_PLAYERS}</b> joueurs<br /><b>{FREE_MAX_TEAMS}</b> équipes</p>
    <p class="sp-small">Sans carte bancaire, autant de soirées que vous voulez.</p>
  </div>
  <div class="sp-pro">
    <h2>ZIK Pro, pour aller plus loin</h2>
    <ul>
      {#each PRO_PERKS as p (p)}<li>{p}</li>{/each}
    </ul>
    <div class="sp-actions">
      <a href="/pro" class="btn-ghost">Voir les formules</a>
      <span class="sp-price">dès <b>{PRIX_SOIREE}</b> la soirée</span>
    </div>
  </div>
</section>

<style>
  .sp {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px);
    border-top: 2px solid var(--text);
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: clamp(28px, 5vw, 72px);
  }
  .sp-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .sp-big {
    margin: 12px 0;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 3.6vw, 3.2rem);
    line-height: 0.95;
    text-transform: uppercase;
  }
  .sp-big b { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
  .sp-small { color: var(--mid); }
  .sp-pro h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
    line-height: 0.95;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .sp-pro ul {
    list-style: none;
    padding: 0;
    margin: 0;
    columns: 2 260px;
    column-gap: 32px;
  }
  .sp-pro li {
    break-inside: avoid;
    padding: 9px 0 9px 22px;
    border-top: 1px solid var(--border);
    position: relative;
    line-height: 1.4;
  }
  .sp-pro li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 15px;
    width: 10px;
    height: 2px;
    background: var(--mid);
  }
  .sp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 24px; }
  .sp-price { font-family: 'JetBrains Mono', monospace; color: var(--mid); font-size: 0.85rem; }
  .sp-price b { color: var(--text); }

  @media (max-width: 860px) {
    .sp { grid-template-columns: minmax(0, 1fr); }
  }
</style>
