<script>
  import { onMount, getContext, untrack } from 'svelte';
  import LoadMore from '$lib/components/LoadMore.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import LeaderboardToolbar from '$lib/components/leaderboard/LeaderboardToolbar.svelte';
  import PodiumChampion from '$lib/components/leaderboard/PodiumChampion.svelte';
  import PodiumRunnerUp from '$lib/components/leaderboard/PodiumRunnerUp.svelte';
  import LeaderboardRow from '$lib/components/leaderboard/LeaderboardRow.svelte';
  import PlayerBar from '$lib/components/leaderboard/PlayerBar.svelte';
  import { Leaderboard } from '$lib/components/leaderboard/leaderboard.svelte.js';
  import { breadcrumb } from '$lib/seo.js';

  const breadcrumbJsonLd = breadcrumb([{ name: 'Classements', path: '/classements' }]);

  let { data } = $props();

  const ctx = getContext('zik');
  const user = $derived(ctx.user);

  const lb = new Leaderboard({
    eloTop20: untrack(() => data.eloTop20),
    getToken: async () => (await ctx.sb?.auth.getSession())?.data?.session?.access_token,
  });

  const podium = $derived(lb.list.length >= 3);
  const rest = $derived(podium ? lb.list.slice(3) : lb.list);

  onMount(() => {
    lb.myUserId = sessionStorage.getItem('zik_uid') || null;
  });
</script>

<svelte:head>
  <title>Classements blind test - ELO et meilleurs scores | ZIK</title>
  <meta name="description" content="Classements ZIK : ELO compétitif, meilleurs scores par mode et par période, collectionneurs de cartes. Découvre les meilleurs joueurs de blind test et ta place parmi eux." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/classements" />
  <meta property="og:title" content="Classements blind test - ELO et meilleurs scores" />
  <meta property="og:description" content="ELO compétitif, meilleurs scores par mode et par période. Les meilleurs joueurs de blind test sur ZIK." />
  <meta property="og:url" content="https://www.zik-music.fr/classements" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Classements blind test - ELO et meilleurs scores" />
  <meta name="twitter:description" content="ELO compétitif, meilleurs scores par mode et par période. Les meilleurs joueurs de blind test sur ZIK." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={breadcrumbJsonLd} />
</svelte:head>

<main class="page">
  <header class="hero">
    <h1>Hit-<em>parade</em><span class="dot">.</span></h1>
    <div class="live"><span class="live-dot"></span>Classement en direct</div>
  </header>

  <LeaderboardToolbar {lb} loggedIn={!!user} />

  {#if lb.loadingFirst}
    <p class="loading">Chargement…</p>
  {:else if lb.empty}
    <EmptyState icon="🏆" title={lb.emptyTitle} />
  {:else if lb.list.length > 0}
    {#if podium}
      <PodiumChampion {lb} p={lb.list[0]} />
      <div class="duo">
        <PodiumRunnerUp {lb} p={lb.list[1]} rank={2} />
        <PodiumRunnerUp {lb} p={lb.list[2]} rank={3} />
      </div>
    {/if}

    <section class="chart">
      {#if podium}
        <div class="chart-head">
          <h2>Le reste du chart</h2>
          <span>
            Rang · Joueur · {lb.tab === 'elo' ? 'ELO · Niveau' : lb.tab === 'cartes' ? 'Plus belles cartes · Score' : 'Score'}
            · {lb.tab === 'cartes' ? 'Cartes' : 'Parties'}
          </span>
        </div>
      {/if}

      {#each rest as p, i (p.username)}
        <LeaderboardRow {lb} {p} rank={i + (podium ? 4 : 1)} />
      {/each}

      {#if !lb.eloAmis}
        <LoadMore loading={lb.current.loading} hasMore={lb.current.hasMore} onLoad={() => lb.current.load()} />
      {/if}
    </section>
  {/if}
</main>

<PlayerBar {lb} />
<CardViewer />

<style>
  .page {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 44px) 48px 150px;
  }
  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .hero h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 0.88;
    font-size: clamp(52px, 7.5vw, 104px);
    letter-spacing: -0.01em;
  }
  .hero h1 em {
    font-style: normal;
    color: transparent;
    -webkit-text-stroke: 2px rgb(var(--c-glass) / 0.8);
  }
  .dot {
    color: var(--accent);
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent);
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    border-radius: var(--r);
    padding: 7px 13px;
    margin-bottom: 10px;
  }
  .live-dot {
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  .loading {
    text-align: center;
    color: var(--dim);
    font-size: 0.85rem;
    padding: 60px 0;
  }
  .duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
  }
  .chart {
    margin-top: 44px;
  }
  .chart-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid var(--text);
    padding-bottom: 10px;
  }
  .chart-head h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.9rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .chart-head span {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }

  @media (max-width: 960px) {
    .page {
      padding: calc(var(--nav-h) + 32px) 24px 170px;
    }
    .duo {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 768px) {
    .page {
      padding-bottom: 200px;
    }
  }
  @media (max-width: 640px) {
    .page {
      padding: calc(var(--nav-h) + 24px) 14px 210px;
    }
    .hero h1 {
      font-size: 15vw;
    }
    .chart-head span {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot {
      animation: none;
    }
  }
  :global(.no-animations) .live-dot {
    animation: none;
  }
</style>
