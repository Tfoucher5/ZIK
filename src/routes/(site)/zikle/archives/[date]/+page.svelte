<script>
  import { getContext } from "svelte";
  import ZikleGame from "$lib/components/ZikleGame.svelte";

  let { data } = $props();

  const _ctx = getContext("zik");
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);
  const openAuthModal = _ctx.openAuthModal;
</script>

<svelte:head>
  <title>Zikle #{data.dayNumber} — Archives | ZIK</title>
  <meta name="description" content="Rejoue le Zikle #{data.dayNumber} ({data.date}). Compte requis pour jouer aux archives." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives/{data.date}" />
</svelte:head>

<div class="zikle-page">
  <h1>Zikle #{data.dayNumber} — {data.date}</h1>

  {#if !authReady}
    <p>Chargement...</p>
  {:else if !user}
    <div class="zikle-auth-wall">
      <p>🔒 Connecte-toi pour rejouer les archives Zikle.</p>
      <button onclick={() => openAuthModal("login")}>Se connecter</button>
    </div>
  {:else}
    <ZikleGame date={data.date} dayNumber={data.dayNumber} previewUrl={data.previewUrl} />
  {/if}
</div>
