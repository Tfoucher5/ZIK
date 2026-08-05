<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Zikle — Archives | ZIK</title>
  <meta name="description" content="Rejoue les Zikle des jours précédents (compte requis)." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives" />
</svelte:head>

<div class="zikle-archives">
  <h1>Archives Zikle</h1>
  {#if !data.days.length}
    <p>Pas encore d'archives, reviens demain !</p>
  {:else}
    <ul>
      {#each data.days as day (day.date)}
        <li><a href="/zikle/archives/{day.date}">Zikle #{day.dayNumber} — {day.date}</a></li>
      {/each}
    </ul>
  {/if}
</div>
