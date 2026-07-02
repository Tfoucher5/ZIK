<script>
  import { onMount } from "svelte";
  import LoadMore from '$lib/components/LoadMore.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

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

  let list = $derived(activeTab === "elo" ? eloData : scoreData);
  let maxVal = $derived(
    list.length > 0 ? (activeTab === "elo" ? list[0].elo : Number(list[0].total_score)) : 1
  );

  let filterSummary = $derived(
    `${scoreMode === 'classique' ? 'Mode Classique' : 'Mode QCM'} · ${scoreRooms === 'officielles' ? 'Rooms officielles' : 'Toutes les rooms'} · ${scorePeriod === 'semaine' ? 'Depuis lundi' : scorePeriod === 'mois' ? 'Depuis le 1er du mois' : 'Depuis le 1er janvier'}`
  );

  let gapToNext = $derived.by(() => {
    if (!myRank || myRank.rank <= 1) return null;
    const idx = myRank.rank - 2;
    const above = activeTab === "elo" ? eloData[idx] : scoreData[idx];
    if (!above) return null;
    const aboveScore = activeTab === "elo" ? above.elo : Number(above.total_score);
    return aboveScore - myRank.score;
  });

  let gapToTop = $derived.by(() => {
    if (!myRank || myRank.rank <= 1 || list.length === 0) return null;
    return maxVal - myRank.score;
  });

  let barPct = $derived.by(() => {
    if (!myRank) return 0;
    if (myRank.rank <= 1) return 100;
    if (gapToNext !== null && gapToNext > 0) {
      const above = myRank.score + gapToNext;
      return above > 0 ? Math.min(100, Math.round((myRank.score / above) * 100)) : 0;
    }
    return maxVal > 0 ? Math.min(100, Math.round((myRank.score / maxVal) * 100)) : 0;
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

  function isMe(u) { return myRank?.username === u; }

  function valLabel(p) {
    return activeTab === "elo" ? String(p.elo) : Number(p.total_score).toLocaleString('fr-FR');
  }
  function gamesOf(p) {
    return activeTab === "elo" ? p.games_played : p.games_count;
  }
  function pct(p) {
    const v = activeTab === "elo" ? p.elo : Number(p.total_score);
    return Math.min(100, Math.round((v / maxVal) * 100));
  }

  const CERTS = ["💎 Disque de diamant", "Disque de platine", "Disque d'or"];
  let unit = $derived(activeTab === "elo" ? "ELO" : "pts");
  let showLoading = $derived(activeTab === "score" && scoreLoading && scoreData.length === 0);
  let showEmpty = $derived(
    activeTab === "elo"
      ? eloData.length === 0 && !eloLoading
      : scoreData.length === 0 && scoreInited && !scoreLoading
  );
</script>

<svelte:head>
  <title>Classements — ZIK</title>
  <meta name="description" content="Classements ZIK — ELO compétitif, scores par mode et par période. Découvrez les meilleurs joueurs de blind test." />
</svelte:head>

<main class="hp-page">

  <header class="hp-hero">
    <h1>Hit-<em>parade</em><span class="hp-dot">.</span></h1>
    <div class="hp-live"><span class="hp-live-dot"></span>Classement en direct</div>
  </header>

  <div class="hp-toolbar">
    <button class="hp-tab" class:active={activeTab === 'elo'} onclick={() => activeTab = 'elo'}>ELO</button>
    <button class="hp-tab" class:active={activeTab === 'score'} onclick={() => activeTab = 'score'}>Score</button>
    <span class="hp-sep"></span>

    {#if activeTab === 'elo'}
      <span class="hp-context">Rooms officielles · Mode classique · All-time</span>
    {:else}
      <div class="hp-chips">
        <button class="hp-chip" class:on={scoreMode === 'classique'} onclick={() => scoreMode = 'classique'}>Classique</button>
        <button class="hp-chip" class:on={scoreMode === 'qcm'} onclick={() => scoreMode = 'qcm'}>QCM</button>
        <span class="hp-sep"></span>
        <button class="hp-chip" class:on={scoreRooms === 'officielles'} onclick={() => scoreRooms = 'officielles'}>Officielles</button>
        <button class="hp-chip" class:on={scoreRooms === 'toutes'} onclick={() => scoreRooms = 'toutes'}>Toutes</button>
        <span class="hp-sep"></span>
        <button class="hp-chip" class:on={scorePeriod === 'semaine'} onclick={() => scorePeriod = 'semaine'}>Semaine</button>
        <button class="hp-chip" class:on={scorePeriod === 'mois'} onclick={() => scorePeriod = 'mois'}>Mois</button>
        <button class="hp-chip" class:on={scorePeriod === 'alltime'} onclick={() => scorePeriod = 'alltime'}>Année</button>
      </div>
    {/if}
  </div>

  {#if activeTab === 'score'}
    <p class="hp-summary">{filterSummary}</p>
  {/if}

  {#if showLoading}
    <p class="hp-loading">Chargement…</p>
  {:else if showEmpty}
    <EmptyState icon="🏆" title={activeTab === 'elo' ? "Aucun joueur pour l'instant" : "Aucun résultat pour ces filtres."} />
  {:else if list.length > 0}

    {#if list.length >= 3}
      <!-- ── N°1 : le single de la semaine ── -->
      <section class="champ">
        <div class="champ-vinyl" aria-hidden="true">
          <div class="disc">
            <div class="disc-label">
              {#if list[0].avatar_url}
                <img src={list[0].avatar_url} alt="" loading="lazy" />
              {:else}
                <span>{list[0].username[0].toUpperCase()}</span>
              {/if}
            </div>
          </div>
        </div>
        <div class="champ-info">
          <span class="champ-tag">★ N°1 du classement</span>
          <a href="/user/{list[0].username}" class="champ-name" class:is-me={isMe(list[0].username)}>{list[0].username}</a>
          <p class="champ-meta">
            {#if activeTab === 'elo'}<b>Nv.&nbsp;{list[0].level}</b>&nbsp;·&nbsp;{/if}{gamesOf(list[0])} partie{gamesOf(list[0]) > 1 ? 's' : ''}
            {#if isMe(list[0].username)}· <b class="me-flag">C'est toi</b>{/if}
          </p>
        </div>
        <div class="champ-val">
          <div class="champ-num">{valLabel(list[0])}</div>
          <div class="champ-unit">{unit}</div>
          <div class="champ-cert">{CERTS[0]}</div>
        </div>
      </section>

      <!-- ── 2 & 3 : certifications ── -->
      <div class="duo">
        {#each [list[1], list[2]] as p, i (p.username)}
          <div class="cert-card" class:plat={i === 0} class:gold={i === 1}>
            <span class="cert-rank">{i + 2}</span>
            <div class="cert-mini">
              <i>
                {#if p.avatar_url}
                  <img src={p.avatar_url} alt="" loading="lazy" />
                {:else}
                  {p.username[0].toUpperCase()}
                {/if}
              </i>
            </div>
            <div class="cert-id">
              <a href="/user/{p.username}" class="cert-name" class:is-me={isMe(p.username)}>{p.username}</a>
              <div class="cert-sub">{CERTS[i + 1]} · {gamesOf(p)} partie{gamesOf(p) > 1 ? 's' : ''}</div>
            </div>
            <div class="cert-val">{valLabel(p)}<small>{unit}</small></div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Le reste du chart ── -->
    <section class="chart">
      {#if list.length >= 3}
        <div class="chart-head">
          <h2>Le reste du chart</h2>
          <span>Rang · Joueur · {unit === 'ELO' ? 'ELO · Niveau' : 'Score'} · Parties</span>
        </div>
      {/if}

      {#each list.slice(list.length >= 3 ? 3 : 0) as p, i (p.username)}
        {@const rank = i + (list.length >= 3 ? 4 : 1)}
        <div class="row" class:row-me={isMe(p.username)}>
          <span class="row-rank">{rank}</span>
          <div class="row-player">
            {#if p.avatar_url}
              <img class="row-av" src={p.avatar_url} alt={p.username} width="38" height="38" loading="lazy" />
            {:else}
              <div class="row-av row-av-fb">{p.username[0].toUpperCase()}</div>
            {/if}
            <div class="row-name-wrap">
              <a href="/user/{p.username}" class="row-name" class:is-me={isMe(p.username)}>{p.username}</a>
              {#if activeTab === 'elo'}<small>Nv. {p.level}</small>{/if}
            </div>
            {#if isMe(p.username)}<span class="me-badge">Toi</span>{/if}
          </div>
          <div class="row-val">
            <div class="row-num">{valLabel(p)}</div>
            <div class="row-bar"><i style="width:{pct(p)}%"></i></div>
          </div>
          <span class="row-games">{gamesOf(p)}</span>
        </div>
      {/each}

      {#if activeTab === 'elo'}
        <LoadMore loading={eloLoading} hasMore={eloHasMore} onLoad={loadMoreElo} />
      {:else}
        <LoadMore loading={scoreLoading} hasMore={scoreHasMore} onLoad={() => fetchScore(false)} />
      {/if}
    </section>

  {/if}
</main>

<!-- ── Barre de lecture : ta position ── -->
<div class="playerbar">
  {#if !myUserId}
    <div class="pb-guest">
      <span class="pb-guest-txt">🎧 Connecte-toi pour suivre ta position en temps réel.</span>
      <a href="/" class="pb-cta">Se connecter</a>
    </div>
  {:else if !myRankLoaded}
    <div class="pb-guest"><span class="pb-guest-txt">Ta position…</span></div>
  {:else if myRank}
    <div class="pb-id">
      {#if myRank.avatar_url}
        <img class="pb-av" src={myRank.avatar_url} alt={myRank.username} width="46" height="46" />
      {:else}
        <div class="pb-av pb-av-fb">{myRank.username[0].toUpperCase()}</div>
      {/if}
      <div class="pb-t">
        <div class="pb-n">{myRank.username}</div>
        <div class="pb-s">
          {activeTab === 'elo' ? `${myRank.score} ELO` : `${Number(myRank.score).toLocaleString('fr-FR')} pts`}
          · {myRank.games_count} partie{myRank.games_count > 1 ? 's' : ''}
        </div>
      </div>
      <span class="pb-rank">#{myRank.rank}</span>
    </div>
    <div class="pb-track">
      <div class="pb-lbl">
        {#if myRank.rank <= 1}
          <span>Au sommet du chart</span>
          <span class="pb-nxt">Défends ta place</span>
        {:else if gapToNext !== null && gapToNext > 0}
          <span>En route vers <b>#{myRank.rank - 1}</b></span>
          <span class="pb-nxt">▲ {activeTab === 'elo' ? gapToNext : Number(gapToNext).toLocaleString('fr-FR')} pts pour monter</span>
        {:else if gapToTop !== null && gapToTop > 0}
          <span>En route vers <b>#{myRank.rank - 1}</b></span>
          <span class="pb-nxt">▲ {activeTab === 'elo' ? gapToTop : Number(gapToTop).toLocaleString('fr-FR')} pts du sommet</span>
        {:else}
          <span>En route vers <b>#{myRank.rank - 1}</b></span>
          <span class="pb-nxt">Continue de grimper</span>
        {/if}
      </div>
      <div class="pb-line"><i style="width:{barPct}%"></i></div>
    </div>
    <a href="/rooms" class="pb-cta">Jouer maintenant →</a>
  {:else}
    <div class="pb-guest">
      <span class="pb-guest-txt">Pas encore classé dans cette catégorie.</span>
      <a href="/rooms" class="pb-cta">Jouer maintenant →</a>
    </div>
  {/if}
</div>

<style>
  .hp-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 44px) 48px 150px;
  }

  /* ── Hero ── */
  .hp-hero {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 24px; flex-wrap: wrap;
  }
  .hp-hero h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; text-transform: uppercase; line-height: 0.88;
    font-size: clamp(52px, 7.5vw, 104px); letter-spacing: -0.01em;
  }
  .hp-hero h1 em {
    font-style: normal; color: transparent;
    -webkit-text-stroke: 2px rgb(var(--c-glass) / 0.8);
  }
  .hp-dot { color: var(--accent); }
  .hp-live {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.78rem;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent);
    border: 1px solid rgb(var(--accent-rgb) / 0.45); border-radius: var(--r);
    padding: 7px 13px; margin-bottom: 10px;
  }
  .hp-live-dot {
    width: 6px; height: 6px; background: var(--accent); border-radius: 50%;
    animation: hp-pulse 2s infinite;
  }
  @keyframes hp-pulse { 50% { opacity: 0.3; } }

  /* ── Toolbar ── */
  .hp-toolbar { display: flex; align-items: center; gap: 10px; padding: 24px 0 0; flex-wrap: wrap; }
  .hp-tab {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.2rem;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 7px 20px; border: 1px solid var(--border2); border-radius: var(--r);
    color: var(--mid); cursor: pointer; background: none;
    transition: color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .hp-tab:hover:not(.active) { color: var(--text); border-color: var(--border2); }
  .hp-tab.active {
    color: #000; background: var(--accent); border-color: var(--accent);
    box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.4);
  }
  .hp-sep { width: 1px; height: 24px; background: var(--border2); margin: 0 6px; flex-shrink: 0; }
  .hp-context {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.76rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim);
  }
  .hp-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hp-chip {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.76rem;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 7px 13px; border: 1px solid var(--border); border-radius: var(--r);
    color: var(--mid); cursor: pointer; background: none;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .hp-chip:hover:not(.on) { color: var(--text); }
  .hp-chip.on {
    color: var(--text); border-color: rgb(var(--accent-rgb) / 0.6);
    background: rgb(var(--accent-rgb) / 0.08);
  }
  .hp-summary {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.7rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); padding-top: 12px;
  }
  .hp-loading { text-align: center; color: var(--dim); font-size: 0.85rem; padding: 60px 0; }

  /* ── N°1 ── */
  .champ {
    margin-top: 34px; border: 1px solid var(--border2); border-radius: var(--r);
    position: relative; overflow: hidden;
    background: linear-gradient(100deg, rgb(var(--accent-rgb) / 0.10), transparent 45%), var(--bg2);
    display: grid; grid-template-columns: 280px 1fr auto; align-items: center; gap: 20px;
    min-height: 240px;
  }
  .champ-vinyl { position: relative; height: 100%; min-height: 240px; }
  .disc {
    position: absolute; left: -170px; top: 50%; transform: translateY(-50%);
    width: 400px; height: 400px; border-radius: 50%;
    background: repeating-radial-gradient(circle at 50% 50%, #181818 0 1.5px, #0d0d0d 1.5px 3.8px);
    box-shadow: 0 0 0 1px rgb(var(--c-glass) / 0.09), 30px 0 80px rgba(0, 0, 0, 0.7);
    animation: disc-spin 14s linear infinite;
  }
  @keyframes disc-spin { to { transform: translateY(-50%) rotate(360deg); } }
  .disc::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0 12%, rgb(var(--c-glass) / 0.09) 16%, transparent 21%, transparent 55%, rgb(var(--c-glass) / 0.05) 60%, transparent 66%);
  }
  .disc-label {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 34%; height: 34%; border-radius: 50%; z-index: 1; overflow: hidden;
    background: radial-gradient(circle, #ffd9ff, var(--accent) 75%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.2rem; color: #000;
  }
  .disc-label img { width: 100%; height: 100%; object-fit: cover; }
  .champ-info { padding: 34px 0; min-width: 0; }
  .champ-tag {
    display: inline-block; font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
    font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase;
    color: #000; background: var(--accent); border-radius: var(--radius-sm); padding: 5px 10px;
  }
  .champ-name {
    display: block; font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
    text-transform: uppercase; line-height: 0.9; color: var(--text);
    font-size: clamp(44px, 6vw, 84px); margin-top: 12px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.15s;
  }
  .champ-name:hover { color: var(--accent); }
  .champ-meta {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--mid); margin-top: 12px;
  }
  .champ-meta b { color: var(--text); }
  .champ-meta .me-flag { color: var(--accent); }
  .champ-val { padding-right: 44px; text-align: right; }
  .champ-num {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; line-height: 1;
    font-size: clamp(56px, 6.5vw, 100px);
    color: transparent; -webkit-text-stroke: 2.5px var(--accent);
  }
  .champ-unit {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.75rem;
    letter-spacing: 0.34em; text-transform: uppercase; color: var(--accent);
  }
  .champ-cert {
    margin-top: 12px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 0.66rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim);
  }

  /* ── 2 & 3 ── */
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
  .cert-card {
    border: 1px solid var(--border); border-radius: var(--r); background: var(--surface);
    display: flex; align-items: center; gap: 18px; padding: 16px 22px;
  }
  .cert-rank {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.8rem;
    line-height: 1; color: transparent; -webkit-text-stroke: 1.6px rgb(var(--c-glass) / 0.55);
  }
  .cert-mini {
    width: 76px; height: 76px; border-radius: 50%; flex-shrink: 0; position: relative;
    background: repeating-radial-gradient(circle at 50% 50%, #181818 0 1.2px, #0d0d0d 1.2px 3px);
    box-shadow: 0 0 0 1px rgb(var(--c-glass) / 0.09);
  }
  .cert-mini i {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 44%; height: 44%; border-radius: 50%; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-style: normal;
    font-size: 0.85rem; color: #000;
  }
  .cert-mini i img { width: 100%; height: 100%; object-fit: cover; }
  .cert-card.plat .cert-mini i { background: radial-gradient(circle, #fff, #b9c4d4 78%); }
  .cert-card.gold .cert-mini i { background: radial-gradient(circle, #ffe8b0, #d9a520 78%); }
  .cert-id { flex: 1; min-width: 0; }
  .cert-name {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.5rem;
    text-transform: uppercase; line-height: 1; color: var(--text);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.15s;
  }
  .cert-name:hover { color: var(--accent); }
  .cert-sub {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.64rem;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--dim); margin-top: 5px;
  }
  .cert-val {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.8rem;
    white-space: nowrap;
  }
  .cert-val small {
    display: block; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.24em;
    color: var(--dim); text-align: right;
  }

  /* ── Chart ── */
  .chart { margin-top: 44px; }
  .chart-head {
    display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
    border-bottom: 2px solid var(--text); padding-bottom: 10px;
  }
  .chart-head h2 {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.9rem;
    text-transform: uppercase; letter-spacing: 0.02em;
  }
  .chart-head span {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.68rem;
    letter-spacing: 0.28em; text-transform: uppercase; color: var(--dim);
  }
  .row {
    display: grid; grid-template-columns: 80px 1fr 130px 80px; gap: 14px; align-items: center;
    padding: 12px 6px; border-bottom: 1px solid var(--border);
    transition: background 0.15s;
  }
  .row:hover { background: var(--surface); }
  .row-rank {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.4rem;
    line-height: 1; color: transparent; -webkit-text-stroke: 1.4px rgb(var(--c-glass) / 0.45);
  }
  .row-player { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .row-av { width: 38px; height: 38px; border-radius: var(--r); object-fit: cover; flex-shrink: 0; }
  .row-av-fb {
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1rem;
    background: var(--surface3); color: var(--text);
  }
  .row-name-wrap { min-width: 0; }
  .row-name {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.3rem;
    text-transform: uppercase; color: var(--text);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.15s;
  }
  .row-name:hover { color: var(--accent); }
  .row-name-wrap small {
    display: block; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim);
  }
  .me-badge {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.6rem;
    letter-spacing: 0.2em; text-transform: uppercase;
    background: var(--accent); color: #000; border-radius: var(--radius-sm); padding: 3px 7px;
    flex-shrink: 0;
  }
  .row-val { text-align: right; }
  .row-num { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.5rem; }
  .row-bar { height: 3px; background: var(--surface2); margin-top: 5px; border-radius: 2px; overflow: hidden; }
  .row-bar i { display: block; height: 100%; background: var(--accent); transition: width 0.6s ease; }
  .row-games {
    text-align: right; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 0.95rem; color: var(--mid);
  }
  .row-me { background: rgb(var(--accent-rgb) / 0.07); border-color: rgb(var(--accent-rgb) / 0.35); }
  .row-me .row-rank { color: var(--accent); -webkit-text-stroke: 0; }
  .is-me { color: var(--accent) !important; }

  /* ── Barre de lecture ── */
  .playerbar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
    background: rgba(10, 10, 10, 0.96); border-top: 1px solid rgb(var(--accent-rgb) / 0.4);
    box-shadow: 0 -12px 44px rgb(var(--accent-rgb) / 0.09);
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 28px;
    padding: 13px 48px;
  }
  .pb-id { display: flex; align-items: center; gap: 14px; }
  .pb-av { width: 46px; height: 46px; border-radius: var(--r); object-fit: cover; }
  .pb-av-fb {
    display: flex; align-items: center; justify-content: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.15rem;
    background: var(--accent); color: #000;
  }
  .pb-t { line-height: 1.15; }
  .pb-n { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.25rem; text-transform: uppercase; }
  .pb-s {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid);
  }
  .pb-rank {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.3rem;
    color: transparent; -webkit-text-stroke: 1.8px var(--accent); margin-left: 8px;
  }
  .pb-track { min-width: 0; }
  .pb-lbl {
    display: flex; justify-content: space-between; gap: 12px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); margin-bottom: 7px;
  }
  .pb-lbl b { color: var(--text); }
  .pb-lbl .pb-nxt { color: var(--accent); }
  .pb-line { position: relative; height: 5px; background: var(--surface2); border-radius: 3px; }
  .pb-line i {
    position: absolute; inset: 0 auto 0 0; background: var(--accent); border-radius: 3px;
    box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.6);
  }
  .pb-line i::after {
    content: ""; position: absolute; right: -5px; top: 50%; transform: translateY(-50%);
    width: 13px; height: 13px; border-radius: 50%; background: #fff;
    box-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.8);
  }
  .pb-cta {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1rem;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #000; background: var(--accent); border: none; border-radius: var(--r);
    padding: 13px 30px; cursor: pointer; white-space: nowrap; text-align: center;
    box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .pb-cta:hover { transform: translateY(-2px); box-shadow: 0 0 36px rgb(var(--accent-rgb) / 0.5); }
  .pb-guest {
    grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 20px;
    flex-wrap: wrap;
  }
  .pb-guest-txt {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.8rem;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--mid);
  }

  /* ── Responsive ── */
  @media (max-width: 960px) {
    .hp-page { padding: calc(var(--nav-h) + 32px) 24px 170px; }
    .champ { grid-template-columns: 150px 1fr; min-height: 190px; }
    .champ-vinyl { min-height: 190px; grid-row: 1 / span 2; height: 100%; }
    .disc { width: 280px; height: 280px; left: -150px; }
    .champ-val { grid-column: 2; padding: 0 24px 22px; text-align: left; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
    .champ-num { font-size: 52px; }
    .champ-cert { margin-top: 0; }
    .duo { grid-template-columns: 1fr; }
    .row { grid-template-columns: 56px 1fr 110px 60px; }
    .row-rank { font-size: 1.9rem; }
  }
  /* Bottom-nav mobile du site (58px) : remonter la barre de lecture */
  @media (max-width: 768px) {
    .playerbar { bottom: 58px; }
    .hp-page { padding-bottom: 200px; }
  }
  @media (max-width: 640px) {
    .hp-page { padding: calc(var(--nav-h) + 24px) 14px 210px; }
    .hp-hero h1 { font-size: 15vw; }
    .champ { grid-template-columns: 92px 1fr; gap: 12px; min-height: 150px; }
    .champ-vinyl { min-height: 150px; }
    .disc { width: 190px; height: 190px; left: -110px; }
    .champ-info { padding: 20px 0; }
    .champ-name { font-size: 11vw; }
    .champ-meta { font-size: 0.7rem; letter-spacing: 0.16em; }
    .champ-val { padding: 0 16px 18px; }
    .champ-num { font-size: 42px; -webkit-text-stroke-width: 2px; }
    .cert-card { padding: 12px 14px; gap: 12px; }
    .cert-mini { width: 56px; height: 56px; }
    .cert-rank { font-size: 2rem; }
    .cert-name { font-size: 1.2rem; }
    .cert-val { font-size: 1.4rem; }
    .chart-head span { display: none; }
    .row { grid-template-columns: 40px 1fr 90px; gap: 10px; padding: 10px 2px; }
    .row-games { display: none; }
    .row-rank { font-size: 1.5rem; -webkit-text-stroke-width: 1px; }
    .row-av { width: 32px; height: 32px; }
    .row-name { font-size: 1.05rem; }
    .row-num { font-size: 1.2rem; }

    .playerbar { grid-template-columns: 1fr auto; gap: 12px; padding: 10px 14px; }
    .pb-track { display: none; }
    .pb-id { gap: 10px; min-width: 0; }
    .pb-av { width: 38px; height: 38px; flex-shrink: 0; }
    .pb-t { min-width: 0; }
    .pb-n { font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pb-s { display: none; }
    .pb-rank { font-size: 1.6rem; margin-left: 0; flex-shrink: 0; -webkit-text-stroke-width: 1.4px; }
    .pb-cta { padding: 11px 16px; font-size: 0.85rem; }
  }

  /* ── Animations désactivées ── */
  @media (prefers-reduced-motion: reduce) {
    .disc, .hp-live-dot { animation: none !important; }
    .row-bar i { transition: none !important; }
  }
  :global(.no-animations) .disc,
  :global(.no-animations) .hp-live-dot { animation: none !important; }
  :global(.no-animations) .row-bar i { transition: none !important; }
</style>
