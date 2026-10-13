<script>
  import { getContext } from 'svelte';
  import { breadcrumb } from '$lib/seo.js';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import VenueCard from '$lib/components/venue/VenueCard.svelte';

  let { data } = $props();
  const zik = getContext('zik');

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
  <link rel="stylesheet" href="/css/venue.css?v=3.18.0" />
</svelte:head>

<main class="vn-page">
  <nav class="vn-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <span>Où jouer</span>
  </nav>

  <header class="lx-head">
    <span class="vn-tag">Blind test près de chez vous</span>
    <h1 class="vn-title">Où jouer</h1>
    <p class="vn-lead">
      Ces lieux organisent leurs soirées blind test avec ZIK : la musique passe sur l'écran, chacun
      répond sur son téléphone, et les points s'additionnent dans le classement du mois.
    </p>
  </header>

  {#each data.cities as [city, venues] (city)}
    <section class="lx-city">
      <h2>{city} <small>{venues.length} lieu{venues.length > 1 ? 'x' : ''}</small></h2>
      <ul>
        {#each venues as v (v.slug)}
          <li><VenueCard venue={v} /></li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="vn-empty">Les premiers lieux arrivent. Vous organisez des soirées ? Votre lieu peut être le premier de la liste.</p>
  {/each}

  <aside class="vn-card lx-pro">
    {#if zik.user?.pro}
      <div>
        <h2>Votre lieu n'apparaît pas ?</h2>
        <p class="vn-card-sub">Il s'affiche ici dès que sa page est créée dans votre espace organisateur.</p>
      </div>
      <a class="vn-btn" href="/pro/lieu">Gérer mon lieu</a>
    {:else}
      <div>
        <h2>Votre lieu n'est pas dans la liste ?</h2>
        <p class="vn-card-sub">Avec ZIK Pro, votre bar ou votre association a sa page, son logo sur la TV et le classement de ses habitués.</p>
      </div>
      <a class="vn-btn" href="/pro">Découvrir ZIK Pro</a>
    {/if}
  </aside>
</main>

<style>
  .lx-head { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin-bottom: 40px; }
  .lx-city { margin-bottom: 32px; }
  .lx-city h2 {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--text);
  }
  .lx-city h2 small { font-family: inherit; font-size: 0.85rem; font-weight: 600; color: var(--dim); }
  .lx-city ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .lx-pro { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 40px; }
  .lx-pro h2 { margin-bottom: 4px; }
  .lx-pro .vn-btn { flex: none; }
  @media (max-width: 640px) {
    .lx-pro { flex-direction: column; align-items: flex-start; }
  }
</style>
