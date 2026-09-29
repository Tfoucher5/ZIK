<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { PLANS, PRO_COMING, FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "$lib/proPlans.js";

  const COMPARE = [
    ["Joueurs par salon", `jusqu'à ${FREE_MAX_PLAYERS}`, "illimité"],
    ["Équipes", `jusqu'à ${FREE_MAX_TEAMS}`, "jusqu'à 8, renommables"],
    ["Régie sur un second écran", "lancer, pause, manche suivante, exclure un joueur", "tout : révéler, terminer, corriger les points, volume de la TV"],
    ["Réglages en pleine partie", "entre deux parties", "à tout moment"],
  ];

  let wl = $state({ email: "", venue: "", venueType: "bar", plan: "monthly" });
  let wlState = $state("idle");
  let wlError = $state("");

  async function joinWaitlist(e) {
    e.preventDefault();
    wlState = "sending";
    wlError = "";
    try {
      const res = await fetch("/api/pro/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(wl),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Envoi impossible");
      wlState = "done";
    } catch (err) {
      wlError = err.message;
      wlState = "idle";
    }
  }
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Organiser un blind test - ZIK pour les bars, associations et entreprises",
    description:
      "Animez une soirée blind test sans animateur : l'écran affiche la partie, vos invités jouent sur leur téléphone. Sans installation, gratuit jusqu'à 12 joueurs, ZIK Pro pour les bars et événements.",
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
          text: "Jusqu'à 12 joueurs en version gratuite, sans limite avec ZIK Pro. Chacun joue sur son propre téléphone, il n'y a rien à installer.",
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
          text: "Le Mode Salon est gratuit jusqu'à 12 joueurs et 2 équipes. ZIK Pro débloque les joueurs illimités, 8 équipes et la régie complète, dès 7,90 € HT la soirée.",
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
        "Depuis l'ordinateur relié à la TV ou au vidéoprojecteur, choisissez un thème et lancez le salon. Un code à 6 caractères s'affiche.",
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
  <title>Animation blind test pour bar, camping et entreprise - ZIK Pro</title>
  <meta
    name="description"
    content="Animez une soirée blind test sans animateur. L'écran affiche la partie, vos invités jouent sur leur téléphone. Gratuit jusqu'à 12 joueurs, ZIK Pro pour les bars, campings et événements."
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/pro" />
  <meta
    property="og:title"
    content="Organiser un blind test - ZIK pour les bars et les associations"
  />
  <meta
    property="og:description"
    content="L'écran affiche la partie, vos invités jouent sur leur téléphone. Sans installation et sans animateur."
  />
  <meta property="og:url" content="https://www.zik-music.fr/pro" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.9.0" />
  <JsonLd json={jsonLd} />
  <JsonLd json={faqJsonLd} />
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
        et le suspense. Il n'y a rien à installer et vos invités n'ont pas
        besoin de créer un compte.
      </p>
      <div class="pro-header-ctas">
        <a class="pro-cta-btn" href="/salon">Essayer gratuitement</a>
        <a class="pro-cta-ghost" href="#tarifs">Voir les tarifs</a>
      </div>
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
        Jusqu'à {FREE_MAX_PLAYERS} joueurs en version gratuite, sans limite avec ZIK Pro. Si quelqu'un perd sa
        connexion en cours de route, il retrouve sa place et son score en
        rejoignant à nouveau.
      </p>
    </section>

    <section class="pro-section">
      <h2>Le choix de la musique</h2>
      <p>
        Vous pouvez partir des <a href="/blind-test">thèmes déjà prêts</a>
        (années 80, rap français, Disney, génériques de séries...) ou construire votre propre playlist en
        important directement depuis Spotify ou Deezer. De quoi coller à votre
        public plutôt qu'à une sélection générique.
      </p>
      <p>
        Deux formats au choix : le Mode Classique, où l'on tape le titre et
        l'artiste, et le Mode QCM avec quatre propositions, plus accessible
        quand les niveaux sont très différents ou quand il y a du monde.
      </p>
    </section>

    <section class="pro-section" id="tarifs">
      <h2>Tarifs</h2>
      <p>
        La version gratuite suffit pour une soirée entre amis. ZIK Pro est fait
        pour les lieux qui animent : plus de joueurs, plus d'équipes, et une
        régie complète sur un second écran pendant que la TV montre le jeu.
      </p>

      <table class="pro-compare">
        <thead><tr><th></th><th>Gratuit</th><th>ZIK Pro</th></tr></thead>
        <tbody>
          {#each COMPARE as [label, free, pro] (label)}
            <tr><th scope="row">{label}</th><td>{free}</td><td>{pro}</td></tr>
          {/each}
        </tbody>
      </table>

      <ul class="pro-plans">
        {#each PLANS as p (p.id)}
          <li class:featured={p.featured}>
            <span class="pro-plan-name">{p.name}</span>
            <span class="pro-plan-price">{p.price}</span>
            <span class="pro-plan-period">{p.period}</span>
            <p>{p.pitch}</p>
          </li>
        {/each}
      </ul>

      <div class="pro-coming">
        <h3>Bientôt dans ZIK Pro</h3>
        <ul>{#each PRO_COMING as c (c)}<li>{c}</li>{/each}</ul>
      </div>

      <div class="pro-waitlist">
        {#if wlState === "done"}
          <p><b>C'est noté.</b> Vous serez prévenu en premier à l'ouverture de ZIK Pro.</p>
        {:else}
          <h3>Le paiement en ligne ouvre bientôt</h3>
          <p>Laissez vos coordonnées : vous serez prévenu en premier, et les premiers lieux inscrits pourront tester ZIK Pro en avant-première.</p>
          <form onsubmit={joinWaitlist}>
            <input type="email" required placeholder="Adresse e-mail" bind:value={wl.email} maxlength="200" />
            <input type="text" placeholder="Nom du lieu ou de l'association" bind:value={wl.venue} maxlength="120" />
            <select bind:value={wl.venueType} aria-label="Type de lieu">
              <option value="bar">Bar ou restaurant</option>
              <option value="camping">Camping ou village vacances</option>
              <option value="association">Association</option>
              <option value="entreprise">Entreprise ou CE</option>
              <option value="autre">Autre</option>
            </select>
            <select bind:value={wl.plan} aria-label="Formule envisagée">
              {#each PLANS as p (p.id)}<option value={p.id}>{p.name} - {p.price}</option>{/each}
            </select>
            <button class="pro-cta-btn" disabled={wlState === "sending"}>{wlState === "sending" ? "Envoi…" : "Être prévenu"}</button>
          </form>
          {#if wlError}<p class="pro-wl-error">{wlError}</p>{/if}
        {/if}
      </div>
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
  #tarifs {
    scroll-margin-top: calc(var(--nav-h) + 16px);
  }
  .pro-header-ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .pro-cta-ghost {
    font-size: 0.9rem;
    color: var(--text);
    text-underline-offset: 3px;
  }
  .pro-compare {
    width: 100%;
    margin: 18px 0 24px;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .pro-compare th,
  .pro-compare td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .pro-compare thead th {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .pro-compare thead th:last-child,
  .pro-compare td:last-child {
    color: var(--accent);
  }
  .pro-compare tbody th {
    font-weight: 600;
  }
  .pro-compare td {
    color: var(--mid);
  }
  .pro-plans {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    padding: 0;
    list-style: none;
  }
  .pro-plans li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px;
    border: 2px solid var(--border2);
    border-radius: 3px;
  }
  .pro-plans li.featured {
    border-color: var(--accent);
    box-shadow: 5px 5px 0 var(--accent);
  }
  .pro-plan-name {
    font-size: 0.85rem;
    color: var(--mid);
  }
  .pro-plan-price {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 2.4rem;
    line-height: 1;
  }
  .pro-plan-period {
    font-size: 0.78rem;
    color: var(--mid);
  }
  .pro-plans p {
    margin-top: 8px;
    font-size: 0.88rem;
  }
  .pro-coming {
    margin-top: 24px;
  }
  .pro-coming h3 {
    margin-bottom: 8px;
  }
  .pro-waitlist {
    margin-top: 24px;
    padding: 20px;
    border: 1px dashed var(--border2);
    border-radius: 3px;
  }
  .pro-waitlist h3 {
    margin-bottom: 6px;
  }
  .pro-waitlist form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 14px;
  }
  .pro-waitlist input,
  .pro-waitlist select {
    padding: 11px 12px;
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 3px;
    color: var(--text);
    font: inherit;
  }
  .pro-waitlist button {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .pro-wl-error {
    margin-top: 8px;
    color: var(--danger);
  }
  @media (max-width: 560px) {
    .pro-waitlist form {
      grid-template-columns: 1fr;
    }
  }
  .pro-page {
    max-width: 860px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 24px) 20px 80px;
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
