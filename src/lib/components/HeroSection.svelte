<script>
  import { onMount } from 'svelte';
  import ChallengeIcon from '$lib/components/ChallengeIcon.svelte';
  import { dicebear } from '$lib/utils.js';

  let { badge = null, playlistCount = 0, gamesMonth = 0, userCount = 0, roomCount = 0, challenge = null, children } = $props();

  let challengeOpen = $state(true);

  let now = $state(Date.now());
  $effect(() => {
    if (!challenge) return;
    const t = setInterval(() => { now = Date.now(); }, 60_000);
    return () => clearInterval(t);
  });

  const pct = $derived(
    challenge ? Math.min(100, Math.round((challenge.current_value / challenge.target) * 100)) : 0,
  );

  const timeLeft = $derived.by(() => {
    if (!challenge) return '';
    const end = new Date(`${challenge.week_end}T23:59:59+02:00`).getTime();
    const diffMs = end - now;
    if (diffMs <= 0) return 'Se termine bientôt';
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}j ${hours}h restantes`;
    return `${hours}h restantes`;
  });

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

<svelte:window onclick={() => { challengeOpen = false; }} />

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
    <div class="hero-pills">
      {#if badge}
        <div class="live-pill">
          <span class="live-dot"></span>
          {badge}
        </div>
      {/if}

      {#if challenge}
        <div class="challenge-widget">
          <button
            class="challenge-toggle"
            onclick={(e) => { e.stopPropagation(); challengeOpen = !challengeOpen; }}
            aria-expanded={challengeOpen}
          >
            <ChallengeIcon type={challenge.type} size={13} />
            <span>{pct}%</span>
            <svg
              class="challenge-chevron"
              class:open={challengeOpen}
              width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            ><path d="M6 9l6 6 6-6" /></svg>
          </button>

          {#if challengeOpen}
            <div class="challenge-panel">
              <div class="challenge-panel-head">
                <span class="challenge-panel-label">{challenge.label}</span>
                <span class="challenge-panel-countdown">{timeLeft}</span>
              </div>
              <div class="challenge-panel-bar"><div class="challenge-panel-fill" style="width:{pct}%"></div></div>
              <span class="challenge-panel-value">{challenge.current_value.toLocaleString('fr-FR')} / {challenge.target.toLocaleString('fr-FR')} {challenge.unit}</span>
              {#if challenge.top?.length}
                <div class="challenge-panel-top">
                  {#each challenge.top.slice(0, 3) as t, i (t.profiles?.username ?? i)}
                    <div class="challenge-panel-row">
                      <span class="challenge-panel-rank">{i + 1}</span>
                      <img src={t.profiles?.avatar_url || dicebear(t.profiles?.username ?? '?')} alt="" width="18" height="18" loading="lazy" />
                      <span class="challenge-panel-name">{t.profiles?.username ?? 'Joueur'}</span>
                      <span class="challenge-panel-amount">{t.amount}</span>
                    </div>
                  {/each}
                </div>
              {/if}
              <a class="challenge-panel-link" href="/defi">Voir le défi →</a>
            </div>
          {/if}
        </div>
      {/if}
    </div>

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
  <div class="badge b4" aria-hidden="true">
    <span class="badge-big">{userCount > 0 ? fmt(userCount) : '—'}</span>
    <span class="badge-lbl">Joueurs inscrits</span>
  </div>
  <div class="badge b5" aria-hidden="true">
    <span class="badge-big">{roomCount > 0 ? fmt(roomCount) : '—'}</span>
    <span class="badge-lbl">Rooms publiques</span>
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

  .hero-pills {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
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

  /* ── Pastille défi hebdo ── */
  .challenge-widget { position: relative; }

  .challenge-toggle {
    -webkit-appearance: none;
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgb(var(--bg-rgb) / 0.8);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    padding: 6px 13px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--accent);
    cursor: pointer;
    transform: rotate(1deg);
    transition: border-color 0.15s;
  }
  .challenge-toggle:hover { border-color: rgb(var(--accent-rgb) / 0.6); }
  .challenge-chevron { transition: transform 0.2s; }
  .challenge-chevron.open { transform: rotate(180deg); }

  .challenge-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 4;
    width: min(300px, 82vw);
    background: rgb(var(--bg-rgb) / 0.97);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    padding: 16px;
    animation: challenge-panel-in 0.18s ease both;
  }
  @keyframes challenge-panel-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .challenge-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 8px;
  }
  .challenge-panel-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.85rem;
    text-transform: uppercase;
    color: var(--text);
  }
  .challenge-panel-countdown {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgb(var(--c-glass) / 0.55);
    white-space: nowrap;
  }
  .challenge-panel-bar {
    height: 7px;
    background: rgb(var(--c-glass) / 0.1);
    border: 1px solid rgb(var(--c-glass) / 0.12);
    overflow: hidden;
    margin-bottom: 6px;
  }
  .challenge-panel-fill { height: 100%; background: var(--accent); transition: width 0.6s ease; }
  .challenge-panel-value {
    display: block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    color: rgb(var(--c-glass) / 0.6);
    margin-bottom: 12px;
  }
  .challenge-panel-top {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  .challenge-panel-row { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; }
  .challenge-panel-rank {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 0.7rem;
    color: rgb(var(--c-glass) / 0.5);
    width: 14px;
    flex-shrink: 0;
  }
  .challenge-panel-row img { border-radius: 50%; flex-shrink: 0; }
  .challenge-panel-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }
  .challenge-panel-amount { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; color: var(--accent); }
  .challenge-panel-link {
    display: inline-block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgb(var(--c-glass) / 0.55);
    border-bottom: 1px solid rgb(var(--c-glass) / 0.2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .challenge-panel-link:hover { color: var(--accent); }

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
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgb(var(--c-glass) / 0.35);
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
    background: rgb(var(--bg-rgb) / 0.85);
    border: 2px solid var(--accent);
    padding: 18px 24px;
    animation: float1 4s ease-in-out infinite;
  }
  .b1 .badge-big { font-size: 2.8rem; color: var(--accent); }
  .b1 .badge-lbl { color: rgb(var(--c-glass) / 0.45); }

  /* b2 — fond magenta plein, incliné */
  .b2 {
    right: 33%;
    bottom: 22%;
    background: var(--accent);
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
    color: var(--on-accent);
  }

  /* b3 — fond sombre + border blanche */
  .b3 {
    right: 8%;
    bottom: 38%;
    background: rgb(var(--bg-rgb) / 0.82);
    border: 1px solid rgb(var(--c-glass) / 0.35);
    padding: 14px 18px;
    animation: float1 3.5s ease-in-out 1s infinite;
  }
  .b3 .badge-big { font-size: 1.5rem; color: var(--text); }
  .b3 .badge-lbl { color: rgb(var(--c-glass) / 0.7); }

  /* b4 — joueurs inscrits, fond sombre + border blanche */
  .b4 {
    right: 28%;
    top: 16%;
    background: rgb(var(--bg-rgb) / 0.82);
    border: 1px solid rgb(var(--c-glass) / 0.35);
    padding: 14px 18px;
    animation: float2 4.5s ease-in-out 0.5s infinite;
  }
  .b4 .badge-big { font-size: 1.5rem; color: var(--text); }
  .b4 .badge-lbl { color: rgb(var(--c-glass) / 0.7); }

  /* b5 — rooms publiques, fond sombre + border magenta fine */
  .b5 {
    right: 14%;
    bottom: 14%;
    background: rgb(var(--bg-rgb) / 0.85);
    border: 1px solid rgb(var(--accent-rgb) / 0.55);
    padding: 14px 18px;
    animation: float1 4.2s ease-in-out 0.8s infinite;
  }
  .b5 .badge-big { font-size: 1.5rem; color: var(--accent); }
  .b5 .badge-lbl { color: rgb(var(--c-glass) / 0.6); }

  @keyframes float1 {
    0%, 100% { transform: rotate(2.5deg) translateY(0); }
    50%       { transform: rotate(2.5deg) translateY(-8px); }
  }

  @keyframes float2 {
    0%, 100% { transform: rotate(-1.8deg) translateY(0); }
    50%       { transform: rotate(-1.8deg) translateY(-5px); }
  }

  @media (max-width: 900px) {
    .b1, .b2, .b3, .b4, .b5 { display: none; }
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
