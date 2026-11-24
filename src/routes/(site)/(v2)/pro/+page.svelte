<script>
  import { getContext } from 'svelte';
  import { version } from '$app/environment';
  import JsonLd from '#lib/components/ui/JsonLd.svelte';
  import ProHero from '#lib/components/pro/ProHero.svelte';
  import ProOffers from '#lib/components/pro/ProOffers.svelte';
  import ProCompare from '#lib/components/pro/ProCompare.svelte';
  import ProDemos from '#lib/components/pro/ProDemos.svelte';
  import ProPay from '#lib/components/pro/ProPay.svelte';
  import ProFaq from '#lib/components/pro/ProFaq.svelte';
  import { ProCheckout } from '#lib/components/pro/proCheckout.svelte.js';
  import { PAGE_JSON_LD, FAQ_JSON_LD, DESCRIPTION } from '#lib/components/pro/proContent.js';

  const checkout = new ProCheckout(getContext('zik'));
</script>

<svelte:window onpageshow={checkout.refresh} onkeydown={(e) => e.key === 'Escape' && checkout.cancel()} />
<svelte:document onvisibilitychange={checkout.refresh} />

<svelte:head>
  <title>Animation blind test pour bar, camping et entreprise - ZIK Pro</title>
  <meta name="description" content={DESCRIPTION} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/pro" />
  <meta property="og:title" content="ZIK Pro - le blind test qui fait la soirée, chez vous" />
  <meta property="og:description" content={DESCRIPTION} />
  <meta property="og:url" content="https://www.zik-music.fr/pro" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  {#each ['page', 'ecrans'] as f (f)}<link rel="stylesheet" href="/css/pro/{f}.css?v={version}" />{/each}
  <JsonLd json={PAGE_JSON_LD} />
  <JsonLd json={FAQ_JSON_LD} />
</svelte:head>

<main class="pro">
  <ProHero {checkout} />
  <ProOffers {checkout} />
  <ProCompare />
  <ProDemos />
  <ProPay />
  <ProFaq />
</main>
