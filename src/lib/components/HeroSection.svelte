<script>
  import { onMount } from 'svelte';

  let { badge = null, playlistCount = 0, gamesMonth = 0, children } = $props();

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
    <p class="hero-sub">Multijoueur · Temps réel · Classements ELO</p>

    {#if children}
      <div class="hero-actions">
        {@render children()}
      </div>
    {/if}
  </div>

  <div class="badge b1" aria-hidden="true">
    <span class="badge-big">{playlistCount > 0 ? fmt(playlistCount) : '—'}</span>
    <span class="badge-lbl">Playlists publiques</span>
  </div>
  <div class="badge b2" aria-hidden="true">
    <span>Gratuit · Sans inscription</span>
  </div>
  <div class="badge b3" aria-hidden="true">
    <span class="badge-big">{gamesMonth > 0 ? fmt(gamesMonth) : '—'}</span>
    <span class="badge-lbl">Parties ce mois</span>
  </div>
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
      linear-gradient(108deg, rgba(8,8,8,0.96) 26%, rgba(8,8,8,0.65) 55%, rgba(8,8,8,0.18) 100%),
      linear-gradient(to top, rgba(8,8,8,0.85) 0%, transparent 35%);
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
    background: rgba(8,8,8,0.8);
    border: 1px solid rgba(255,0,255,0.35);
    padding: 6px 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #ff00ff;
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

  .l1 { color: #fafafa; }
  .l2 {
    -webkit-text-stroke: 2px rgba(255,255,255,0.4);
    color: transparent;
  }
  .l3 { color: #ff00ff; }

  .hero-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
  }

  .hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  /* ── Badges flottants ── */
  .badge {
    position: absolute;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .badge-big {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    line-height: 1;
  }

  .badge-lbl {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  /* b1 — playlists, fond sombre + border magenta, incliné */
  .b1 {
    right: 17%;
    top: 30%;
    background: rgba(8,8,8,0.85);
    border: 2px solid #ff00ff;
    padding: 18px 24px;
    animation: float1 4s ease-in-out infinite;
  }
  .b1 .badge-big { font-size: 2.8rem; color: #ff00ff; }
  .b1 .badge-lbl { color: rgba(255,255,255,0.45); }

  /* b2 — fond magenta plein, incliné */
  .b2 {
    right: 33%;
    bottom: 22%;
    background: #ff00ff;
    padding: 10px 20px;
    animation: float2 5s ease-in-out infinite;
    flex-direction: row;
    align-items: center;
  }
  .b2 span {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #000;
  }

  /* b3 — fond sombre + border blanche */
  .b3 {
    right: 8%;
    bottom: 38%;
    background: rgba(8,8,8,0.82);
    border: 1px solid rgba(255,255,255,0.35);
    padding: 14px 18px;
    animation: float1 3.5s ease-in-out 1s infinite;
  }
  .b3 .badge-big { font-size: 1.5rem; color: #fafafa; }
  .b3 .badge-lbl { color: rgba(255,255,255,0.7); }

  @keyframes float1 {
    0%, 100% { transform: rotate(2.5deg) translateY(0); }
    50%       { transform: rotate(2.5deg) translateY(-8px); }
  }

  @keyframes float2 {
    0%, 100% { transform: rotate(-1.8deg) translateY(0); }
    50%       { transform: rotate(-1.8deg) translateY(-5px); }
  }

  @media (max-width: 900px) {
    .b1, .b2, .b3 { display: none; }
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
