<script>
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import SoireeHero from '$lib/components/soiree/SoireeHero.svelte';
  import Deroule from '$lib/components/soiree/Deroule.svelte';
  import PourQui from '$lib/components/soiree/PourQui.svelte';
  import SoireePro from '$lib/components/soiree/SoireePro.svelte';
  import SoireeFaq from '$lib/components/soiree/SoireeFaq.svelte';
  import SoireeCta from '$lib/components/soiree/SoireeCta.svelte';
  import { soireeJsonLd } from '$lib/components/soiree/soireeContent.js';
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';

  const DESC = `La TV diffuse la musique et le classement, vos invités répondent sur leur téléphone, en solo ou en équipes. Sans appli, gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs.`;
</script>

<svelte:head>
  <title>Blind test en soirée sur la TV, sans animateur - ZIK Soirée</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.zik-music.fr/soiree" />
  <meta property="og:title" content="ZIK Soirée : le blind test sur la TV" />
  <meta property="og:description" content={DESC} />
  <meta property="og:url" content="https://www.zik-music.fr/soiree" />
  <meta name="twitter:title" content="ZIK Soirée : le blind test sur la TV" />
  <meta name="twitter:description" content={DESC} />
  <JsonLd json={soireeJsonLd} />
</svelte:head>

<div class="soiree">
  <SoireeHero />
  <Deroule />
  <PourQui />
  <SoireePro />
  <SoireeFaq />
  <SoireeCta />
</div>

<style>
  .soiree { padding-top: var(--nav-h); }
</style>
