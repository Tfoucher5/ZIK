<script>
  import { getContext } from 'svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { fetchPro, proActive, goToStripe } from '$lib/salonClient.js';
  import { PLANS, PRO_PERKS, PRO_COMING, FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "$lib/proPlans.js";

  const COMPARE = [
    ["Joueurs par salon", `jusqu'à ${FREE_MAX_PLAYERS}`, "illimité"],
    ["Équipes", `jusqu'à ${FREE_MAX_TEAMS}`, "jusqu'à 8, renommables"],
    ["Régie sur un second écran", "lancer, pause, manche suivante, exclure un joueur", "tout : révéler, terminer, corriger les points, volume de la TV"],
    ["Réglages en pleine partie", "entre deux parties", "à tout moment"],
  ];

  const zik = getContext('zik');
  const INTENT_KEY = 'zik_pro_intent';

  let pro = $state(null);
  let busy = $state(null);
  let payError = $state('');

  const activePro = $derived(proActive(pro));
  const subscribed = $derived(activePro && pro.plan !== 'night' && pro.plan !== 'manual');
  const endLabel = $derived(pro ? new Date(pro.current_period_end).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '');

  $effect(() => {
    const user = zik.user;
    if (!user) { pro = null; return; }
    fetchPro(zik.sb, user.id)
      .then((data) => {
        pro = data;
        // Formule choisie avant de se connecter : on enchaîne sur le paiement
        let intent = null;
        try { intent = sessionStorage.getItem(INTENT_KEY); sessionStorage.removeItem(INTENT_KEY); } catch { /* stockage indisponible */ }
        if (intent) buy(intent);
      });
  });

  async function buy(plan) {
    payError = '';
    if (!zik.user) {
      try { sessionStorage.setItem(INTENT_KEY, plan); } catch { /* stockage indisponible */ }
      zik.openAuthModal('register');
      return;
    }
    busy = plan;
    try { await goToStripe(zik.sb, '/api/pro/checkout', { plan }); }
    catch (err) { payError = err.message; busy = null; }
  }

  async function openPortal() {
    payError = '';
    busy = 'portal';
    try { await goToStripe(zik.sb, '/api/pro/portal'); }
    catch (err) { payError = err.message; busy = null; }
  }

  // Apparition en cascade des cartes quand elles arrivent à l'écran
  function reveal(node) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { node.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
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
          text: "Le Mode Salon est gratuit jusqu'à 12 joueurs et 2 équipes. ZIK Pro débloque les joueurs illimités, 8 équipes et la régie complète, dès 7,90 € la soirée.",
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
        "Créez une playlist sur mesure à partir de Deezer et transformez-la en blind test en quelques minutes.",
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
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
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
        important directement depuis Deezer. De quoi coller à votre
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

      {#if activePro}
        <div class="pro-status">
          <span class="pro-status-dot" aria-hidden="true"></span>
          <div>
            <b>ZIK Pro est actif sur votre compte</b>
            <span>
              {#if pro.plan === 'night'}Passe Soirée valable jusqu'au {endLabel}.
              {:else if pro.plan === 'manual'}Accès offert jusqu'au {endLabel}.
              {:else}Formule {pro.plan === 'yearly' ? 'Annuel' : 'Mensuel'}, prochaine échéance le {endLabel}.{/if}
            </span>
          </div>
          {#if pro.stripe_customer_id}
            <button class="pro-status-btn" onclick={openPortal} disabled={busy === 'portal'}>
              {busy === 'portal' ? 'Ouverture…' : subscribed ? 'Gérer mon abonnement' : 'Mes factures'}
            </button>
          {/if}
        </div>
      {/if}

      <div class="pro-offers">
        {#each PLANS as p, i (p.id)}
          <article class="pro-offer" class:featured={p.featured} style="--d:{i * 110}ms" use:reveal>
            {#if p.badge}<span class="pro-offer-badge">{p.badge}</span>{/if}
            <h3 class="pro-offer-name">{p.name}</h3>
            <p class="pro-offer-pitch">{p.pitch}</p>
            <div class="pro-offer-price">
              <strong>{p.price}</strong>
              <span>{p.period}</span>
            </div>
            <ul class="pro-offer-perks">
              {#each p.perks as perk (perk)}<li>{perk}</li>{/each}
              <li class="pro-offer-all">Tout ZIK Pro inclus</li>
            </ul>
            <button
              class="pro-offer-btn"
              onclick={() => buy(p.id)}
              disabled={busy !== null || subscribed}
            >
              {#if busy === p.id}Redirection vers le paiement…
              {:else if subscribed}Déjà abonné
              {:else if p.id === 'night'}Prendre la soirée
              {:else}Choisir {p.name.toLowerCase()}{/if}
            </button>
          </article>
        {/each}
      </div>

      {#if payError}<p class="pro-pay-error" role="alert">{payError}</p>{/if}

      <div class="pro-included">
        <h3>Inclus dans toutes les formules</h3>
        <ul>{#each PRO_PERKS as c (c)}<li>{c}</li>{/each}</ul>
      </div>

      <ul class="pro-trust">
        <li><b>Paiement sécurisé</b> par Stripe : carte, Apple Pay, Google Pay</li>
        <li><b>Facture automatique</b> envoyée par e-mail à chaque paiement</li>
        <li><b>Sans engagement</b> : résiliation en un clic depuis cette page</li>
      </ul>
      <p class="pro-legal-note">
        Prix en euros, TVA non applicable. En payant, vous acceptez les
        <a href="/cgv">conditions générales de vente</a>. Un compte ZIK gratuit
        est nécessaire pour rattacher ZIK Pro à vos salons.
      </p>

      <div class="pro-coming">
        <h3>Bientôt dans ZIK Pro</h3>
        <ul>{#each PRO_COMING as c (c)}<li>{c}</li>{/each}</ul>
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
        <dt>Comment se passe le paiement ?</dt>
        <dd>
          Choisissez une formule, payez par carte, Apple Pay ou Google Pay sur
          la page sécurisée de Stripe, et ZIK Pro s'active tout de suite sur
          votre compte. Le reçu et la facture arrivent par e-mail.
        </dd>
        <dt>Puis-je arrêter quand je veux ?</dt>
        <dd>
          Oui. Le passe Soirée ne se renouvelle jamais. Les abonnements se
          résilient en un clic depuis cette page : ZIK Pro reste actif jusqu'à
          la fin de la période déjà payée, sans autre prélèvement.
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
  @property --pro-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  .pro-status {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: 0 0 20px;
    padding: 14px 18px;
    border: 1px solid rgb(var(--accent-rgb) / 0.4);
    border-radius: 14px;
    background: rgb(var(--accent-rgb) / 0.08);
  }
  .pro-status > div {
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.88rem;
    color: var(--mid);
  }
  .pro-status b {
    color: var(--text);
  }
  .pro-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgb(var(--accent-rgb) / 0.6);
    animation: pro-ping 2s infinite;
  }
  .pro-status-btn {
    padding: 9px 16px;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: none;
    color: var(--accent);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .pro-offers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: stretch;
    margin-top: 8px;
  }
  .pro-offer {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 26px 22px 22px;
    border: 1px solid var(--border2);
    border-radius: 18px;
    background: rgb(var(--c-glass) / 0.04);
    opacity: 0;
    transform: translateY(24px);
    transition:
      opacity 0.6s ease var(--d),
      transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) var(--d),
      box-shadow 0.25s ease,
      border-color 0.25s ease;
  }
  .pro-offer:global(.in) {
    opacity: 1;
    transform: none;
  }
  .pro-offer:global(.in):hover {
    transform: translateY(-6px);
    border-color: rgb(var(--accent-rgb) / 0.6);
    box-shadow: 0 18px 40px -18px rgb(var(--accent-rgb) / 0.55);
  }
  .pro-offer.featured {
    border-color: transparent;
    background:
      linear-gradient(var(--bg), var(--bg)) padding-box,
      conic-gradient(
          from var(--pro-angle),
          var(--accent),
          rgb(var(--accent-rgb) / 0.15),
          #ff00ff,
          rgb(var(--accent-rgb) / 0.15),
          var(--accent)
        )
        border-box;
    border-width: 2px;
    animation: pro-spin 5s linear infinite;
  }
  .pro-offer.featured::before {
    content: "";
    position: absolute;
    inset: -1px;
    z-index: -1;
    border-radius: inherit;
    background: radial-gradient(
      60% 50% at 50% 0%,
      rgb(var(--accent-rgb) / 0.35),
      transparent
    );
    filter: blur(24px);
  }
  .pro-offer-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pro-offer-name {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  .pro-section .pro-offer-pitch {
    margin: -8px 0 0;
    font-size: 0.86rem;
    min-height: 3em;
  }
  .pro-offer-price {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pro-offer-price strong {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 3.2rem;
    font-weight: 900;
    line-height: 1;
    color: var(--text);
  }
  .pro-offer.featured .pro-offer-price strong {
    background: linear-gradient(90deg, var(--accent), #ff00ff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .pro-offer-price span {
    font-size: 0.8rem;
    color: var(--mid);
  }
  .pro-section ul.pro-offer-perks {
    flex: 1;
    margin: 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .pro-section ul.pro-offer-perks li {
    font-size: 0.86rem;
    padding-left: 24px;
  }
  .pro-section ul.pro-offer-perks li::before {
    content: "✓";
  }
  .pro-section ul.pro-offer-perks li.pro-offer-all {
    color: var(--text);
    font-weight: 700;
  }
  .pro-offer-btn {
    width: 100%;
    padding: 13px 16px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    background: rgb(var(--c-glass) / 0.06);
    color: var(--text);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.02rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .pro-offer-btn:hover:not(:disabled) {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .pro-offer-btn:active:not(:disabled) {
    transform: scale(0.98);
  }
  .pro-offer.featured .pro-offer-btn {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .pro-offer-btn:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .pro-pay-error {
    margin-top: 14px;
    color: var(--danger);
  }
  .pro-included {
    margin-top: 28px;
  }
  .pro-included h3,
  .pro-coming h3 {
    margin-bottom: 10px;
  }
  .pro-section .pro-included ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 8px 20px;
  }
  .pro-section ul.pro-trust {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 20px;
  }
  .pro-section ul.pro-trust li {
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.82rem;
  }
  .pro-section ul.pro-trust li::before {
    content: none;
  }
  .pro-trust b {
    display: block;
    color: var(--text);
  }
  .pro-section .pro-legal-note {
    font-size: 0.8rem;
    color: var(--dim);
  }
  .pro-coming {
    margin-top: 24px;
  }
  @keyframes pro-spin {
    to {
      --pro-angle: 360deg;
    }
  }
  @keyframes pro-ping {
    70% {
      box-shadow: 0 0 0 10px rgb(var(--accent-rgb) / 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgb(var(--accent-rgb) / 0);
    }
  }
  @media (max-width: 760px) {
    .pro-offers,
    .pro-section ul.pro-trust {
      grid-template-columns: 1fr;
    }
    .pro-offer.featured {
      order: -1;
    }
    .pro-section .pro-offer-pitch {
      min-height: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pro-offer {
      opacity: 1;
      transform: none;
      transition: none;
    }
    .pro-offer.featured,
    .pro-status-dot {
      animation: none;
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
    color: var(--on-accent);
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
