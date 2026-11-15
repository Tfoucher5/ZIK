<script>
  import { version } from '$app/environment';
  import HomeSeo from '$lib/components/home/HomeSeo.svelte';
  import Porte from '$lib/components/accueil/Porte.svelte';
  import Film from '$lib/components/accueil/Film.svelte';
  import Setlist from '$lib/components/accueil/Setlist.svelte';
  import SectionSoiree from '$lib/components/accueil/SectionSoiree.svelte';
  import SectionEnLigne from '$lib/components/accueil/SectionEnLigne.svelte';
  import SectionZikle from '$lib/components/accueil/SectionZikle.svelte';
  import GuideCoupe from '$lib/components/accueil/GuideCoupe.svelte';
  import FaqSection from '$lib/components/accueil/FaqSection.svelte';
  import Final from '$lib/components/accueil/Final.svelte';
  import { ETAGES } from '$lib/components/accueil/scenes.js';
  import { createSon } from '$lib/components/accueil/son.js';
  import { band } from '$lib/components/layout/topBand.svelte.js';

  const son = createSon();
  let on = $state(false);
  const toggle = () => {
    on = !on;
    if (on) son.start();
    else son.stop();
  };

  $effect(() => {
    band.son = {
      get on() {
        return on;
      },
      toggle,
    };
    const cache = () => document.hidden && on && toggle();
    document.addEventListener('visibilitychange', cache);
    return () => {
      document.removeEventListener('visibilitychange', cache);
      son.stop();
      band.son = null;
    };
  });
</script>

<HomeSeo />

<svelte:head>
  {#each ['accueil'] as f (f)}<link rel="stylesheet" href="/css/accueil/{f}.css?v={version}" />{/each}
</svelte:head>

<main>
  <Porte {son} />
  <Film cfg={ETAGES} {son} labelledby="t-etages" dernier />
  <div class="acc-suite">
    <Setlist />
    <SectionSoiree />
    <SectionEnLigne />
    <SectionZikle />
    <GuideCoupe />
    <FaqSection />
    <Final />
  </div>
</main>
