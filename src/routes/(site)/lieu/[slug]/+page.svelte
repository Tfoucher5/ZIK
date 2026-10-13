<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import VenueLeague from '$lib/components/venue/VenueLeague.svelte';
  import VenueEvents from '$lib/components/venue/VenueEvents.svelte';
  import { breadcrumb } from '$lib/seo.js';
  import { seasonLabel } from '$lib/venues.js';

  let { data } = $props();

  const SITE = 'https://www.zik-music.fr';
  const season = seasonLabel();

  let v = $derived(data.venue);
  let url = $derived(`${SITE}/lieu/${v.slug}`);
  let title = $derived(`Blind test ${v.name} à ${v.city} - soirées et classement | ZIK`);
  let description = $derived(
    `Soirées blind test chez ${v.name} (${v.city})${v.schedule ? ` : ${v.schedule.toLowerCase()}` : ''}. Prochaines dates, classement du mois des joueurs, on joue sur son téléphone.`,
  );

  let place = $derived({ '@type': 'Place', name: v.name, address: v.address || v.city });
  let jsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: v.name,
    url: v.website || url,
    address: v.address || v.city,
    ...(v.description ? { description: v.description } : {}),
    event: data.events.map((e) => ({
      '@type': 'Event',
      name: `Blind test${e.theme ? ` ${e.theme}` : ''} chez ${v.name}`,
      startDate: e.starts_at,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: place,
      organizer: { '@type': 'Organization', name: v.name, url },
    })),
  }));
  let breadcrumbJsonLd = $derived(breadcrumb([
    { name: 'Où jouer', path: '/lieux' },
    { name: v.name, path: `/lieu/${v.slug}` },
  ]));
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content={v.active ? 'index, follow' : 'noindex, follow'} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <JsonLd json={jsonLd} />
  <JsonLd json={breadcrumbJsonLd} />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.18.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/lieux">Où jouer</a> › <span>{v.name}</span>
  </nav>

  <header class="bt-header venue-head">
    {#if v.logo}<img class="venue-logo" src={v.logo} alt="Logo {v.name}" />{/if}
    <h1><span class="bt-kicker">Blind test à {v.city}</span>{v.name}</h1>
    {#if v.address}<p class="bt-intro">{v.address}</p>{/if}
    <div class="bt-ctas">
      <a class="bt-cta bt-cta-main" href="/salon/play">
        <b>Je suis sur place</b>
        <span>Entrer le code affiché sur la TV</span>
      </a>
      {#if v.website}
        <a class="bt-cta" href={v.website} rel="noopener" target="_blank">
          <b>Le lieu</b>
          <span>Site, réservations, infos pratiques</span>
        </a>
      {/if}
    </div>
  </header>

  {#if v.description}
    <section class="bt-section"><p class="bt-intro">{v.description}</p></section>
  {/if}

  <section class="bt-section">
    <h2>Prochaines soirées</h2>
    <VenueEvents events={data.events} schedule={v.schedule} />
  </section>

  <section class="bt-section">
    <h2>Classement de {season}</h2>
    <VenueLeague ranking={data.ranking} {season} />
    <p class="bt-pro">
      Les points de chaque soirée s'additionnent jusqu'à la fin du mois. Jouez connecté à votre
      compte ZIK pour que vos points vous suivent, même si vous changez de pseudo.
    </p>
  </section>

  <section class="bt-section">
    <h2>Vous aussi ?</h2>
    <p>
      Bar, association, camping : <a href="/pro">organisez vos soirées blind test avec ZIK Pro</a>,
      ou <a href="/lieux">trouvez un autre lieu près de chez vous</a>.
    </p>
  </section>
</main>

<style>
  .venue-head { display: flex; flex-direction: column; }
  .venue-logo { width: 96px; height: 96px; object-fit: contain; margin-bottom: 8px; }
  .bt-page p a { color: var(--text); text-underline-offset: 3px; }
</style>
