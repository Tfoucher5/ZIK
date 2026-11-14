<script>
  import HomeSeo from '$lib/components/home/HomeSeo.svelte';
  import ResumeBand from '$lib/components/accueil/ResumeBand.svelte';
  import CodeStub from '$lib/components/accueil/CodeStub.svelte';
  import Doors from '$lib/components/accueil/Doors.svelte';
  import AccueilGuide from '$lib/components/accueil/AccueilGuide.svelte';
  import SoireeFaq from '$lib/components/soiree/SoireeFaq.svelte';
  import { FAQ } from '$lib/components/accueil/guide.js';
</script>

<HomeSeo />

<main class="ag">
  <ResumeBand />
  <header class="ag-head">
    <h1>Le blind test, en ligne ou en soirée</h1>
    <div class="ag-code"><CodeStub /></div>
  </header>
  <Doors />
  <AccueilGuide />
  <SoireeFaq items={FAQ} />
</main>

<style>
  .ag { padding-top: var(--nav-h); }
  .ag-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 520px);
    gap: 24px 48px;
    align-items: end;
    padding: 40px clamp(16px, 4vw, 56px) 32px;
  }
  h1 {
    margin: 0;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.4rem, 5.4vw, 5rem);
    line-height: 0.92;
    text-transform: uppercase;
    letter-spacing: -0.01em;
  }

  @media (max-width: 900px) {
    .ag-head { grid-template-columns: 1fr; padding-top: 24px; }
  }
</style>
