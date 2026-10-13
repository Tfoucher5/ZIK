<script>
  import { breadcrumb } from '$lib/seo.js';
  import JsonLd from '$lib/components/JsonLd.svelte';

  let { data } = $props();

  const url = 'https://www.zik-music.fr/lieux';
  const title = 'Où jouer à un blind test près de chez vous - bars et lieux | ZIK';
  const description = 'Les bars, associations et lieux qui organisent des soirées blind test avec ZIK : dates, classement du mois et infos pratiques, ville par ville.';
  const breadcrumbJsonLd = breadcrumb([{ name: 'Où jouer', path: '/lieux' }]);

</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <JsonLd json={breadcrumbJsonLd} />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.18.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <span>Où jouer</span>
  </nav>

  <header class="bt-header">
    <h1><span class="bt-kicker">Blind test près de chez vous</span>Où jouer</h1>
    <p class="bt-intro">
      Ces lieux organisent leurs soirées blind test avec ZIK : la musique passe sur l'écran, chacun
      répond sur son téléphone, et les points s'additionnent dans le classement du mois.
    </p>
  </header>

  {#each data.cities as [city, venues] (city)}
    <section class="bt-section">
      <h2>{city}</h2>
      <ul class="bt-others">
        {#each venues as v (v.slug)}
          <li><a href="/lieu/{v.slug}">{v.name}</a></li>
        {/each}
      </ul>
    </section>
  {:else}
    <section class="bt-section">
      <p>Les premiers lieux arrivent. Vous organisez des soirées ?</p>
    </section>
  {/each}

  <section class="bt-section">
    <p class="bt-pro">
      Votre bar ou votre association n'est pas dans la liste ? <a href="/pro">Avec ZIK Pro</a>, vous
      avez votre page, votre logo sur la TV et le classement de vos habitués.
    </p>
  </section>
</main>
