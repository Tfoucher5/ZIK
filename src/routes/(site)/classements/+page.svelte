<script>
  import { onMount } from "svelte";

  let { data } = $props();

  let activeTab = $state("elo");
  let scoreMode = $state("classique");
  let scoreRooms = $state("officielles");
  let scorePeriod = $state("semaine");

  let eloData = $state(data.eloTop20 ?? []);
  let scoreData = $state([]);
  let eloOffset = $state(data.eloTop20?.length ?? 0);
  let scoreOffset = $state(0);
  let eloHasMore = $state((data.eloTop20?.length ?? 0) === 20);
  let scoreHasMore = $state(false);
  let eloLoading = $state(false);
  let scoreLoading = $state(false);
  let scoreInited = $state(false);

  let myRank = $state(null);
  let myUserId = $state(null);
  let myRankLoaded = $state(false);

  let maxEloScore = $derived(eloData.length > 0 ? eloData[0].elo : 1);
  let maxScore = $derived(scoreData.length > 0 ? Number(scoreData[0].total_score) : 1);

  let gapToNext = $derived.by(() => {
    if (!myRank || myRank.rank <= 1) return null;
    const idx = myRank.rank - 2;
    const above = activeTab === "elo" ? eloData[idx] : scoreData[idx];
    if (!above) return null;
    const aboveScore = activeTab === "elo" ? above.elo : Number(above.total_score);
    return aboveScore - myRank.score;
  });

  const sparkles = [
    { x: 8,  y: 22, d: 0,    dur: 2.4 },
    { x: 92, y: 15, d: 0.6,  dur: 2.1 },
    { x: 18, y: 78, d: 1.1,  dur: 2.9 },
    { x: 82, y: 68, d: 1.7,  dur: 2.3 },
    { x: 46, y: 5,  d: 0.4,  dur: 3.0 },
    { x: 54, y: 91, d: 0.9,  dur: 1.9 },
    { x: 3,  y: 50, d: 1.4,  dur: 2.7 },
    { x: 97, y: 53, d: 0.2,  dur: 2.5 },
    { x: 36, y: 10, d: 1.3,  dur: 2.0 },
    { x: 64, y: 86, d: 0.7,  dur: 3.2 },
    { x: 14, y: 62, d: 2.0,  dur: 2.6 },
    { x: 76, y: 33, d: 1.6,  dur: 2.2 },
  ];

  async function fetchScore(reset = false) {
    scoreLoading = true;
    if (reset) { scoreData = []; scoreOffset = 0; scoreInited = false; }
    try {
      const qs = `mode=${scoreMode}&rooms=${scoreRooms}&periode=${scorePeriod}&offset=${reset ? 0 : scoreOffset}`;
      const res = await fetch(`/api/leaderboard/score?${qs}`);
      const rows = await res.json();
      const arr = Array.isArray(rows) ? rows : [];
      if (reset) { scoreData = arr; scoreOffset = arr.length; }
      else { scoreData = [...scoreData, ...arr]; scoreOffset += arr.length; }
      scoreHasMore = arr.length === 20;
    } catch { /* silencieux */ } finally {
      scoreLoading = false;
      scoreInited = true;
    }
  }

  async function loadMoreElo() {
    if (eloLoading || !eloHasMore) return;
    eloLoading = true;
    try {
      const res = await fetch(`/api/leaderboard/elo?offset=${eloOffset}`);
      const rows = await res.json();
      const arr = Array.isArray(rows) ? rows : [];
      eloData = [...eloData, ...arr];
      eloOffset += arr.length;
      eloHasMore = arr.length === 20;
    } catch { /* silencieux */ } finally { eloLoading = false; }
  }

  async function fetchMyRank() {
    if (!myUserId) return;
    myRankLoaded = false;
    try {
      const mode = activeTab === "elo" ? "elo" : scoreMode;
      let qs = `userId=${encodeURIComponent(myUserId)}&mode=${mode}`;
      if (activeTab === "score") qs += `&rooms=${scoreRooms}&periode=${scorePeriod}`;
      const res = await fetch(`/api/leaderboard/my-rank?${qs}`);
      myRank = await res.json();
    } catch { myRank = null; } finally {
      myRankLoaded = true;
    }
  }

  $effect(() => {
    if (activeTab !== "score") return;
    void scoreMode;
    void scoreRooms;
    void scorePeriod;
    fetchScore(true);
  });

  $effect(() => {
    void activeTab;
    void scoreMode;
    void scoreRooms;
    void scorePeriod;
    fetchMyRank();
  });

  onMount(() => {
    myUserId = sessionStorage.getItem("zik_uid") || null;
    fetchMyRank();
  });

  function isMe(u) { return myRank?.username === u; }

  function rankClass(i) {
    if (i === 0) return "rank-gold";
    if (i === 1) return "rank-silver";
    if (i === 2) return "rank-bronze";
    return "";
  }

  function eloPct(elo) {
    return Math.min(100, Math.round((elo / maxEloScore) * 100));
  }
  function scorePct(s) {
    return Math.min(100, Math.round((Number(s) / maxScore) * 100));
  }
