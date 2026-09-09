<script>
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Organiser un blind test - ZIK pour les bars, associations et entreprises",
    description:
      "Animez une soirée blind test sans animateur : l'écran affiche la partie, vos invités jouent sur leur téléphone. Gratuit, sans installation et sans compte.",
    url: "https://www.zik-music.fr/pro",
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebSite",
      url: "https://www.zik-music.fr/",
      name: "ZIK",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: "https://www.zik-music.fr/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Organiser un blind test",
          item: "https://www.zik-music.fr/pro",
        },
      ],
    },
  });

  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Combien de personnes peuvent jouer en même temps ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Une trentaine de joueurs sur un même salon. Chacun joue sur son propre téléphone, il n'y a rien à installer.",
        },
      },
      {
        "@type": "Question",
        name: "Faut-il créer un compte pour organiser une soirée ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non. L'hôte lance un salon depuis un navigateur et les joueurs rejoignent avec un code. Aucune inscription n'est demandée.",
        },
      },
      {
        "@type": "Question",
        name: "Est-ce que c'est payant ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non, le Mode Salon est gratuit et sans limite d'utilisation. ZIK est un projet indépendant financé par des dons.",
        },
      },
      {
        "@type": "Question",
        name: "Quel matériel faut-il prévoir ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Un écran relié à un ordinateur, du son, une connexion internet correcte, et un téléphone par joueur.",
        },
      },
    ],
  });

  const usages = [
    {
      titre: "Bars et restaurants",
      texte:
        "Remplissez un mardi soir sans payer d'animateur. La partie tourne sur la TV, les clients jouent sur leur téléphone, vous n'avez qu'à annoncer le thème.",
    },
    {
      titre: "Associations et MJC",
      texte:
        "Une animation qui fonctionne de 12 à 77 ans, sans matériel spécifique et sans budget. Le Mode QCM évite d'avoir à taper au clavier.",
    },
    {
      titre: "Entreprises et CE",
      texte:
        "Un temps d'équipe qui ne ressemble pas à une réunion. Fonctionne aussi à distance : chacun rejoint le salon depuis chez lui.",
    },
    {
      titre: "Anniversaires, EVJF et EVG",
      texte:
        "Créez une playlist sur mesure à partir de Spotify ou Deezer et transformez-la en blind test en quelques minutes.",
    },
  ];

  const etapes = [
    {
      n: "1",
      titre: "Ouvrez un salon sur l'écran",
      texte:
        "Depuis l'ordinateur relié à la TV ou au vidéoprojecteur, choisissez un thème et lancez le salon. Un code à 4 caractères s'affiche.",
    },
    {
      n: "2",
      titre: "Vos invités rejoignent",
      texte:
        "Ils ouvrent zik-music.fr sur leur téléphone, saisissent le code et leur pseudo. Rien à télécharger, rien à installer.",
    },
    {
      n: "3",
      titre: "La soirée se déroule seule",
      texte:
        "L'écran diffuse les extraits et le classement, les téléphones servent de manettes. Vous n'avez plus rien à animer.",
    },
  ];
</script>

<svelte:head>
  <title>Organiser un blind test dans votre bar ou votre association - ZIK</title>
  <meta
    name="description"
    content="Animez une soirée blind test sans animateur et sans budget. L'écran affiche la partie, vos invités jouent sur leur téléphone. Gratuit, sans installation, sans compte."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/pro" />
  <meta
    property="og:title"
    content="Organiser un blind test - ZIK pour les bars et les associations"
  />
  <meta
    property="og:description"
    content="L'écran affiche la partie, vos invités jouent sur leur téléphone. Gratuit, sans installation et sans animateur."
  />
  <meta property="og:url" content="https://www.zik-music.fr/pro" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.7.1" />
  <script type="application/ld+json">{@html jsonLd}</script>
  <script type="application/ld+json">{@html faqJsonLd}</script>
</svelte:head>

