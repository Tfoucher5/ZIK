<script>
  import { getContext } from 'svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import ProHeader from '$lib/components/pro/ProHeader.svelte';
  import ProSteps from '$lib/components/pro/ProSteps.svelte';
  import ProUsages from '$lib/components/pro/ProUsages.svelte';
  import ProSetup from '$lib/components/pro/ProSetup.svelte';
  import ProPricing from '$lib/components/pro/ProPricing.svelte';
  import ProFaq from '$lib/components/pro/ProFaq.svelte';
  import ProCta from '$lib/components/pro/ProCta.svelte';
  import ProMember from '$lib/components/pro/ProMember.svelte';
  import { ProCheckout } from '$lib/components/pro/proCheckout.svelte.js';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';
  import { PAGE_JSON_LD, FAQ_JSON_LD } from '$lib/components/pro/proContent.js';

  const checkout = new ProCheckout(getContext('zik'));
</script>

<svelte:window onpageshow={checkout.refresh} onkeydown={(e) => e.key === 'Escape' && checkout.cancel()} />
<svelte:document onvisibilitychange={checkout.refresh} />

<svelte:head>
  <title>Animation blind test pour bar, camping et entreprise - ZIK Pro</title>
  <meta
    name="description"
    content="Animez une soirée blind test sans animateur. L'écran affiche la partie, vos invités jouent sur leur téléphone. Gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs, ZIK Pro pour les bars, campings et événements."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/pro" />
  <meta
    property="og:title"
    content="Organiser un blind test - ZIK pour les bars et les associations"
  />
  <meta
    property="og:description"
    content="L'écran affiche la partie, vos invités jouent sur leur téléphone. Sans installation et sans animateur."
  />
  <meta property="og:url" content="https://www.zik-music.fr/pro" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={PAGE_JSON_LD} />
  <JsonLd json={FAQ_JSON_LD} />
</svelte:head>

<main class="pro-page">
  <div class="pro-back"><a href="/">← Retour à ZIK</a></div>

  <article class="pro-article">
    {#if checkout.activePro}
      <ProMember {checkout} />
      <ProSteps />
      <ProSetup />
      <ProFaq />
      <ProPricing {checkout} />
    {:else}
      <ProHeader {checkout} />
      <ProSteps />
      <ProUsages />
      <ProSetup />
      <ProPricing {checkout} />
      <ProFaq />
      <ProCta />
    {/if}
  </article>
</main>

<style>
  .pro-page {
    max-width: 860px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 24px) 20px 80px;
  }
  .pro-back {
    margin-bottom: 24px;
  }
  .pro-back a {
    font-size: 0.82rem;
    color: var(--mid);
  }
  .pro-back a:hover {
    color: var(--accent);
  }
</style>
