<script>
  import { onMount } from 'svelte';

  let { badge = null, gamesMonth = 0, userCount = 0, children } = $props();

  const FALLBACK = [
    'https://api.deezer.com/album/302127/image',
    'https://api.deezer.com/album/55483022/image',
    'https://api.deezer.com/album/526894/image',
    'https://api.deezer.com/album/1128639/image',
    'https://api.deezer.com/album/7290289/image',
    'https://api.deezer.com/album/141522612/image',
    'https://api.deezer.com/album/10088148/image',
    'https://api.deezer.com/album/527346/image',
    'https://api.deezer.com/album/41899162/image',
    'https://api.deezer.com/album/9769684/image',
    'https://api.deezer.com/album/6547414/image',
    'https://api.deezer.com/album/12246144/image',
    'https://api.deezer.com/album/1057065/image',
    'https://api.deezer.com/album/79498382/image',
    'https://api.deezer.com/album/4153026/image',
    'https://api.deezer.com/album/134931952/image',
    'https://api.deezer.com/album/78821772/image',
    'https://api.deezer.com/album/2521479/image',
    'https://api.deezer.com/album/302397/image',
    'https://api.deezer.com/album/302063/image',
    'https://api.deezer.com/album/302233/image',
    'https://api.deezer.com/album/2496357/image',
    'https://api.deezer.com/album/1049207/image',
    'https://api.deezer.com/album/79576802/image',
    'https://api.deezer.com/album/107285082/image',
    'https://api.deezer.com/album/104359912/image',
    'https://api.deezer.com/album/2120862/image',
    'https://api.deezer.com/album/3153316/image',
  ];

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
        applyCovers(FALLBACK);
      }
    };

    const sc = document.createElement('script');
    sc.src = 'https://api.deezer.com/chart/0/albums?limit=25&output=jsonp&callback=__dz';
    sc.onerror = () => { if (!done) applyCovers(FALLBACK); };
    document.head.appendChild(sc);
    setTimeout(() => { if (!done) applyCovers(FALLBACK); }, 3000);

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
    {#if badge}
      <div class="live-pill">
        <span class="live-dot"></span>
        {badge}
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

    {#if children}
      <div class="hero-actions">
        {@render children()}
      </div>
    {/if}
  </div>

  <!-- Le Mode Salon, cœur de ZIK : visible dès l'arrivée, sur tous les écrans -->
  <aside class="hero-salon" aria-labelledby="hero-salon-title">
    <div class="hs-screen" aria-hidden="true">
      <div class="hs-screen-top"><b>ZIK Salon</b><span>7F3K2Q</span></div>
      <div class="hs-timer">12</div>
      <div class="hs-choices"><i></i><i></i><i></i><i></i></div>
    </div>
    <p class="hs-kicker">Mode Salon · Blind test de soirée</p>
    <h2 id="hero-salon-title">La TV diffuse.<br>Les téléphones répondent.</h2>
    <ul class="hs-points">
      <li>Un QR code, un pseudo : aucune appli, aucun compte pour les joueurs</li>
      <li>Équipes, classement en direct et podium sur grand écran</li>
      <li>Pour une soirée entre amis, un bar, un camping ou un team building</li>
    </ul>
    <a class="hs-link" href="/salon/play">Rejoindre une soirée avec un code →</a>
    <a class="hs-pro" href="/pro">Bar, camping, entreprise ? Découvrir ZIK Pro</a>
  </aside>
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

  /* ── Badges flottants ── */
  /* ── Panneau Mode Salon ── */
  .hero-salon {
    position: absolute;
    z-index: 3;
    right: clamp(24px, 5vw, 80px);
    top: 50%;
    transform: translateY(-46%);
    width: min(400px, 34vw);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px;
    background: rgb(var(--bg-rgb) / 0.92);
    border: 2px solid var(--text);
    box-shadow: 8px 8px 0 var(--accent);
  }
  .hs-screen {
    padding: 12px;
    background: #000;
    border: 1px solid rgb(255 255 255 / 0.25);
  }
  .hs-screen-top {
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    color: rgb(255 255 255 / 0.6);
  }
  .hs-screen-top b { color: #ff4fff; font-weight: 600; }
  .hs-timer {
    color: #fff;
    margin: 4px 0 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 3.4rem;
    line-height: 1;
    text-align: center;
  }
  .hs-choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .hs-choices i { height: 14px; border-radius: 2px; }
  .hs-choices i:nth-child(1) { background: #ff4f9a; }
  .hs-choices i:nth-child(2) { background: #5bc0eb; }
  .hs-choices i:nth-child(3) { background: #f4e04d; }
  .hs-choices i:nth-child(4) { background: #3ddc84; }
  .hs-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .hero-salon h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 2.2vw, 2.1rem);
    line-height: 0.95;
    text-transform: uppercase;
  }
  .hs-points {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 16px;
    font-size: 0.85rem;
    color: var(--mid);
    line-height: 1.4;
  }
  .hs-link {
    margin-top: 4px;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hs-pro {
    font-size: 0.85rem;
    color: var(--mid);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hs-pro:hover { color: var(--text); }
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
    .hero-salon {
      position: relative;
      right: auto;
      top: auto;
      transform: none;
      width: auto;
      margin: 0 clamp(24px, 5vw, 80px);
      max-width: 520px;
    }
    .hero-inner { max-width: 100%; }
  }

  @media (max-width: 900px) {
    .covers-grid { grid-template-columns: repeat(6, 1fr); grid-auto-rows: calc(100vw / 6); }
  }

  @media (max-width: 768px) {
    .hero-inner { max-width: 100%; }
  }
  @media (max-width: 600px) {
    .hero-title { font-size: clamp(2.8rem, 13vw, 5rem); }
    .covers-grid { grid-template-columns: repeat(4, 1fr); grid-auto-rows: calc(100vw / 4); }

  }
</style>
