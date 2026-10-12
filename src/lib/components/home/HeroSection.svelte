<script>
  import { onMount } from 'svelte';
  import HeroSalon from './HeroSalon.svelte';
  import { HERO_COVERS } from './covers.js';

  let { online = 0, gamesMonth = 0, userCount = 0 } = $props();

  let displayOnline = $state(0);

  $effect(() => {
    const target = online;
    if (target === 0) { displayOnline = 0; return; }
    let raf;
    const start = performance.now();
    const from = displayOnline;
    (function tick(now) {
      const p = Math.min((now - start) / 900, 1);
      displayOnline = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    })(start);
    return () => cancelAnimationFrame(raf);
  });

  const COLS = 9;
  const CELLS = COLS * 5;

  let covers = $state(Array(CELLS).fill(''));

  function applyCovers(urls) {
    let pool = [...urls];
    while (pool.length < CELLS) pool = [...pool, ...pool];
    covers = pool.slice(0, CELLS);
  }

  function fmt(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
    return String(n);
  }

  onMount(() => {
    let done = false;

    window.__dz = function (d) {
      done = true;
      const albs = (d && d.data) || [];
      if (albs.length >= 8) {
        applyCovers(albs.map((a) => a.cover_xl || a.cover_big || a.cover_medium));
      } else {
        applyCovers(HERO_COVERS);
      }
    };

    const sc = document.createElement('script');
    sc.src = 'https://api.deezer.com/chart/0/albums?limit=25&output=jsonp&callback=__dz';
    sc.onerror = () => { if (!done) applyCovers(HERO_COVERS); };
    document.head.appendChild(sc);
    setTimeout(() => { if (!done) applyCovers(HERO_COVERS); }, 3000);

    return () => { delete window.__dz; };
  });
</script>

<section class="hero">
  <div class="covers-grid">
    {#each covers as url, i (i)}
      <div
        class="cover-cell"
        style={url ? `background-image:url('${url}');animation-delay:${(i * 0.035).toFixed(2)}s` : ''}
      ></div>
    {/each}
  </div>
  <div class="hero-overlay"></div>

  <div class="hero-inner">
    {#if displayOnline > 0}
      <div class="live-pill">
        <span class="live-dot"></span>
        {displayOnline} joueurs en ligne
      </div>
    {/if}

    <h1 class="hero-title">
      <span class="l1">T'AS</span>
      <span class="l2">L'OREILLE&nbsp;?</span>
      <span class="l3">PROUVE-LE.</span>
    </h1>
    <p class="hero-sub">
      Le blind test gratuit, sans appli : en soirée sur la TV, ou en ligne contre d'autres joueurs.
      {#if userCount > 0}<br><span class="hero-proof">{fmt(userCount)} joueurs inscrits · {fmt(gamesMonth)} parties ce mois</span>{/if}
    </p>

    <div class="hero-actions">
      <a href="/salon" class="btn-accent hero-cta">🎉 Organiser une soirée</a>
      <button class="btn-ghost hero-cta hero-online" onclick={() => document.getElementById('rooms')?.scrollIntoView({behavior:'smooth'})}>Jouer en ligne</button>
    </div>
  </div>

  <HeroSalon />
</section>

<style>
  .hero {
    position: relative;
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    padding-top: 60px;
  }

  .covers-grid {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    grid-auto-rows: calc(100vw / 9);
    gap: 0;
  }

  .cover-cell {
    background: #111;
    background-size: cover;
    background-position: center;
    filter: saturate(0.5) brightness(0.65);
    opacity: 0;
    animation: reveal 0.4s ease forwards;
  }

  @keyframes reveal {
    to { opacity: 1; }
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(108deg, rgb(var(--bg-rgb) / 0.96) 26%, rgb(var(--bg-rgb) / 0.65) 55%, rgb(var(--bg-rgb) / 0.18) 100%),
      linear-gradient(to top, rgb(var(--bg-rgb) / 0.85) 0%, transparent 35%);
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    padding: 0 clamp(24px, 5vw, 80px);
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: min(55vw, 860px);
  }

  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    background: rgb(var(--bg-rgb) / 0.8);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    padding: 6px 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent);
    width: fit-content;
    transform: rotate(-1deg);
  }

  .hero-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(4rem, 11vw, 9rem);
    line-height: 0.88;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    display: flex;
    flex-direction: column;
  }
  .hero-title span { white-space: nowrap; }

  .l1 { color: var(--text); }
  .l2 {
    -webkit-text-stroke: 2px rgb(var(--c-glass) / 0.4);
    color: transparent;
  }
  .l3 { color: var(--accent); }

  .hero-sub {
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.5;
    color: var(--text);
  }

  .hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .hero-cta { padding: 14px 26px; font-size: 0.95rem; }
  .hero-online { color: var(--text); border: 2px solid var(--text); }

  .hero-proof {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--mid);
  }

  /* Tablette et mobile : le panneau passe sous le titre, dans le flux */
  @media (max-width: 1100px) {
    .hero {
      height: auto;
      min-height: 100vh;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      gap: 28px;
      padding: 90px 0 40px;
    }
    .hero-inner { max-width: 100%; }
  }

  @media (max-width: 900px) {
    .covers-grid { grid-template-columns: repeat(6, 1fr); grid-auto-rows: calc(100vw / 6); }
  }

  @media (max-width: 600px) {
    .hero-title { font-size: clamp(2.8rem, 13vw, 5rem); }
    .covers-grid { grid-template-columns: repeat(4, 1fr); grid-auto-rows: calc(100vw / 4); }
  }
</style>
