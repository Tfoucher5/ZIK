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

  let gapToNext = $derived.by(() => {
    if (!myRank || myRank.rank <= 1) return null;
    const idx = myRank.rank - 2;
    const above = activeTab === "elo" ? eloData[idx] : scoreData[idx];
    if (!above) return null;
    const aboveScore = activeTab === "elo" ? above.elo : Number(above.total_score);
    return aboveScore - myRank.score;
  });

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

  function isMe(username) {
    return myRank?.username === username;
  }

  function rankClass(i) {
    if (i === 0) return "rank-gold";
    if (i === 1) return "rank-silver";
    if (i === 2) return "rank-bronze";
    return "";
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

  <!-- ── Hero top 3 (ELO) ── -->
  {#if activeTab === 'elo' && eloData.length >= 3}
    <div class="cl-hero">
      <div class="hero-bg-glow"></div>
      <div class="hero-eyebrow">Rooms officielles · Mode Classique · All-time</div>
      <div class="podium-hero">

        <!-- 2e -->
        <div class="hero-card hero-card-silver">
          <div class="hero-medal silver-text">2</div>
          <a href="/user/{eloData[1].username}" class="hero-avatar-wrap">
            {#if eloData[1].avatar_url}
              <img class="hero-avatar avatar-silver" src={eloData[1].avatar_url} alt={eloData[1].username} width="60" height="60" loading="lazy" />
            {:else}
              <div class="hero-avatar hero-avatar-fb avatar-silver" style="width:60px;height:60px">{eloData[1].username[0].toUpperCase()}</div>
            {/if}
          </a>
          <div class="hero-name {isMe(eloData[1].username) ? 'is-me' : ''}">{eloData[1].username}</div>
          <div class="hero-score silver-text">{eloData[1].elo} ELO</div>
          <div class="hero-games">{eloData[1].games_played} parties</div>
        </div>

        <!-- 1er -->
        <div class="hero-card hero-card-gold">
          <div class="hero-crown">👑</div>
          <div class="hero-medal gold-text">1</div>
          <a href="/user/{eloData[0].username}" class="hero-avatar-wrap">
            {#if eloData[0].avatar_url}
              <img class="hero-avatar avatar-gold" src={eloData[0].avatar_url} alt={eloData[0].username} width="84" height="84" loading="lazy" />
            {:else}
              <div class="hero-avatar hero-avatar-fb avatar-gold" style="width:84px;height:84px">{eloData[0].username[0].toUpperCase()}</div>
            {/if}
          </a>
          <div class="hero-name hero-name-1 {isMe(eloData[0].username) ? 'is-me' : ''}">{eloData[0].username}</div>
          <div class="hero-score gold-text">{eloData[0].elo} ELO</div>
          <div class="hero-games">{eloData[0].games_played} parties</div>
        </div>

        <!-- 3e -->
        <div class="hero-card hero-card-bronze">
          <div class="hero-medal bronze-text">3</div>
          <a href="/user/{eloData[2].username}" class="hero-avatar-wrap">
            {#if eloData[2].avatar_url}
              <img class="hero-avatar avatar-bronze" src={eloData[2].avatar_url} alt={eloData[2].username} width="50" height="50" loading="lazy" />
            {:else}
              <div class="hero-avatar hero-avatar-fb avatar-bronze" style="width:50px;height:50px">{eloData[2].username[0].toUpperCase()}</div>
            {/if}
          </a>
          <div class="hero-name {isMe(eloData[2].username) ? 'is-me' : ''}">{eloData[2].username}</div>
          <div class="hero-score bronze-text">{eloData[2].elo} ELO</div>
          <div class="hero-games">{eloData[2].games_played} parties</div>
        </div>

      </div>
    </div>
  {:else if activeTab === 'elo'}
    <div class="cl-hint">Rooms officielles · Mode classique · All-time</div>
  {/if}

  <!-- ── Filtres (Score) ── -->
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

  <!-- ── Grille table + sidebar ── -->
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
                    <img class="row-avatar" src={p.avatar_url} alt={p.username} width="28" height="28" loading="lazy" />
                  {:else}
                    <div class="row-avatar row-avatar-fb">{p.username[0].toUpperCase()}</div>
                  {/if}
                  <a href="/user/{p.username}" class="row-name">{p.username}</a>
                  {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
                </td>
                <td class="col-score">{p.elo}</td>
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
                      <img class="row-avatar" src={p.avatar_url} alt={p.username} width="28" height="28" loading="lazy" />
                    {:else}
                      <div class="row-avatar row-avatar-fb">{p.username[0].toUpperCase()}</div>
                    {/if}
                    <a href="/user/{p.username}" class="row-name">{p.username}</a>
                    {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
                  </td>
                  <td class="col-score">{Number(p.total_score).toLocaleString('fr-FR')} pts</td>
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

    <!-- Sidebar sticky -->
    <div class="cl-sidebar">
      <div class="sidebar-card">
        {#if !myUserId}
          <div class="sidebar-guest-icon">🏆</div>
          <p class="sidebar-guest-text">Connecte-toi pour voir ta position et suivre ta progression.</p>
          <a href="/" class="sidebar-cta">Se connecter</a>
        {:else if !myRankLoaded}
          <div class="sidebar-label">Ta position</div>
          <div class="sidebar-loading">…</div>
        {:else if myRank}
          <div class="sidebar-label">Ta position</div>
          <div class="sidebar-rank">#{myRank.rank}</div>
          <div class="sidebar-username">{myRank.username}</div>
          <div class="sidebar-score">
            {activeTab === 'elo' ? `${myRank.score} ELO` : `${Number(myRank.score).toLocaleString('fr-FR')} pts`}
          </div>
          <div class="sidebar-games">{myRank.games_count} partie{myRank.games_count > 1 ? 's' : ''}</div>
          {#if gapToNext !== null && gapToNext > 0}
            <div class="sidebar-gap">
              +{activeTab === 'elo' ? gapToNext : Number(gapToNext).toLocaleString('fr-FR')} pour le #{myRank.rank - 1}
            </div>
          {/if}
          <a href="/rooms" class="sidebar-cta">Jouer maintenant</a>
        {:else}
          <div class="sidebar-label">Ta position</div>
          <div class="sidebar-none">Pas encore classé dans cette catégorie.</div>
          <a href="/rooms" class="sidebar-cta">Jouer maintenant</a>
        {/if}
      </div>
    </div>

  </div>
</main>

<style>
  /* ── Navigation retour ── */
  .page-nav {
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px 24px 0;
  }
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--dim);
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: rgb(var(--c-glass) / 0.03);
    transition: color 0.15s, background 0.15s;
  }
  .btn-back:hover { color: var(--text); background: rgb(var(--c-glass) / 0.08); }

  /* ── Page ── */
  .classements-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 24px 80px;
  }

  .cl-header { text-align: center; margin-bottom: 28px; }
  .cl-header h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; margin-bottom: 6px; }
  .cl-sub { color: var(--dim); font-size: 0.88rem; }

  /* ── Onglets ── */
  .cl-tabs {
    display: flex;
    gap: 6px;
    margin: 0 auto 28px;
    max-width: 320px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 4px;
  }
  .cl-tab {
    flex: 1;
    padding: 9px 0;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--dim);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s, color 0.18s;
  }
  .cl-tab.active {
    background: rgb(var(--c-glass) / 0.14);
    color: var(--text);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.14);
  }

  /* ── Couleurs métal ── */
  .gold-text   { color: #f0b429; }
  .silver-text { color: #b0bec5; }
  .bronze-text { color: #cd7f32; }

  /* ── Hero podium ── */
  .cl-hero {
    position: relative;
    background:
      radial-gradient(ellipse 70% 120% at 50% 60%, rgba(240,180,41,0.06) 0%, transparent 65%),
      linear-gradient(160deg, rgb(var(--c-glass) / 0.07) 0%, rgb(var(--c-glass) / 0.03) 100%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px 28px 32px;
    margin-bottom: 28px;
    overflow: hidden;
  }

  .hero-bg-glow {
    position: absolute;
    top: 0; left: 50%; transform: translateX(-50%);
    width: 400px; height: 200px;
    background: radial-gradient(ellipse, rgba(240,180,41,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .hero-eyebrow {
    position: relative;
    text-align: center;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--dim);
    margin-bottom: 28px;
  }

  .podium-hero {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 14px;
  }

  /* ── Cartes hero ── */
  .hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px 16px 18px;
    border-radius: 16px;
    background: rgb(var(--c-glass) / 0.06);
    border: 1px solid var(--border);
    min-width: 128px;
    text-align: center;
  }

  .hero-card-silver {
    background: linear-gradient(160deg, rgba(176,190,197,0.1) 0%, rgba(176,190,197,0.02) 100%);
    border-color: rgba(176,190,197,0.35);
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    animation: hero-rise 0.45s 0.1s ease both;
  }
  .hero-card-gold {
    min-width: 162px;
    padding: 24px 20px 22px;
    background: linear-gradient(160deg, rgba(240,180,41,0.12) 0%, rgba(240,180,41,0.03) 100%);
    border-color: rgba(240,180,41,0.45);
    box-shadow: 0 0 32px rgba(240,180,41,0.14), 0 8px 40px rgba(0,0,0,0.22);
    animation: hero-rise 0.4s ease both, glow-gold 3.5s 0.4s ease-in-out infinite;
  }
  .hero-card-bronze {
    background: linear-gradient(160deg, rgba(205,127,50,0.1) 0%, rgba(205,127,50,0.02) 100%);
    border-color: rgba(205,127,50,0.35);
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    animation: hero-rise 0.45s 0.18s ease both;
  }

  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes glow-gold {
    0%, 100% { box-shadow: 0 0 32px rgba(240,180,41,0.14), 0 8px 40px rgba(0,0,0,0.22); }
    50%       { box-shadow: 0 0 64px rgba(240,180,41,0.3),  0 8px 40px rgba(0,0,0,0.22); }
  }

  .hero-crown {
    font-size: 1.4rem;
    line-height: 1;
    animation: crown-float 2.5s ease-in-out infinite;
  }
  @keyframes crown-float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-5px); }
  }

  .hero-medal {
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
  }
  .hero-avatar-wrap { display: block; margin: 4px 0 2px; }
  .hero-avatar {
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--border);
    display: block;
  }
  .hero-avatar-fb {
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 1.4rem;
    background: rgb(var(--c-glass) / 0.12);
    color: var(--text);
    border: 3px solid var(--border);
  }
  .avatar-gold   { border-color: #f0b429 !important; box-shadow: 0 0 18px rgba(240,180,41,0.55); }
  .avatar-silver { border-color: #b0bec5 !important; box-shadow: 0 0 10px rgba(176,190,197,0.35); }
  .avatar-bronze { border-color: #cd7f32 !important; box-shadow: 0 0 10px rgba(205,127,50,0.35); }

  .hero-name {
    font-size: 0.82rem; font-weight: 700;
    max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--text);
  }
  .hero-name-1 { font-size: 0.92rem; color: #f0b429; }
  .hero-name.is-me { color: var(--accent) !important; }
  .hero-score { font-size: 0.8rem; font-weight: 700; }
  .hero-games { font-size: 0.62rem; color: var(--dim); }

  /* ── Hint + Filtres ── */
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
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .pill:hover:not(.active) { border-color: var(--accent); color: var(--text); }

  /* ── Grille ── */
  .cl-grid {
    display: grid;
    grid-template-columns: 1fr 276px;
    gap: 28px;
    align-items: start;
  }

  /* ── Table ── */
  .cl-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .cl-table thead th {
    text-align: left;
    font-size: 0.66rem; font-weight: 700; color: var(--dim);
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .cl-row td {
    padding: 11px 14px;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.06);
    vertical-align: middle;
  }
  .cl-row:last-child td { border-bottom: none; }
  .cl-row:hover td { background: rgb(var(--c-glass) / 0.04); }

  /* Highlight moi */
  .cl-row.row-me td { background: rgb(var(--c-accent) / 0.1); }
  .cl-row.row-me td:first-child { border-left: 3px solid var(--accent); padding-left: 11px; }
  .cl-row.row-me .col-rank { color: var(--accent); font-weight: 800; }
  .cl-row.row-me .row-name { color: var(--accent); font-weight: 700; }

  /* Couleurs rang */
  .rank-gold .col-rank   { color: #f0b429; font-weight: 800; }
  .rank-silver .col-rank { color: #b0bec5; font-weight: 800; }
  .rank-bronze .col-rank { color: #cd7f32; font-weight: 800; }
  .rank-gold td:first-child   { border-left: 2px solid rgba(240,180,41,0.5); }
  .rank-silver td:first-child { border-left: 2px solid rgba(176,190,197,0.4); }
  .rank-bronze td:first-child { border-left: 2px solid rgba(205,127,50,0.4); }
  .cl-row.row-me td:first-child { border-left: 3px solid var(--accent) !important; }

  .col-rank { width: 40px; font-size: 0.8rem; font-weight: 700; color: var(--dim); font-variant-numeric: tabular-nums; }
  .col-player { display: flex; align-items: center; gap: 10px; }
  .col-score { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .col-extra { color: var(--dim); font-size: 0.8rem; }
  .col-games { color: var(--dim); font-size: 0.8rem; text-align: right; }

  .row-avatar { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .row-avatar-fb {
    width: 28px; height: 28px; border-radius: 50%;
    background: rgb(var(--c-glass) / 0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 700; color: var(--text); flex-shrink: 0;
  }
  .row-name { color: var(--text); font-weight: 600; transition: color 0.15s; }
  .row-name:hover { color: var(--accent); }
  .me-badge {
    font-size: 0.6rem; font-weight: 700;
    background: var(--accent); color: #fff;
    border-radius: 4px; padding: 1px 5px; margin-left: 4px;
  }

  .btn-load-more {
    display: block; margin: 16px auto 0;
    padding: 10px 32px; border-radius: 10px;
    border: 1px solid var(--border); background: transparent;
    color: var(--dim); font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s, color 0.15s;
  }
  .btn-load-more:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.08); color: var(--text); }
  .btn-load-more:disabled { opacity: 0.5; cursor: default; }
  .cl-empty { text-align: center; color: var(--dim); font-size: 0.85rem; padding: 40px 0; }

  /* ── Sidebar ── */
  .cl-sidebar { position: sticky; top: 80px; }

  .sidebar-card {
    background: rgb(var(--c-glass) / 0.05);
    border: 1px solid var(--accent);
    border-radius: 18px;
    padding: 28px 20px 24px;
    display: flex; flex-direction: column; align-items: center;
    gap: 8px; text-align: center;
    box-shadow: 0 0 40px rgb(var(--c-accent) / 0.07), 0 8px 32px rgba(0,0,0,0.12);
  }

  .sidebar-label {
    font-size: 0.62rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--accent);
  }
  .sidebar-rank {
    font-size: 3.4rem; font-weight: 900; line-height: 1;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sidebar-username { font-size: 0.92rem; font-weight: 700; color: var(--text); }
  .sidebar-score { font-size: 0.84rem; font-weight: 700; color: var(--accent); }
  .sidebar-games { font-size: 0.7rem; color: var(--dim); }
  .sidebar-gap {
    font-size: 0.72rem; color: var(--dim);
    background: rgb(var(--c-glass) / 0.08);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 6px 12px; margin-top: 4px;
    width: 100%;
  }
  .sidebar-none { font-size: 0.8rem; color: var(--dim); font-style: italic; }
  .sidebar-loading { color: var(--dim); font-size: 0.82rem; height: 40px; display: flex; align-items: center; }
  .sidebar-guest-icon { font-size: 2.2rem; }
  .sidebar-guest-text { font-size: 0.8rem; color: var(--dim); line-height: 1.55; }
  .sidebar-cta {
    display: block; width: 100%; margin-top: 14px;
    padding: 11px 0; border-radius: 10px;
    background: var(--accent); color: #fff;
    font-weight: 700; font-size: 0.85rem;
    text-decoration: none; text-align: center;
    transition: opacity 0.15s, transform 0.15s;
  }
  .sidebar-cta:hover { opacity: 0.88; transform: translateY(-1px); }

  /* ── Responsive ── */
  @media (max-width: 880px) {
    .cl-grid { grid-template-columns: 1fr; }
    .cl-sidebar { position: static; }
    .sidebar-card { flex-direction: row; flex-wrap: wrap; justify-content: space-between; text-align: left; padding: 18px 20px; }
    .sidebar-rank { font-size: 2.2rem; }
    .sidebar-cta { width: auto; padding: 9px 20px; }
    .sidebar-gap { width: auto; }
  }
  @media (max-width: 600px) {
    .classements-page { padding: 16px 14px 60px; }
    .page-nav { padding: 12px 14px 0; }
    .cl-hero { padding: 24px 12px 20px; }
    .podium-hero { gap: 8px; }
    .hero-card { min-width: 96px; padding: 14px 10px 12px; }
    .hero-card-gold { min-width: 120px; }
    .hero-medal { font-size: 1.4rem; }
    .hero-name { font-size: 0.72rem; max-width: 88px; }
    .cl-filters { gap: 12px; }
    .col-extra { display: none; }
    .sidebar-card { flex-direction: column; align-items: center; text-align: center; }
    .sidebar-cta { width: 100%; }
  }
</style>
