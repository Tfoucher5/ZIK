<script>
  import ZikleGame from "$lib/components/ZikleGame.svelte";

  let { data } = $props();
</script>

<svelte:head>
  <title>Zikle #{data.dayNumber ?? ""} — Devine la chanson du jour | ZIK</title>
  <meta name="description" content="Zikle : devine la chanson du jour à partir d'un extrait audio qui s'allonge à chaque essai. 6 essais, un nouveau titre chaque jour, gratuit et sans compte." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle" />
  <meta property="og:title" content="Zikle — Devine la chanson du jour" />
  <meta property="og:description" content="Un extrait audio qui s'allonge à chaque essai raté. 6 essais pour deviner le titre du jour." />
  <meta property="og:url" content="https://www.zik-music.fr/zikle" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
</svelte:head>

<div class="zikle-page">
  <h1>Zikle {data.dayNumber ? `#${data.dayNumber}` : ""}</h1>

  {#if !data.date}
    <p>Pas de chanson disponible aujourd'hui, reviens un peu plus tard 🙏</p>
  {:else}
    <ZikleGame date={data.date} dayNumber={data.dayNumber} previewUrl={data.previewUrl} />
  {/if}
</div>
