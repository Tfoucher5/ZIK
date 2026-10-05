<script>
  import Card from '$lib/components/card/Card.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { RARITIES } from '$lib/components/card/rarity.js';

  let { data } = $props();

  const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');
  const total = $derived(fmt(data.totals.total));
  const pct = (r) => Math.max(1, Math.round(((data.totals.byRarity[r] ?? 0) / (data.totals.total || 1)) * 100));

  function condition(r) {
    const e = RARITIES[r].exploit;
    const parts = [`${e.players} joueurs connectés`];
    if (e.classic) parts.push(`trouvée en moins de ${e.classic / 1000} s (${e.qcm / 1000} s en QCM)`);
    if (e.notOwnPlaylist) parts.push('jamais sur sa propre playlist');
    return parts.join(', ');
  }

  const FAQ = [
    {
      q: 'Les cartes sont-elles payantes ?',
      a: "Non. Aucune carte ne s'achète : elles se gagnent uniquement en trouvant des titres en jeu. ZIK Pro ne donne aucune carte.",
    },
    {
      q: 'Comment gagner une carte ?',
      a: "Trouve un titre en premier dans une partie à plusieurs, avec un compte, dans une room d'au moins 100 titres et une partie d'au moins 5 manches. La carte de ce titre est pour toi.",
    },
    {
      q: 'Comment avoir une carte Mythique ?',
      a: "Les Mythiques sont les plus grands tubes, environ 1 % des cartes. Il faut trouver le titre en moins de 6 secondes (3 secondes en QCM), avec au moins 4 joueurs connectés, sur la playlist d'un autre.",
    },
    {
      q: 'Que se passe-t-il si je quitte la partie ?',
      a: "Une carte gagnée devient définitive quand tu as joué la moitié des manches. Si tu pars avant, tes cartes de la partie sont perdues : ZIK te prévient avant que tu quittes.",
    },
  ];

  const jsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Cartes musicales ZIK',
          description: `Collectionne ${total} cartes musicales en jouant au blind test : chaque titre trouvé en premier te rapporte sa carte, de Commune à Mythique.`,
          url: 'https://www.zik-music.fr/cartes',
          inLanguage: 'fr-FR',
          isPartOf: { '@type': 'WebSite', url: 'https://www.zik-music.fr/', name: 'ZIK' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.zik-music.fr/' },
            { '@type': 'ListItem', position: 2, name: 'Cartes musicales', item: 'https://www.zik-music.fr/cartes' },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
      ],
    }),
  );
</script>