</script>

<svelte:head>
  <title>Classements — ZIK</title>
  <meta name="description" content="Classements ZIK — ELO compétitif, scores par mode et par période. Découvrez les meilleurs joueurs de blind test." />
</svelte:head>

<div class="page-nav">
  <a href="/" class="btn-back">← Accueil</a>
</div>

<main class="classements-page">

  <div class="cl-header">
    <h1>Classements</h1>
    <p class="cl-sub">ELO compétitif · Scores classique et QCM · Filtre et explore.</p>
  </div>

  <div class="cl-tabs">
    <button class="cl-tab {activeTab === 'elo' ? 'active' : ''}" onclick={() => activeTab = 'elo'}>
      ⚡ ELO
    </button>
    <button class="cl-tab {activeTab === 'score' ? 'active' : ''}" onclick={() => activeTab = 'score'}>
      🏆 Score
    </button>
  </div>

  <!-- ══════════ HERO ══════════ -->
  {#if activeTab === 'elo' && eloData.length >= 3}
    <div class="cl-hero">

      <!-- Spotlights -->
      <div class="spot spot-gold"></div>
      <div class="spot spot-silver"></div>
      <div class="spot spot-bronze"></div>

      <!-- Sparkles -->
      {#each sparkles as s}
        <div class="sparkle" style="left:{s.x}%;top:{s.y}%;animation-delay:{s.d}s;animation-duration:{s.dur}s"></div>
      {/each}

      <div class="hero-eyebrow">⚡ Rooms officielles · Mode Classique · All-time</div>

      <div class="podium-hero">

        <!-- 2e -->
        <div class="hero-card hero-silver" style="animation-delay:0.1s">
          <div class="hero-pos silver-text">2</div>
          <a href="/user/{eloData[1].username}">
            {#if eloData[1].avatar_url}
              <img class="hero-av av-silver" src={eloData[1].avatar_url} alt={eloData[1].username} width="68" height="68" loading="lazy" />
            {:else}
              <div class="hero-av hero-av-fb av-silver" style="width:68px;height:68px">{eloData[1].username[0].toUpperCase()}</div>
            {/if}
          </a>
          <div class="hero-name {isMe(eloData[1].username) ? 'is-me' : ''}">{eloData[1].username}</div>
          <div class="hero-elo silver-text">{eloData[1].elo} ELO</div>
          <div class="hero-games">{eloData[1].games_played} parties</div>
        </div>

        <!-- 1er – anneau tournant -->
        <div class="gold-ring" style="animation-delay:0s">
          <div class="gold-ring-spin"></div>
          <div class="hero-card hero-gold">
            <div class="hero-shimmer"></div>
            <div class="champion-badge">Champion</div>
            <div class="hero-crown">👑</div>
            <div class="hero-pos gold-text">1</div>
            <a href="/user/{eloData[0].username}" class="hero-av-wrap">
              {#if eloData[0].avatar_url}
                <img class="hero-av av-gold" src={eloData[0].avatar_url} alt={eloData[0].username} width="96" height="96" loading="lazy" />
              {:else}
                <div class="hero-av hero-av-fb av-gold" style="width:96px;height:96px">{eloData[0].username[0].toUpperCase()}</div>
              {/if}
              <div class="av-halo"></div>
            </a>
            <div class="hero-name hero-name-1 {isMe(eloData[0].username) ? 'is-me' : ''}">{eloData[0].username}</div>
            <div class="hero-elo gold-text">{eloData[0].elo} ELO</div>
            <div class="hero-games">{eloData[0].games_played} parties</div>
          </div>
        </div>

        <!-- 3e -->
        <div class="hero-card hero-bronze" style="animation-delay:0.18s">
          <div class="hero-pos bronze-text">3</div>
          <a href="/user/{eloData[2].username}">
            {#if eloData[2].avatar_url}
              <img class="hero-av av-bronze" src={eloData[2].avatar_url} alt={eloData[2].username} width="56" height="56" loading="lazy" />
            {:else}
              <div class="hero-av hero-av-fb av-bronze" style="width:56px;height:56px">{eloData[2].username[0].toUpperCase()}</div>
            {/if}
          </a>
          <div class="hero-name {isMe(eloData[2].username) ? 'is-me' : ''}">{eloData[2].username}</div>
          <div class="hero-elo bronze-text">{eloData[2].elo} ELO</div>
          <div class="hero-games">{eloData[2].games_played} parties</div>
        </div>

      </div>
    </div>
  {:else if activeTab === 'elo'}
    <div class="cl-hint">Rooms officielles · Mode classique · All-time</div>
  {/if}

  <!-- ══════════ FILTRES (Score) ══════════ -->
  {#if activeTab === 'score'}
    <div class="cl-filters">
      <div class="filter-group">
        <span class="filter-label">Mode</span>
        <div class="filter-pills">
          <button class="pill {scoreMode === 'classique' ? 'active' : ''}" onclick={() => scoreMode = 'classique'}>Classique</button>
          <button class="pill {scoreMode === 'qcm' ? 'active' : ''}" onclick={() => scoreMode = 'qcm'}>QCM</button>
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Rooms</span>
        <div class="filter-pills">
          <button class="pill {scoreRooms === 'officielles' ? 'active' : ''}" onclick={() => scoreRooms = 'officielles'}>Officielles</button>
          <button class="pill {scoreRooms === 'toutes' ? 'active' : ''}" onclick={() => scoreRooms = 'toutes'}>Toutes</button>
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Période</span>
        <div class="filter-pills">
          <button class="pill {scorePeriod === 'semaine' ? 'active' : ''}" onclick={() => scorePeriod = 'semaine'}>Semaine</button>
          <button class="pill {scorePeriod === 'mois' ? 'active' : ''}" onclick={() => scorePeriod = 'mois'}>Mois</button>
          <button class="pill {scorePeriod === 'alltime' ? 'active' : ''}" onclick={() => scorePeriod = 'alltime'}>All-time</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ══════════ GRILLE ══════════ -->
  <div class="cl-grid">

    <div class="cl-main">

      <!-- ELO table -->
      {#if activeTab === 'elo'}
        <table class="cl-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-player">Joueur</th>
              <th class="col-score">ELO</th>
              <th class="col-extra">Niveau</th>
              <th class="col-games">Parties</th>
            </tr>
          </thead>
          <tbody>
            {#each eloData as p, i}
              <tr class="cl-row {isMe(p.username) ? 'row-me' : ''} {rankClass(i)}">
                <td class="col-rank">{i + 1}</td>
                <td class="col-player">
                  {#if p.avatar_url}
                    <img class="row-av" src={p.avatar_url} alt={p.username} width="30" height="30" loading="lazy" />
                  {:else}
                    <div class="row-av row-av-fb">{p.username[0].toUpperCase()}</div>
                  {/if}
                  <a href="/user/{p.username}" class="row-name">{p.username}</a>
                  {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
                </td>
                <td class="col-score">
                  <span class="score-val">{p.elo}</span>
                  <div class="score-bar"><div class="score-fill" style="width:{eloPct(p.elo)}%"></div></div>
                </td>
                <td class="col-extra">Nv.&nbsp;{p.level}</td>
                <td class="col-games">{p.games_played}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if eloHasMore}
          <button class="btn-load-more" onclick={loadMoreElo} disabled={eloLoading}>
            {eloLoading ? 'Chargement…' : 'Charger plus'}
          </button>
        {/if}
      {/if}

      <!-- Score table -->
      {#if activeTab === 'score'}
        {#if scoreLoading && scoreData.length === 0}
          <p class="cl-empty">Chargement…</p>
        {:else if scoreData.length === 0 && scoreInited}
          <p class="cl-empty">Aucun résultat pour ces filtres.</p>
        {:else}
          <table class="cl-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-player">Joueur</th>
                <th class="col-score">Score</th>
                <th class="col-games">Parties</th>
              </tr>
            </thead>
            <tbody>
              {#each scoreData as p, i}
                <tr class="cl-row {isMe(p.username) ? 'row-me' : ''} {rankClass(i)}">
                  <td class="col-rank">{i + 1}</td>
                  <td class="col-player">
                    {#if p.avatar_url}
                      <img class="row-av" src={p.avatar_url} alt={p.username} width="30" height="30" loading="lazy" />
                    {:else}
                      <div class="row-av row-av-fb">{p.username[0].toUpperCase()}</div>
                    {/if}
                    <a href="/user/{p.username}" class="row-name">{p.username}</a>
                    {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
                  </td>
                  <td class="col-score">
                    <span class="score-val">{Number(p.total_score).toLocaleString('fr-FR')} pts</span>
                    <div class="score-bar"><div class="score-fill" style="width:{scorePct(p.total_score)}%"></div></div>
                  </td>
                  <td class="col-games">{p.games_count}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if scoreHasMore}
            <button class="btn-load-more" onclick={() => fetchScore(false)} disabled={scoreLoading}>
              {scoreLoading ? 'Chargement…' : 'Charger plus'}
            </button>
          {/if}
        {/if}
      {/if}

    </div>

    <!-- ══ Sidebar ══ -->
    <div class="cl-sidebar">
      <div class="sidebar-card">
        {#if !myUserId}
          <div class="sb-guest-icon">🏆</div>
          <p class="sb-guest-text">Connecte-toi pour suivre ta position en temps réel.</p>
          <a href="/" class="sb-cta">Se connecter</a>
        {:else if !myRankLoaded}
          <div class="sb-label">Ta position</div>
          <div class="sb-loading">…</div>
        {:else if myRank}
          <div class="sb-label">Ta position</div>
          <div class="sb-rank">#{myRank.rank}</div>
          <div class="sb-username">{myRank.username}</div>
          <div class="sb-score">
            {activeTab === 'elo' ? `${myRank.score} ELO` : `${Number(myRank.score).toLocaleString('fr-FR')} pts`}
          </div>
          <div class="sb-games">{myRank.games_count} partie{myRank.games_count > 1 ? 's' : ''}</div>
          {#if gapToNext !== null && gapToNext > 0}
            <div class="sb-gap">
              +{activeTab === 'elo' ? gapToNext : Number(gapToNext).toLocaleString('fr-FR')} pour monter au #{myRank.rank - 1}
            </div>
          {/if}
          <a href="/rooms" class="sb-cta">Jouer maintenant</a>
        {:else}
          <div class="sb-label">Ta position</div>
          <div class="sb-none">Pas encore classé dans cette catégorie.</div>
          <a href="/rooms" class="sb-cta">Jouer maintenant</a>
        {/if}
      </div>
    </div>

  </div>
</main>

<style>
  /* ─── Navigation ─── */
  .page-nav {
    max-width: 1300px;
    margin: 0 auto;
    padding: 16px 28px 0;
  }
  .btn-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.8rem; font-weight: 600; color: var(--dim);
    text-decoration: none;
    padding: 6px 12px; border-radius: 8px;
    border: 1px solid var(--border);
    background: rgb(var(--c-glass) / 0.03);
    transition: color 0.15s, background 0.15s;
  }
  .btn-back:hover { color: var(--text); background: rgb(var(--c-glass) / 0.08); }

  /* ─── Page ─── */
  .classements-page {
    max-width: 1300px;
    margin: 0 auto;
    padding: 28px 28px 80px;
  }

  .cl-header { text-align: center; margin-bottom: 28px; }
  .cl-header h1 { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; margin-bottom: 6px; }
  .cl-sub { color: var(--dim); font-size: 0.88rem; }

  /* ─── Onglets ─── */
  .cl-tabs {
    display: flex; gap: 6px;
    margin: 0 auto 32px;
    max-width: 300px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 4px;
  }
  .cl-tab {
    flex: 1; padding: 9px 0; border-radius: 9px;
    border: none; background: transparent;
    color: var(--dim); font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: background 0.18s, color 0.18s;
  }
  .cl-tab.active {
    background: rgb(var(--c-glass) / 0.14);
    color: var(--text);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.14);
  }

  /* ─── Couleurs métal ─── */
  .gold-text   { color: #f0b429; }
  .silver-text { color: #b8ccd4; }
  .bronze-text { color: #d4844a; }

  /* ════════════════════════ HERO ════════════════════════ */
  .cl-hero {
    position: relative;
    background: linear-gradient(175deg,
      rgb(var(--c-glass) / 0.09) 0%,
      rgb(var(--c-glass) / 0.04) 60%,
      rgb(var(--c-glass) / 0.07) 100%
    );
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 48px 32px 44px;
    margin-bottom: 32px;
    overflow: hidden;
  }

  /* Spotlights */
  .spot {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(60px);
  }
  .spot-gold   { width: 320px; height: 200px; top: -40px; left: 50%; transform: translateX(-50%); background: rgba(240,180,41,0.09); }
  .spot-silver { width: 200px; height: 160px; bottom: 10px; left: 8%;  background: rgba(176,190,197,0.07); }
  .spot-bronze { width: 180px; height: 140px; bottom: 10px; right: 8%; background: rgba(205,130,70,0.07); }

  /* Sparkles */
  .sparkle {
    position: absolute;
    width: 3px; height: 3px;
    border-radius: 50%;
    background: rgba(240,180,41,0.75);
    pointer-events: none;
    animation: sparkle-blink var(--dur,2.4s) var(--delay,0s) ease-in-out infinite;
  }
  @keyframes sparkle-blink {
    0%, 100% { opacity: 0; transform: scale(0.2); }
    50%       { opacity: 1; transform: scale(1); }
  }

  .hero-eyebrow {
    position: relative; z-index: 1;
    display: block; width: fit-content; margin: 0 auto 36px;
    font-size: 0.65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--text);
    background: rgb(var(--c-glass) / 0.14);
    border: 1px solid var(--border);
    border-radius: 20px; padding: 5px 16px;
  }

  .podium-hero {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 16px;
  }

  /* ─── Cartes hero ─── */
  .hero-card {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
    gap: 7px; text-align: center;
    padding: 24px 20px 20px;
    border-radius: 18px;
    background: rgb(var(--c-glass) / 0.07);
    border: 1px solid var(--border);
    min-width: 148px;
    animation: hero-rise 0.5s ease both;
  }

  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .hero-silver {
    background: linear-gradient(160deg, rgba(176,190,197,0.09) 0%, rgba(176,190,197,0.02) 100%);
    border-color: rgba(176,190,197,0.3);
    box-shadow: 0 6px 30px rgba(0,0,0,0.2);
  }
  .hero-bronze {
    background: linear-gradient(160deg, rgba(205,130,70,0.09) 0%, rgba(205,130,70,0.02) 100%);
    border-color: rgba(205,130,70,0.3);
    box-shadow: 0 6px 30px rgba(0,0,0,0.2);
  }
  .hero-gold {
    min-width: 188px;
    padding: 30px 24px 24px;
    background: linear-gradient(160deg, rgba(240,180,41,0.14) 0%, rgba(240,180,41,0.03) 100%);
    border: none;
    border-radius: 16px;
    overflow: hidden;
  }

  /* Shimmer sweep sur la carte or */
  .hero-shimmer {
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    animation: shimmer 4s ease-in-out 0.6s infinite;
    pointer-events: none;
  }
  @keyframes shimmer {
    0%       { left: -100%; }
    40%, 100% { left: 160%; }
  }

  /* ─── Anneau tournant (or) ─── */
  .gold-ring {
    position: relative;
    border-radius: 20px;
    padding: 2px;
    overflow: hidden;
    animation: ring-glow 3.5s ease-in-out infinite, hero-rise 0.4s ease both;
  }
  .gold-ring-spin {
    position: absolute;
    inset: -55%;
    background: conic-gradient(
      from 0deg,
      transparent    0deg,
      #f0b429       60deg,
      #fff8d0      120deg,
      #e6940c      180deg,
      #fff3a0      240deg,
      #f0b429      300deg,
      transparent  360deg
    );
    animation: ring-spin 2.8s linear infinite;
    z-index: 0;
  }
  @keyframes ring-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes ring-glow {
    0%, 100% { box-shadow: 0 0 30px rgba(240,180,41,0.18), 0 12px 50px rgba(0,0,0,0.28); }
    50%       { box-shadow: 0 0 70px rgba(240,180,41,0.38), 0 12px 50px rgba(0,0,0,0.28); }
  }

  /* ─── Badge champion ─── */
  .champion-badge {
    position: absolute;
    top: -10px; left: 50%; transform: translateX(-50%);
    font-size: 0.52rem; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.18em;
    color: #1a1000;
    background: linear-gradient(135deg, #f5d020, #f0b429, #e6940c);
    padding: 3px 12px; border-radius: 20px;
    white-space: nowrap; box-shadow: 0 2px 8px rgba(240,180,41,0.4);
  }

  .hero-crown {
    font-size: 1.5rem; line-height: 1;
    animation: crown-float 2.6s ease-in-out infinite;
  }
  @keyframes crown-float {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50%       { transform: translateY(-7px) rotate(3deg); }
  }

  .hero-pos {
    font-size: 2.8rem; font-weight: 900; line-height: 1;
    letter-spacing: -0.04em;
  }
  .hero-gold .hero-pos {
    font-size: 3.6rem;
    background: linear-gradient(160deg, #f5d020, #f0b429, #e67e00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 2px 8px rgba(240,180,41,0.5));
  }

  .hero-av-wrap { position: relative; display: inline-block; }
  .hero-av {
    display: block; border-radius: 50%; object-fit: cover;
    border: 3px solid var(--border);
  }
  .hero-av-fb {
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 1.4rem;
    background: rgb(var(--c-glass) / 0.14); color: var(--text);
    border: 3px solid var(--border);
  }
  .av-gold   { border-color: #f0b429 !important; box-shadow: 0 0 22px rgba(240,180,41,0.6); }
  .av-silver { border-color: #b8ccd4 !important; box-shadow: 0 0 12px rgba(176,190,197,0.4); }
  .av-bronze { border-color: #d4844a !important; box-shadow: 0 0 12px rgba(205,130,70,0.4); }

  /* Double halo pulsant autour de l'avatar #1 */
  .av-halo {
    position: absolute;
    inset: -7px; border-radius: 50%;
    border: 2px solid rgba(240,180,41,0.55);
    animation: halo 2.2s ease-in-out infinite;
    pointer-events: none;
  }
  .av-halo::after {
    content: '';
    position: absolute; inset: -8px; border-radius: 50%;
    border: 1px solid rgba(240,180,41,0.2);
    animation: halo 2.2s 0.5s ease-in-out infinite;
  }
  @keyframes halo {
    0%, 100% { transform: scale(1); opacity: 0.55; }
    50%       { transform: scale(1.1); opacity: 1; }
  }

  .hero-name {
    font-size: 0.84rem; font-weight: 700; color: var(--text);
    max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .hero-name-1 { font-size: 0.96rem; color: var(--text); }
  .hero-name.is-me { color: var(--accent) !important; }
  .hero-elo  { font-size: 0.82rem; font-weight: 700; }
  .hero-games { font-size: 0.62rem; color: var(--dim); }

  /* ─── Hint + Filtres ─── */
  .cl-hint { font-size: 0.7rem; color: var(--dim); text-align: center; margin-bottom: 20px; }
  .cl-filters {
    display: flex; flex-wrap: wrap; gap: 18px;
    margin-bottom: 24px; padding: 16px 20px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border); border-radius: 12px;
  }
  .filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .filter-label { font-size: 0.7rem; color: var(--dim); font-weight: 700; min-width: 44px; }
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .pill {
    padding: 5px 14px; border-radius: 20px;
    border: 1px solid var(--border); background: transparent;
    color: var(--dim); font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .pill:hover:not(.active) { border-color: var(--accent); color: var(--text); }

  /* ─── Grille ─── */
  .cl-grid {
    display: grid;
    grid-template-columns: 1fr 284px;
    gap: 28px; align-items: start;
  }

  /* ════════════════════════ TABLE ════════════════════════ */
  .cl-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .cl-table thead th {
    text-align: left;
    font-size: 0.65rem; font-weight: 700; color: var(--dim);
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .cl-row td {
    padding: 11px 14px;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.06);
    vertical-align: middle;
  }
  .cl-row:last-child td { border-bottom: none; }
  .cl-row:hover td { background: rgb(var(--c-glass) / 0.04); }

  /* Highlight moi */
  .cl-row.row-me td          { background: rgb(var(--c-accent) / 0.1); }
  .cl-row.row-me td:first-child {
    border-left: 3px solid var(--accent) !important;
    padding-left: 11px;
  }
  .cl-row.row-me .col-rank   { color: var(--accent); font-weight: 800; }
  .cl-row.row-me .row-name   { color: var(--accent); font-weight: 700; }
  .cl-row.row-me .score-fill { background: var(--accent) !important; }

  /* Couleurs rang */
  .rank-gold td:first-child   { border-left: 3px solid rgba(240,180,41,0.6); padding-left: 11px; }
  .rank-silver td:first-child { border-left: 3px solid rgba(176,190,197,0.5); padding-left: 11px; }
  .rank-bronze td:first-child { border-left: 3px solid rgba(205,130,70,0.5); padding-left: 11px; }
  .rank-gold .col-rank   { color: #f0b429; font-weight: 800; }
  .rank-silver .col-rank { color: #b8ccd4; font-weight: 800; }
  .rank-bronze .col-rank { color: #d4844a; font-weight: 800; }
  .rank-gold .score-fill   { background: #f0b429; }
  .rank-silver .score-fill { background: #b8ccd4; }
  .rank-bronze .score-fill { background: #d4844a; }

  .col-rank { width: 40px; font-size: 0.8rem; font-weight: 700; color: var(--dim); font-variant-numeric: tabular-nums; }
  .col-player { display: flex; align-items: center; gap: 10px; }
  .col-score { min-width: 120px; }
  .col-extra { color: var(--dim); font-size: 0.8rem; }
  .col-games { color: var(--dim); font-size: 0.8rem; text-align: right; }

  /* Barre de score */
  .score-val { display: block; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; margin-bottom: 4px; }
  .score-bar {
    height: 3px; width: 110px; max-width: 100%;
    background: rgb(var(--c-glass) / 0.12);
    border-radius: 2px; overflow: hidden;
  }
  .score-fill {
    height: 100%; border-radius: 2px;
    background: var(--accent);
    transition: width 0.6s ease;
  }

  .row-av { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .row-av-fb {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgb(var(--c-glass) / 0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 700; color: var(--text); flex-shrink: 0;
  }
  .row-name { color: var(--text); font-weight: 600; transition: color 0.15s; }
  .row-name:hover { color: var(--accent); }
  .me-badge {
    font-size: 0.58rem; font-weight: 800;
    background: var(--accent); color: #fff;
    border-radius: 4px; padding: 1px 5px; margin-left: 4px;
  }

  .btn-load-more {
    display: block; margin: 18px auto 0;
    padding: 10px 36px; border-radius: 10px;
    border: 1px solid var(--border); background: transparent;
    color: var(--dim); font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s, color 0.15s;
  }
  .btn-load-more:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.08); color: var(--text); }
  .btn-load-more:disabled { opacity: 0.5; cursor: default; }
  .cl-empty { text-align: center; color: var(--dim); font-size: 0.85rem; padding: 40px 0; }

  /* ════════════════════════ SIDEBAR ════════════════════════ */
  .cl-sidebar { position: sticky; top: 80px; }

  .sidebar-card {
    position: relative;
    background: rgb(var(--c-glass) / 0.05);
    border-radius: 20px;
    padding: 30px 22px 24px;
    display: flex; flex-direction: column; align-items: center;
    gap: 8px; text-align: center;
    animation: sb-pulse 4s ease-in-out infinite;
  }
  /* Gradient border via box-shadow empilé */
  @keyframes sb-pulse {
    0%, 100% {
      box-shadow:
        0 0 0 1px rgba(var(--c-accent), 0.5),
        0 0 32px rgb(var(--c-accent) / 0.08),
        0 8px 40px rgba(0,0,0,0.16);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(var(--c-accent), 0.9),
        0 0 60px rgb(var(--c-accent) / 0.18),
        0 8px 40px rgba(0,0,0,0.16);
    }
  }

  .sb-label {
    font-size: 0.6rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.14em;
    color: var(--accent);
  }
  .sb-rank {
    font-size: 4rem; font-weight: 900; line-height: 1;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 12px rgb(var(--c-accent) / 0.35));
  }
  .sb-username { font-size: 0.95rem; font-weight: 700; color: var(--text); }
  .sb-score    { font-size: 0.86rem; font-weight: 700; color: var(--accent); }
  .sb-games    { font-size: 0.7rem; color: var(--dim); }
  .sb-gap {
    font-size: 0.72rem; color: var(--dim);
    background: rgb(var(--c-glass) / 0.08);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 7px 12px;
    margin-top: 4px; width: 100%;
    line-height: 1.4;
  }
  .sb-none    { font-size: 0.8rem; color: var(--dim); font-style: italic; }
  .sb-loading { color: var(--dim); font-size: 0.82rem; padding: 16px 0; }
  .sb-guest-icon { font-size: 2.4rem; }
  .sb-guest-text { font-size: 0.8rem; color: var(--dim); line-height: 1.6; }
  .sb-cta {
    display: block; width: 100%; margin-top: 16px;
    padding: 12px 0; border-radius: 11px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff; font-weight: 800; font-size: 0.86rem;
    text-decoration: none; text-align: center;
    box-shadow: 0 4px 20px rgb(var(--c-accent) / 0.3);
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .sb-cta:hover {
    opacity: 0.92;
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgb(var(--c-accent) / 0.4);
  }

  /* ─── Responsive ─── */
  @media (max-width: 960px) {
    .cl-grid { grid-template-columns: 1fr; }
    .cl-sidebar { position: static; }
    .sidebar-card { flex-direction: row; flex-wrap: wrap; justify-content: space-between; text-align: left; padding: 18px 20px; }
    .sb-rank { font-size: 2.6rem; }
    .sb-cta  { width: auto; padding: 10px 22px; margin-top: 0; }
    .sb-gap  { width: auto; }
  }
  @media (max-width: 640px) {
    .classements-page { padding: 14px 14px 60px; }
    .page-nav { padding: 12px 14px 0; }
    .cl-hero  { padding: 28px 12px 24px; }
    .podium-hero { gap: 8px; }
    .hero-card { min-width: 100px; padding: 16px 10px 14px; }
    .hero-gold { min-width: 128px; padding: 20px 14px 18px; }
    .hero-pos  { font-size: 2rem; }
    .hero-gold .hero-pos { font-size: 2.6rem; }
    .hero-name { font-size: 0.72rem; max-width: 90px; }
    .score-bar { width: 70px; }
    .col-extra { display: none; }
    .sidebar-card { flex-direction: column; align-items: center; text-align: center; }
    .sb-cta { width: 100%; }
  }

  /* ─── Killswitch animations (paramètres + prefers-reduced-motion) ─── */
  @media (prefers-reduced-motion: reduce) {
    .sparkle, .gold-ring-spin, .hero-shimmer, .hero-crown,
    .av-halo, .gold-ring, .hero-card, .sidebar-card { animation: none !important; }
    .score-fill { transition: none !important; }
  }
  :global(.no-animations) .sparkle,
  :global(.no-animations) .gold-ring-spin,
  :global(.no-animations) .hero-shimmer,
  :global(.no-animations) .hero-crown,
  :global(.no-animations) .av-halo,
  :global(.no-animations) .gold-ring,
  :global(.no-animations) .hero-card,
  :global(.no-animations) .sidebar-card { animation: none !important; }
  :global(.no-animations) .score-fill { transition: none !important; }
</style>
