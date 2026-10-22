<script>
  import { getContext } from 'svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import VenueLeague from '$lib/components/venue/VenueLeague.svelte';
  import VenueEvents from '$lib/components/venue/VenueEvents.svelte';
  import VenueHero from '$lib/components/venue/VenueHero.svelte';
  import { breadcrumb } from '$lib/seo.js';
  import { seasonLabel, venueTheme } from '$lib/venues.js';

  let { data } = $props();
  const zik = getContext('zik');

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
  <link rel="stylesheet" href="/css/venue.css?v=3.18.0" />
</svelte:head>

{#snippet actions(e)}
  <a class="vp-ics" href="/lieu/{v.slug}/agenda/{e.id}" download title="Ajouter à mon agenda">📅 Agenda</a>
{/snippet}

<main class="vn-page" style={venueTheme(v.color)}>
  <nav class="vn-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/lieux">Où jouer</a> › <span>{v.name}</span>
  </nav>

  <VenueHero venue={v} followers={data.followers} />

  <div class="vp-grid">
    <section class="vn-card">
      <div class="vn-card-head"><h2>Prochaines soirées</h2></div>
      <VenueEvents events={data.events} empty={v.schedule ? `Rendez-vous ${v.schedule.toLowerCase()}.` : "Pas de date annoncée pour l'instant."} {actions} />
    </section>

    <section class="vn-card">
      <div class="vn-card-head">
        <h2>Classement de {season}</h2>
        <span class="vn-card-sub">{data.ranking.length} joueur{data.ranking.length > 1 ? 's' : ''}</span>
      </div>
      <VenueLeague ranking={data.ranking} {season} />
      <p class="vp-note">
        Les points de chaque soirée s'additionnent jusqu'à la fin du mois. Seuls les joueurs connectés
        à leur compte ZIK y entrent : un pseudo d'invité ne compte pas, personne ne peut donc jouer à
        votre place. <a href="/?auth=register&ref=lieu">Créer un compte gratuit</a>.
      </p>
    </section>
  </div>

  {#if v.description}
    <section class="vn-card vp-about">
      <h2>Le lieu</h2>
      <p>{v.description}</p>
    </section>
  {/if}

  <section class="vp-how" aria-label="Comment jouer">
    {#each [
      ['Scannez ou tapez le code', 'Le code de la partie est affiché sur l\'écran du lieu. Pas d\'application à installer.'],
      ['Répondez sur votre téléphone', 'Titre, artiste : plus vous êtes rapide, plus vous marquez de points.'],
      ['Grimpez au classement', 'Chaque soirée compte pour le classement du mois, affiché sur cette page.'],
    ] as [t, d], i (t)}
      <div><b>{i + 1}</b><h3>{t}</h3><p>{d}</p></div>
    {/each}
  </section>

  <aside class="vp-pro">
    {#if zik.user?.pro}
      <p><b>Votre espace ZIK Pro</b> : modifiez votre lieu, programmez vos soirées et prévenez ceux qui vous suivent.</p>
      <a class="vn-btn vn-btn-ghost" href="/profile">Mon espace organisateur</a>
    {:else}
      <p><b>Vous gérez un bar, une association ou un camping ?</b> Votre page, votre logo sur la TV et le classement de vos habitués.</p>
      <a class="vn-btn vn-btn-ghost" href="/pro">Découvrir ZIK Pro</a>
    {/if}
  </aside>
</main>

<style>
  .vp-ics {
    flex: none;
    padding: 7px 12px;
    border: 1px solid var(--border2);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }
  .vp-ics:hover { border-color: var(--accent); color: var(--accent); }
  .vp-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
  .vp-note { margin-top: 16px; font-size: 0.8rem; line-height: 1.6; color: var(--dim); }
  .vp-about { margin-top: 20px; }
  .vp-about h2 { margin-bottom: 10px; }
  .vp-about p { font-size: 0.95rem; line-height: 1.75; color: var(--mid); white-space: pre-line; }
  .vp-how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin: 44px 0; }
  .vp-how b {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    margin-bottom: 12px;
    border-radius: 10px;
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.1rem;
    font-weight: 900;
  }
  .vp-how h3 { font-size: 0.98rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .vp-how p { font-size: 0.86rem; line-height: 1.6; color: var(--mid); }
  .vp-pro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 20px 24px;
    border: 1px dashed var(--border2);
    border-radius: 16px;
  }
  .vp-pro p { font-size: 0.9rem; line-height: 1.6; color: var(--mid); }
  .vp-pro p b { color: var(--text); }
  .vp-pro .vn-btn { flex: none; }
  @media (max-width: 820px) {
    .vp-grid, .vp-how { grid-template-columns: 1fr; }
    .vp-pro { flex-direction: column; align-items: flex-start; }
  }
</style>
