<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import RoomJoinCard from '$lib/components/rooms/RoomJoinCard.svelte';
  import { breadcrumb } from '$lib/seo.js';

  let { data } = $props();

  const SITE = 'https://www.zik-music.fr';
  const SHOWN_TITLES = 80;

  let artist = $derived(data.artist);
  let n = $derived(data.titles.length);
  let url = $derived(`${SITE}/blind-test/artiste/${artist.slug}`);
  let fans = $derived(new Intl.NumberFormat('fr-FR').format(artist.nbFan));
  let title = $derived(`Blind test ${artist.name} gratuit - ${n} titres à deviner | ZIK`);
  let description = $derived(`Blind test ${artist.name} : ${n} titres de ${artist.name} à reconnaître en 10 manches. Gratuit, en ligne, seul ou entre amis, sans installation ni compte.`);

  let faq = $derived([
    {
      q: `Le blind test ${artist.name} est-il gratuit ?`,
      a: `Oui. Un pseudo suffit pour jouer, sans compte ni téléchargement. Un compte gratuit ajoute le classement ELO et la collection de cartes.`,
    },
    {
      q: `Combien de chansons de ${artist.name} sont au programme ?`,
      a: `${n} titres. Chaque partie en tire 10 au hasard, donc deux parties ne se ressemblent jamais.`,
    },
    {
      q: 'Peut-on jouer à plusieurs ?',
      a: `Oui : partagez le lien de la room pour que vos amis vous rejoignent en direct. En soirée, le mode Salon diffuse la musique sur la TV et chacun répond depuis son téléphone.`,
    },
  ]);

  let breadcrumbJsonLd = $derived(breadcrumb([
    { name: 'Blind test par thème', path: '/blind-test' },
    { name: 'Par artiste', path: '/blind-test/artistes' },
    { name: artist.name, path: `/blind-test/artiste/${artist.slug}` },
  ]));

  let faqJsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }));

  async function getCode() {
    const r = await fetch(`/api/blind-test/artiste/${artist.slug}`, { method: 'POST' });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || 'Impossible de lancer la partie, réessaie.');
    return body.code;
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  {#if data.cover}<meta property="og:image" content={data.cover} />{/if}
  <JsonLd json={breadcrumbJsonLd} />
  <JsonLd json={faqJsonLd} />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.18.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/blind-test/artistes">Blind test par artiste</a> › <span>{artist.name}</span>
  </nav>

  <article>
    <header class="bt-header bt-artist-head">
      <div>
        <h1><span class="bt-kicker">Blind test</span>{artist.name}</h1>
        <p class="bt-intro">
          {n} titres de {artist.name} à reconnaître. À chaque manche, un extrait démarre à un moment
          différent du morceau : trouvez le titre avant les autres.
        </p>
      </div>
      <RoomJoinCard title="Lancer une partie" getCode={getCode} />
    </header>

    <section class="bt-section">
      <p class="bt-intro">
        Chaque partie tire 10 titres au hasard parmi les {n} : tubes et morceaux moins connus se mélangent,
        de quoi départager les vrais fans. Jouez seul pour tester vos connaissances, ou partagez le lien de
        la room pour défier vos amis en direct.
      </p>
      <p class="bt-intro">{artist.name} réunit {fans} fans sur Deezer. Combien de ses titres reconnaîtrez-vous en quelques secondes ?</p>
    </section>

    <section class="bt-section">
      <h2>Les titres en jeu</h2>
      <ul class="bt-titles">
        {#each data.titles.slice(0, SHOWN_TITLES) as t, i (i)}
          <li>{t}</li>
        {/each}
      </ul>
      {#if n > SHOWN_TITLES}
        <p>Et {n - SHOWN_TITLES} autres titres.</p>
      {/if}
    </section>

    <section class="bt-section">
      <h2>Comment ça marche</h2>
      <ol class="bt-steps">
        <li><b>Choisissez un pseudo</b> et lancez la partie. Aucun compte à créer.</li>
        <li><b>Un extrait passe à chaque manche</b> : tapez le titre (et les featurings) le plus vite possible.</li>
        <li><b>Plus vous répondez vite, plus vous marquez</b>. Le classement s'affiche à la fin des 10 manches.</li>
      </ol>
    </section>

    <section class="bt-section">
      <h2>Questions fréquentes</h2>
      <dl class="bt-faq">
        {#each faq as { q, a } (q)}
          <dt>{q}</dt>
          <dd>{a}</dd>
        {/each}
      </dl>
    </section>

    <section class="bt-section">
      {#if data.related.length}
        <h2>Si vous aimez {artist.name}</h2>
        <ul class="bt-others">
          {#each data.related as r (r.slug)}
            <li><a href="/blind-test/artiste/{r.slug}">Blind test {r.name}</a></li>
          {/each}
        </ul>
      {/if}
      <p class="bt-pro">
        <a href="/blind-test/artistes">Tous les artistes</a> · <a href="/blind-test">Blind test par thème</a> ·
        <a href="/salon">Organiser une soirée blind test</a>
      </p>
    </section>
  </article>
</main>
