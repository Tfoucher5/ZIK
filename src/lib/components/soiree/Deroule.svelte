<!-- Le déroulé d'une soirée, heure par heure, avec ce qu'affichent les écrans -->
<script>
  import { reveal } from '$lib/components/home/reveal.js';
  import MiniTv from './MiniTv.svelte';
  import { DEROULE } from './soireeContent.js';

  const JOUEURS = [
    ['Julie', 0], ['Max', 1], ['Inès', 0], ['Tom', 1], ['Léa', 0], ['Sam', 1], ['Nora', 0],
  ];
  const PODIUM = [
    ['Les Rouges', 2840, 2],
    ['Les Bleus', 3120, 1],
    ['Les Verts', 2410, 3],
  ];
</script>

<section class="dr" id="comment">
  <h2 class="dr-title">Une soirée,<br />heure par heure</h2>

  <ol class="dr-list">
    {#each DEROULE as step, i (step.time)}
      <li class="dr-step" use:reveal>
        <time class="dr-time">{step.time}</time>
        <div class="dr-text">
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </div>
        <div class="dr-visual" aria-hidden="true">
          {#if i === 0}
            <div class="v-bar">
              <b>ZIK.</b>
              <span class="v-code">7F3K2Q</span>
              <span class="v-sep"></span>
              <span>Manche 1/10</span>
              <span class="v-regie">Régie connectée</span>
            </div>
          {:else if i === 1}
            <div class="v-join">
              <p class="v-count"><b>{JOUEURS.length}</b> joueurs</p>
              <ul>
                {#each JOUEURS as [nom, team] (nom)}<li class="t{team}">{nom}</li>{/each}
              </ul>
            </div>
          {:else if i === 2}
            <div class="v-round"><MiniTv timer={7} labels={['Daft Punk', 'Justice', 'Air', 'Phoenix']} /></div>
          {:else}
            <div class="v-podium">
              {#each PODIUM as [nom, pts, rang] (nom)}
                <div class="v-place p{rang}">
                  <span class="v-name">{nom}</span>
                  <span class="v-pts">{pts.toLocaleString('fr-FR')}</span>
                  <div class="v-step">{rang}</div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .dr {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px);
    border-top: 2px solid var(--text);
  }
  .dr-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.2rem, 4.4vw, 4rem);
    line-height: 0.9;
    text-transform: uppercase;
    margin-bottom: clamp(32px, 5vh, 56px);
  }
  .dr-list { list-style: none; padding: 0; margin: 0; }
  .dr-step {
    display: grid;
    grid-template-columns: 120px minmax(0, 5fr) minmax(0, 6fr);
    gap: clamp(20px, 3vw, 48px);
    align-items: center;
    padding: clamp(28px, 4vh, 44px) 0;
    border-top: 1px solid var(--border);
  }
  .dr-time {
    align-self: start;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .dr-text h3 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 2.4vw, 2.2rem);
    line-height: 0.95;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .dr-text p { color: var(--mid); line-height: 1.6; max-width: 48ch; }

  /* 19:45 : la barre du haut de la TV */
  .v-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    padding: 14px 18px;
    background: #080808;
    color: rgb(255 255 255 / 0.75);
    border: 2px solid var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
  }
  .v-bar b { font-family: 'Barlow Condensed', sans-serif; font-size: 1.4rem; font-weight: 900; color: #fff; }
  .v-code { letter-spacing: 0.25em; color: #fff; }
  .v-sep { flex: 1; }
  .v-regie { color: #3ddc84; }
  .v-regie::before { content: '● '; }

  /* 20:00 : les joueurs arrivent */
  .v-join { border: 2px solid var(--text); padding: 18px; }
  .v-count { font-family: 'JetBrains Mono', monospace; color: var(--mid); margin-bottom: 12px; }
  .v-count b { font-size: 2rem; color: var(--text); margin-right: 6px; }
  .v-join ul { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; padding: 0; margin: 0; }
  .v-join li {
    padding: 6px 12px;
    font-weight: 700;
    font-size: 0.85rem;
    border: 1px solid var(--border2);
    border-left: 4px solid #ff4f9a;
  }
  .v-join li.t1 { border-left-color: #5bc0eb; }

  /* 20:10 : la manche */
  .v-round { max-width: 380px; border: 2px solid var(--text); box-shadow: 8px 8px 0 var(--accent); }

  /* 22:30 : le podium */
  .v-podium { display: grid; grid-template-columns: repeat(3, 1fr); align-items: end; gap: 6px; max-width: 420px; }
  .v-place { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
  .v-name { font-weight: 800; font-size: 0.9rem; }
  .v-pts { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--mid); }
  .v-step {
    width: 100%;
    display: grid;
    place-items: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2rem;
    color: #000;
  }
  .p1 .v-step { height: 120px; background: #fbbf24; }
  .p2 .v-step { height: 84px; background: #94a3b8; }
  .p3 .v-step { height: 60px; background: #d97706; }

  @media (max-width: 900px) {
    .dr-step { grid-template-columns: minmax(0, 1fr); gap: 14px; }
    .dr-time { font-size: 1.1rem; }
    .dr-visual { margin-top: 6px; }
  }
</style>
