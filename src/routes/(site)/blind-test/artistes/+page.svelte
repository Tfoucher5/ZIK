<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { breadcrumb } from '$lib/seo.js';

  let { data } = $props();

  const SITE = 'https://www.zik-music.fr';
  const url = `${SITE}/blind-test/artistes`;
  const title = 'Blind test par artiste gratuit - Ninho, Jul, GIMS, Aya Nakamura… | ZIK';
  let description = $derived(`${data.artists.length} blind tests par artiste à jouer gratuitement en ligne : Ninho, Jul, GIMS, Aya Nakamura, Damso… 10 titres au hasard par partie, seul ou entre amis.`);

  const breadcrumbJsonLd = breadcrumb([
    { name: 'Blind test par thème', path: '/blind-test' },
    { name: 'Par artiste', path: '/blind-test/artistes' },
  ]);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <JsonLd json={breadcrumbJsonLd} />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.18.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/blind-test">Blind test</a> › <span>Par artiste</span>
  </nav>

  <header class="bt-header">
    <h1><span class="bt-kicker">Blind test</span>Par artiste</h1>
    <p class="bt-intro">
      Fan d'un artiste ? Prouvez-le : chaque blind test tire 10 de ses titres au hasard, et vous devez les
      reconnaître en quelques secondes. Gratuit, sans compte, seul ou entre amis.
    </p>
  </header>

  <section class="bt-section">
    <h2>Les artistes, du plus populaire au moins connu</h2>
    <ul class="bt-others">
      {#each data.artists as a (a.slug)}
        <li><a href="/blind-test/artiste/{a.slug}">{a.name} <small>· {a.trackCount} titres</small></a></li>
      {/each}
    </ul>
  </section>
</main>
