<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Zikle — Archives | ZIK</title>
  <meta name="description" content="Rejoue les Zikle des jours précédents (compte requis)." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives" />
</svelte:head>

<header class="page-head">
  <div class="page-head-inner">
    <h1 class="page-head-title">Archives Zikle</h1>
    <p class="page-head-sub">Rejoue les jours précédents · compte requis</p>
  </div>
</header>

<div class="zikle-archives">
  {#if !data.days.length}
    <p class="zikle-empty">Pas encore d'archives, reviens demain !</p>
  {:else}
    <ul class="za-list">
      {#each data.days as day (day.date)}
        <li>
          <a class="za-item" href="/zikle/archives/{day.date}">
            <span class="za-num">#{day.dayNumber}</span>
            <span class="za-date">{day.date}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .zikle-archives {
    padding: 0 clamp(20px, 5vw, 72px) 80px;
    max-width: 640px;
    margin: 0 auto;
  }
  .zikle-empty {
    text-align: center;
    color: var(--mid);
    padding: 60px 0;
  }
  .za-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .za-item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 14px 18px;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }
  .za-item:hover {
    background: var(--surface2);
    border-color: var(--border2);
    transform: translateX(2px);
  }
  .za-num {
    font-weight: 900;
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1rem;
  }
  .za-date {
    color: var(--mid);
    font-size: 0.86rem;
  }
</style>
