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

  async function fetchScore(reset = false) {
    scoreLoading = true;
    if (reset) { scoreData = []; scoreOffset = 0; }
    try {
      const params = new URLSearchParams({
        mode: scoreMode, rooms: scoreRooms, periode: scorePeriod,
        offset: reset ? 0 : scoreOffset, limit: 20,
      });
      const res = await fetch(`/api/leaderboard/score?${params}`);
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
    try {
      const mode = activeTab === "elo" ? "elo" : scoreMode;
      let qs = `userId=${encodeURIComponent(myUserId)}&mode=${mode}`;
      if (activeTab === "score") qs += `&rooms=${scoreRooms}&periode=${scorePeriod}`;
      const res = await fetch(`/api/leaderboard/my-rank?${qs}`);
      myRank = await res.json();
    } catch { myRank = null; }
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

</script>

<svelte:head>
  <title>Classements — ZIK</title>
  <meta name="description" content="Classements ZIK — ELO compétitif, scores par mode et par période. Découvrez les meilleurs joueurs de blind test." />
</svelte:head>

<main class="classements-page">
  <div class="cl-header">
    <h1>Classements</h1>
    <p class="cl-sub">ELO compétitif, scores classique et QCM — filtre et explore.</p>
  </div>

  <!-- Onglets -->
  <div class="cl-tabs">
    <button class="cl-tab {activeTab === 'elo' ? 'active' : ''}" onclick={() => activeTab = 'elo'}>
      ⚡ ELO
    </button>
    <button class="cl-tab {activeTab === 'score' ? 'active' : ''}" onclick={() => activeTab = 'score'}>
      🏆 Score
    </button>
  </div>

  <!-- ── ELO ── -->
  {#if activeTab === 'elo'}
    <div class="cl-hint">Rooms officielles · Mode classique · All-time</div>
    <div class="cl-table-wrap">
      {#if eloData.length >= 3}
        <div class="podium">
          <div class="podium-slot">
            <div class="podium-info">
              <a href="/user/{eloData[1].username}" class="podium-avatar-link">
                {#if eloData[1].avatar_url}
                  <img class="podium-avatar" src={eloData[1].avatar_url} alt={eloData[1].username} width="44" height="44" loading="lazy" />
                {:else}
                  <div class="podium-avatar podium-fb">{eloData[1].username[0].toUpperCase()}</div>
                {/if}
              </a>
              <div class="podium-name {isMe(eloData[1].username) ? 'is-me' : ''}">{eloData[1].username}</div>
              <div class="podium-score">{eloData[1].elo} ELO</div>
            </div>
            <div class="podium-step podium-step-2"><span class="podium-num">2</span></div>
          </div>
          <div class="podium-slot">
            <span class="podium-crown">👑</span>
            <div class="podium-info">
              <a href="/user/{eloData[0].username}" class="podium-avatar-link">
                {#if eloData[0].avatar_url}
                  <img class="podium-avatar" src={eloData[0].avatar_url} alt={eloData[0].username} width="56" height="56" loading="lazy" />
                {:else}
                  <div class="podium-avatar podium-fb" style="width:56px;height:56px">{eloData[0].username[0].toUpperCase()}</div>
                {/if}
              </a>
              <div class="podium-name podium-name-1 {isMe(eloData[0].username) ? 'is-me' : ''}">{eloData[0].username}</div>
              <div class="podium-score">{eloData[0].elo} ELO</div>
            </div>
            <div class="podium-step podium-step-1"><span class="podium-num">1</span></div>
          </div>
          <div class="podium-slot">
            <div class="podium-info">
              <a href="/user/{eloData[2].username}" class="podium-avatar-link">
                {#if eloData[2].avatar_url}
                  <img class="podium-avatar" src={eloData[2].avatar_url} alt={eloData[2].username} width="36" height="36" loading="lazy" />
                {:else}
                  <div class="podium-avatar podium-fb" style="width:36px;height:36px">{eloData[2].username[0].toUpperCase()}</div>
                {/if}
              </a>
              <div class="podium-name {isMe(eloData[2].username) ? 'is-me' : ''}">{eloData[2].username}</div>
              <div class="podium-score">{eloData[2].elo} ELO</div>
            </div>
            <div class="podium-step podium-step-3"><span class="podium-num">3</span></div>
          </div>
        </div>
      {/if}

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
          {#each eloData.slice(eloData.length >= 3 ? 3 : 0) as p, i}
            {@const rank = (eloData.length >= 3 ? 3 : 0) + i + 1}
            <tr class="cl-row {isMe(p.username) ? 'row-me' : ''}">
              <td class="col-rank">{rank}</td>
              <td class="col-player">
                {#if p.avatar_url}
                  <img class="row-avatar" src={p.avatar_url} alt={p.username} width="24" height="24" loading="lazy" />
                {:else}
                  <div class="row-avatar row-avatar-fb">{p.username[0].toUpperCase()}</div>
                {/if}
                <a href="/user/{p.username}" class="row-name">{p.username}</a>
                {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
              </td>
              <td class="col-score">{p.elo}</td>
              <td class="col-extra">Nv. {p.level}</td>
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
    </div>

    <!-- Ma position ELO si hors top -->
    {#if myRank && !eloData.some(p => p.username === myRank.username)}
      <div class="my-rank-row">
        <span class="my-rank-label">Ta position</span>
        <span class="my-rank-num">#{myRank.rank}</span>
        <span class="my-rank-name">{myRank.username}</span>
        <span class="my-rank-score">{myRank.score} ELO</span>
      </div>
    {/if}
  {/if}

  <!-- ── Score ── -->
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

    <div class="cl-table-wrap">
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
              <tr class="cl-row {isMe(p.username) ? 'row-me' : ''}">
                <td class="col-rank">{i + 1}</td>
                <td class="col-player">
                  {#if p.avatar_url}
                    <img class="row-avatar" src={p.avatar_url} alt={p.username} width="24" height="24" loading="lazy" />
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
    </div>

    <!-- Ma position Score si hors top -->
    {#if myRank && scoreInited && !scoreData.some(p => p.username === myRank?.username)}
      <div class="my-rank-row">
        <span class="my-rank-label">Ta position</span>
        <span class="my-rank-num">#{myRank.rank}</span>
        <span class="my-rank-name">{myRank.username}</span>
        <span class="my-rank-score">{Number(myRank.score).toLocaleString('fr-FR')} pts</span>
      </div>
    {/if}
  {/if}
</main>

<style>
  .classements-page {
    max-width: 780px;
    margin: 0 auto;
    padding: 80px 20px 60px;
  }

  .cl-header { text-align: center; margin-bottom: 36px; }
  .cl-header h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; margin-bottom: 8px; }
  .cl-sub { color: var(--dim); font-size: 0.9rem; }

  /* Tabs */
  .cl-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 4px;
  }
  .cl-tab {
    flex: 1;
    padding: 10px 0;
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
    background: rgb(var(--c-glass) / 0.12);
    color: var(--text);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.12);
  }

  /* Hint + Filters */
  .cl-hint { font-size: 0.72rem; color: var(--dim); margin-bottom: 20px; text-align: center; }
  .cl-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 24px;
    padding: 16px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .filter-label { font-size: 0.72rem; color: var(--dim); font-weight: 600; min-width: 44px; }
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .pill {
    padding: 5px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--dim);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .pill.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .pill:hover:not(.active) { border-color: var(--accent); color: var(--text); }

  /* Podium */
  .podium {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 8px;
    margin-bottom: 28px;
  }
  .podium-slot { display: flex; flex-direction: column; align-items: center; }
  .podium-crown { font-size: 1rem; margin-bottom: 4px; line-height: 1; }
  .podium-info { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; }
  .podium-avatar-link { display: block; }
  .podium-avatar {
    border-radius: 50%;
    border: 2px solid var(--border);
    object-fit: cover;
  }
  .podium-fb {
    border-radius: 50%;
    border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.9rem;
    background: rgb(var(--c-glass) / 0.1);
    color: var(--text);
  }
  .podium-name { font-size: 0.72rem; font-weight: 700; color: var(--text); text-align: center; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .podium-name-1 { color: var(--accent); }
  .podium-name.is-me { color: var(--accent2); }
  .podium-score { font-size: 0.6rem; color: var(--dim); text-align: center; }
  .podium-step {
    width: 72px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px 4px 0 0;
    background: rgb(var(--c-glass) / 0.08);
    border: 1px solid var(--border);
    border-bottom: none;
  }
  .podium-step-1 { height: 68px; }
  .podium-step-2 { height: 48px; }
  .podium-step-3 { height: 32px; }
  .podium-num { font-size: 0.7rem; font-weight: 800; color: var(--dim); }
  .podium-slot:nth-child(2) .podium-avatar,
  .podium-slot:nth-child(2) .podium-fb {
    width: 56px; height: 56px;
    border-color: var(--accent);
    box-shadow: 0 0 12px rgb(var(--c-accent) / 0.3);
  }
  .podium-slot:nth-child(1) .podium-avatar,
  .podium-slot:nth-child(1) .podium-fb { width: 44px; height: 44px; border-color: #94a3b8; }
  .podium-slot:nth-child(3) .podium-avatar,
  .podium-slot:nth-child(3) .podium-fb { width: 36px; height: 36px; border-color: #c2774a; }

  /* Table */
  .cl-table-wrap { margin-bottom: 16px; }
  .cl-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86rem;
  }
  .cl-table thead th {
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--dim);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .cl-row td {
    padding: 10px 12px;
    border-bottom: 1px solid rgb(var(--c-glass) / 0.06);
    vertical-align: middle;
  }
  .cl-row:last-child td { border-bottom: none; }
  .cl-row:hover td { background: rgb(var(--c-glass) / 0.04); }
  .cl-row.row-me td { background: rgb(var(--c-accent) / 0.06); }

  .col-rank { width: 36px; font-size: 0.72rem; font-weight: 700; color: var(--dim); font-variant-numeric: tabular-nums; }
  .col-player { display: flex; align-items: center; gap: 10px; }
  .col-score { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .col-extra { color: var(--dim); font-size: 0.78rem; }
  .col-games { color: var(--dim); font-size: 0.78rem; text-align: right; }

  .row-avatar { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .row-avatar-fb {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgb(var(--c-glass) / 0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700; color: var(--text);
    flex-shrink: 0;
  }
  .row-name { color: var(--text); font-weight: 600; transition: color 0.15s; }
  .row-name:hover { color: var(--accent); }
  .me-badge {
    font-size: 0.6rem; font-weight: 700;
    background: var(--accent);
    color: #fff;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 4px;
  }

  /* Load more */
  .btn-load-more {
    display: block;
    margin: 16px auto 0;
    padding: 10px 28px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--dim);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-load-more:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.08); color: var(--text); }
  .btn-load-more:disabled { opacity: 0.5; cursor: default; }

  /* Ma position */
  .my-rank-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-top: 8px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: rgb(var(--c-accent) / 0.06);
    font-size: 0.86rem;
  }
  .my-rank-label { font-size: 0.7rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .my-rank-num { font-weight: 800; font-variant-numeric: tabular-nums; }
  .my-rank-name { font-weight: 600; flex: 1; }
  .my-rank-score { font-weight: 700; color: var(--accent); }

  .cl-empty { text-align: center; color: var(--dim); font-size: 0.85rem; padding: 40px 0; }

  @media (max-width: 600px) {
    .classements-page { padding: 60px 14px 40px; }
    .cl-filters { gap: 14px; }
    .col-extra { display: none; }
  }
</style>