<svelte:head>
  <title>Cartes musicales : collectionne les tubes en blind test | ZIK</title>
  <meta
    name="description"
    content={`Trouve un titre en premier en blind test et gagne sa carte. ${total} cartes à collectionner, de Commune à Mythique, rangées par artiste et par album. Gratuit, rien à acheter.`}
  />
  <link rel="canonical" href="https://www.zik-music.fr/cartes" />
  <meta property="og:title" content="Cartes musicales ZIK : collectionne les tubes en blind test" />
  <meta property="og:description" content={`${total} cartes à gagner en jouant, de Commune à Mythique.`} />
  <meta property="og:url" content="https://www.zik-music.fr/cartes" />
  {#if data.samples.at(-1)}
    <meta property="og:image" content={`https://www.zik-music.fr${data.samples.at(-1).shareImage}`} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<JsonLd json={jsonLd} />
<CardViewer />

<main class="ct">
  <header class="ct-hero">
    <p class="ct-kicker">Nouveau sur ZIK</p>
    <h1>Collectionne les tubes que tu trouves</h1>
    <p class="ct-lead">
      Chaque titre trouvé en premier dans une partie te rapporte sa carte : pochette, album, année et
      rareté. <strong>{total} cartes</strong> à collectionner, rangées par artiste et par album.
    </p>
    <div class="ct-ctas">
      <a class="ct-btn ct-btn-main" href="/rooms">Jouer pour gagner des cartes</a>
      <a class="ct-btn" href="/collection">Ma collection</a>
    </div>
  </header>

  <section class="ct-section" aria-labelledby="ct-how">
    <h2 id="ct-how">Comment gagner une carte</h2>
    <ol class="ct-steps">
      <li><strong>Rejoins une room</strong><span>avec un compte, à au moins deux joueurs connectés, sur une playlist d'au moins 100 titres.</span></li>
      <li><strong>Trouve le titre en premier</strong><span>en tapant la réponse ou en QCM : sa carte est pour toi.</span></li>
      <li><strong>Reste jusqu'à la moitié</strong><span>de la partie : tes cartes sont alors sécurisées dans ta collection.</span></li>
    </ol>
  </section>

  <section class="ct-section" aria-labelledby="ct-rar">
    <h2 id="ct-rar">Six raretés, des plus courantes aux plus grands tubes</h2>
    <p class="ct-text">Plus un titre est écouté, plus sa carte est rare. Les plus rares demandent en plus de trouver vite.</p>
    <ul class="ct-rarities">
      {#each data.samples as card (card.id)}
        <li class="ct-rarity" data-rarity={card.rarity}>
          <Card {card} size="sm" inspectable list={data.samples} />
          <div>
            <h3>{RARITIES[card.rarity].label}</h3>
            <p class="ct-share">{fmt(data.totals.byRarity[card.rarity])} cartes, environ {pct(card.rarity)}&nbsp;%</p>
            <p class="ct-cond">{condition(card.rarity)}</p>
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <section class="ct-section" aria-labelledby="ct-sets">
    <h2 id="ct-sets">Complète tes artistes et tes albums</h2>
    <p class="ct-text">
      Ta collection se range par artiste et par album. Les cartes qui te manquent apparaissent en
      silhouette, sans dévoiler le titre : de quoi savoir ce qu'il reste à trouver. Un set complété
      s'affiche en doré.
    </p>
  </section>

  <section class="ct-section" aria-labelledby="ct-faq">
    <h2 id="ct-faq">Questions fréquentes</h2>
    {#each FAQ as f (f.q)}
      <details class="ct-faq">
        <summary>{f.q}</summary>
        <p>{f.a}</p>
      </details>
    {/each}
  </section>

  <footer class="ct-end">
    <a class="ct-btn ct-btn-main" href="/rooms">Trouver une room</a>
    <a class="ct-link" href="/docs#cartes">Toutes les règles des cartes</a>
  </footer>
</main>

<style>
  .ct {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 40px) clamp(16px, 4vw, 40px) 96px;
    color: var(--text);
  }

  .ct-kicker {
    margin: 0 0 10px;
    color: var(--accent);
    font: 700 0.82rem/1 'Barlow', sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font: 700 clamp(2.4rem, 6vw, 4rem) / 1 'Barlow Condensed', sans-serif;
  }

  .ct-lead {
    max-width: 640px;
    margin: 16px 0 0;
    color: var(--mid);
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .ct-lead strong {
    color: var(--text);
  }

  .ct-ctas,
  .ct-end {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 26px;
  }

  .ct-btn {
    display: inline-flex;
    align-items: center;
    min-height: 46px;
    padding: 0 22px;
    border: 1px solid var(--border2);
    border-radius: 99px;
    background: var(--surface);
    color: var(--text);
    font: 600 0.98rem/1 'Barlow', sans-serif;
    text-decoration: none;
  }

  .ct-btn-main {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent, #fff);
  }

  .ct-section {
    margin-top: 64px;
  }

  h2 {
    margin: 0 0 14px;
    font: 700 clamp(1.7rem, 4vw, 2.3rem) / 1.05 'Barlow Condensed', sans-serif;
  }

  .ct-text {
    max-width: 680px;
    margin: 0 0 22px;
    color: var(--mid);
    line-height: 1.6;
  }

  .ct-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }

  .ct-steps li {
    display: grid;
    gap: 6px;
    padding: 20px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    counter-increment: step;
  }

  .ct-steps li::before {
    content: counter(step);
    color: var(--accent);
    font: 700 1.8rem/1 'Barlow Condensed', sans-serif;
  }

  .ct-steps span {
    color: var(--mid);
    line-height: 1.5;
  }

  .ct-rarities {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ct-rarity {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
  }

  .ct-rarity h3 {
    margin: 0 0 6px;
    color: var(--rc, var(--text));
    font: 700 1.5rem/1 'Barlow Condensed', sans-serif;
  }

  .ct-share {
    margin: 0 0 8px;
    font-weight: 600;
  }

  .ct-cond {
    margin: 0;
    color: var(--mid);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .ct-faq {
    max-width: 760px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }

  .ct-faq summary {
    font-weight: 600;
    cursor: pointer;
  }

  .ct-faq p {
    margin: 10px 0 0;
    color: var(--mid);
    line-height: 1.6;
  }

  .ct-end {
    margin-top: 56px;
  }

  .ct-link {
    color: var(--accent);
    font-weight: 600;
  }

  @media (max-width: 480px) {
    .ct-rarities {
      grid-template-columns: 1fr;
    }

    .ct-rarity {
      gap: 14px;
      padding: 12px;
    }
  }

  .ct-btn:focus-visible,
  .ct-link:focus-visible,
  .ct-faq summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