<main class="pro-page">
  <div class="pro-back"><a href="/">← Retour à ZIK</a></div>

  <article class="pro-article">
    <header class="pro-header">
      <span class="pro-tag">Mode Salon</span>
      <h1>Organisez votre blind test sans animateur</h1>
      <p class="pro-intro">
        Un écran, du son, et les téléphones que vos invités ont déjà dans la
        poche. ZIK s'occupe du reste : les extraits, les points, le classement
        et le suspense. C'est gratuit, il n'y a rien à installer et personne
        n'a besoin de créer un compte.
      </p>
      <a class="pro-cta-btn" href="/salon">Lancer un salon maintenant</a>
    </header>

    <section class="pro-section">
      <h2>Comment ça se passe</h2>
      <ol class="pro-steps">
        {#each etapes as e (e.n)}
          <li>
            <span class="pro-step-n">{e.n}</span>
            <div>
              <h3>{e.titre}</h3>
              <p>{e.texte}</p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <section class="pro-section">
      <h2>À qui ça sert</h2>
      <div class="pro-grid">
        {#each usages as u (u.titre)}
          <div class="pro-card">
            <h3>{u.titre}</h3>
            <p>{u.texte}</p>
          </div>
        {/each}
      </div>
    </section>

    <section class="pro-section">
      <h2>Ce qu'il vous faut</h2>
      <ul>
        <li>
          Un écran relié à un ordinateur : télévision, vidéoprojecteur ou simple
          moniteur
        </li>
        <li>Du son, idéalement autre chose que les haut-parleurs de l'écran</li>
        <li>Une connexion internet correcte pour l'ordinateur hôte</li>
        <li>Un téléphone par joueur, avec ou sans wifi</li>
      </ul>
      <p>
        Comptez une trentaine de joueurs par salon. Si quelqu'un perd sa
        connexion en cours de route, il retrouve sa place et son score en
        rejoignant à nouveau.
      </p>
    </section>

    <section class="pro-section">
      <h2>Le choix de la musique</h2>
      <p>
        Vous pouvez partir des thèmes déjà prêts (années 80, rap français,
        Disney, génériques de séries...) ou construire votre propre playlist en
        important directement depuis Spotify ou Deezer. De quoi coller à votre
        public plutôt qu'à une sélection générique.
      </p>
      <p>
        Deux formats au choix : le Mode Classique, où l'on tape le titre et
        l'artiste, et le Mode QCM avec quatre propositions, plus accessible
        quand les niveaux sont très différents ou quand il y a du monde.
      </p>
    </section>

    <section class="pro-section">
      <h2>Combien ça coûte</h2>
      <p>
        Rien. Il n'y a ni abonnement, ni version payante, ni limite
        d'utilisation, et vous pouvez organiser autant de soirées que vous
        voulez.
      </p>
      <p>
        ZIK est développé par une seule personne, sans société derrière. Les
        serveurs sont financés par les dons de ceux qui jouent. Si l'outil vous
        rend service, la page <a href="/soutenir">Soutenir ZIK</a> existe pour ça,
        mais rien ne vous y oblige.
      </p>
    </section>

    <section class="pro-section">
      <h2>Questions fréquentes</h2>
      <dl class="pro-faq">
        <dt>Faut-il installer quelque chose ?</dt>
        <dd>
          Non, ni pour l'hôte ni pour les joueurs. Tout se passe dans le
          navigateur.
        </dd>
        <dt>Mes clients doivent-ils créer un compte ?</dt>
        <dd>
          Non. Ils saisissent un code et un pseudo, c'est tout. Un compte ne
          sert qu'à conserver ses statistiques et son classement.
        </dd>
        <dt>Et si la connexion coupe pendant la partie ?</dt>
        <dd>
          Un joueur déconnecté retrouve sa partie et ses points en rejoignant.
          Côté hôte, le salon reste ouvert quelques minutes le temps de revenir.
        </dd>
        <dt>Peut-on jouer à distance ?</dt>
        <dd>
          Oui. Il suffit de partager l'écran de l'hôte en visio et de donner le
          code du salon.
        </dd>
        <dt>Puis-je afficher ZIK dans mon établissement ?</dt>
        <dd>
          Bien sûr, et ça fait plaisir. Écrivez-nous si vous voulez un visuel ou
          un QR code à imprimer pour vos tables.
        </dd>
      </dl>
    </section>

    <div class="pro-cta">
      <p>
        Le plus simple reste d'essayer : montez un salon en trente secondes,
        sans inscription et sans engagement.
      </p>
      <a class="pro-cta-btn" href="/salon">Créer un salon</a>
      <p class="pro-contact">
        Une question, un besoin particulier ou l'envie d'un visuel pour votre
        établissement ? Écrivez à
        <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a>.
      </p>
    </div>
  </article>
</main>

<style>
  .pro-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }
  .pro-back {
    margin-bottom: 24px;
  }
  .pro-back a {
    font-size: 0.82rem;
    color: var(--mid);
  }
  .pro-back a:hover {
    color: var(--accent);
  }

  .pro-header {
    margin-bottom: 48px;
  }
  .pro-tag {
    display: inline-block;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    border-radius: 999px;
    padding: 5px 14px;
    margin-bottom: 16px;
  }
  .pro-header h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .pro-intro {
    font-size: 0.98rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 24px;
  }

  .pro-section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }
  .pro-section h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 16px;
    color: var(--text);
  }
  .pro-section p {
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 10px;
  }
  .pro-section a {
    color: var(--accent);
  }
  .pro-section ul {
    padding-left: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }
  .pro-section ul li {
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.6;
    padding-left: 18px;
    position: relative;
  }
  .pro-section ul li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 700;
  }

  .pro-steps {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .pro-steps li {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .pro-step-n {
    flex: 0 0 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
  }
  .pro-steps h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }
  .pro-steps p {
    margin-bottom: 0;
  }

  .pro-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 14px;
  }
  .pro-card {
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px;
  }
  .pro-card h3 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 8px;
  }
  .pro-card p {
    margin-bottom: 0;
  }

  .pro-faq dt {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
    margin-top: 16px;
  }
  .pro-faq dt:first-child {
    margin-top: 0;
  }
  .pro-faq dd {
    margin: 6px 0 0;
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.7;
  }

  .pro-cta {
    margin-top: 48px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .pro-cta p {
    font-size: 0.92rem;
    color: var(--mid);
    margin-bottom: 16px;
    line-height: 1.7;
  }
  .pro-cta-btn {
    display: inline-block;
    background: var(--accent);
    color: #000;
    font-weight: 800;
    font-family: "Barlow Condensed", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.95rem;
    transition: opacity 0.15s;
  }
  .pro-cta-btn:hover {
    opacity: 0.85;
  }
  .pro-contact {
    margin: 18px 0 0;
    font-size: 0.85rem;
  }
  .pro-contact a {
    color: var(--accent);
  }
</style>
