<script>
  import { version } from '$app/environment';
  import { setContext } from 'svelte';
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import SoireeScene from '$lib/components/soiree/SoireeScene.svelte';
  import Frise from '$lib/components/soiree/Frise.svelte';
  import Rejoindre from '$lib/components/soiree/Rejoindre.svelte';
  import Manche from '$lib/components/soiree/Manche.svelte';
  import Revelation from '$lib/components/soiree/Revelation.svelte';
  import Reponses from '$lib/components/soiree/Reponses.svelte';
  import Speciales from '$lib/components/soiree/Speciales.svelte';
  import Regie from '$lib/components/soiree/Regie.svelte';
  import Enchainer from '$lib/components/soiree/Enchainer.svelte';
  import Podium from '$lib/components/soiree/Podium.svelte';
  import Tient from '$lib/components/soiree/Tient.svelte';
  import Materiel from '$lib/components/soiree/Materiel.svelte';
  import Offres from '$lib/components/soiree/Offres.svelte';
  import SoireeFin from '$lib/components/soiree/SoireeFin.svelte';
  import { DESC, soireeJsonLd } from '$lib/components/soiree/soireeContent.js';
  import { mountPins, pinRegistry, replacer } from '$lib/components/soiree/soireePins.js';

  const pins = pinRegistry();
  setContext('soiree-pins', pins);

  // Retour arrière : scroll noté au départ, reposé après l'épinglage (replacer)
  let retour = null;
  export const snapshot = {
    capture: () => scrollY,
    restore: (y) => {
      retour = y;
      if (pins.live) replacer(y, "", pins.st);
    },
  };

  // GSAP seulement ici, chargé après l'affichage ; sans lui (mouvements réduits,
  // échec du chargement) les sections restent dépliées et lisibles (.rm)
  $effect(() => {
    const html = document.documentElement;
    const calme = matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('rm') || html.classList.contains('no-animations');
    if (calme) return;
    let stop;
    let fini = false;
    mountPins(pins).then(
      (s) => {
        if (fini) return s();
        stop = s;
        replacer(retour, location.hash, pins.st);
      },
      () => html.classList.add('rm'),
    );
    return () => {
      fini = true;
      stop?.();
    };
  });
</script>

<svelte:head>
  <title>Blind test en soirée sur la TV - ZIK Soirée</title>
  <meta name="description" content={DESC} />
  <link rel="canonical" href="https://www.zik-music.fr/soiree" />
  <meta property="og:title" content="ZIK Soirée : le blind test qui fait la soirée" />
  <meta property="og:description" content={DESC} />
  <meta property="og:url" content="https://www.zik-music.fr/soiree" />
  <meta name="twitter:title" content="ZIK Soirée : le blind test qui fait la soirée" />
  <meta name="twitter:description" content={DESC} />
  <link rel="preload" as="image" href="/media/soiree/bar-portrait-v1.webp" media="(orientation: portrait)" />
  <link rel="preload" as="image" href="/media/soiree/bar-paysage-v1.webp" media="(orientation: landscape)" />
  {#each ['page', 'tv', 'phone', 'calme'] as f (f)}<link rel="stylesheet" href="/css/soiree/{f}.css?v={version}" />{/each}
  <JsonLd json={soireeJsonLd} />
</svelte:head>

<main class="sv">
  <SoireeScene />
  <Frise />
  <Rejoindre />
  <Manche />
  <Revelation />
  <Reponses />
  <Speciales />
  <Regie />
  <Enchainer />
  <Podium />
  <Tient />
  <Materiel />
  <Offres />
  <SoireeFin />
</main>
