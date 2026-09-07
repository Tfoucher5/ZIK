<script>
  import { KOFI_URL } from '$lib/support.js';

  // Pseudos des personnes qui ont soutenu le projet — ajoutés à la main.
  const SUPPORTERS = [];
</script>

<svelte:head>
  <title>ZIK — Soutenir le projet</title>
  <meta name="description" content="ZIK est gratuit et le restera. Si le blind test te plaît, tu peux aider à payer le serveur." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/soutenir" />
</svelte:head>

<main class="sup-root">
  <nav class="breadcrumb" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a>
    <span class="breadcrumb-sep">/</span>
    <span>Soutenir</span>
  </nav>

  <h1 class="sup-title">Soutenir ZIK</h1>
  <p class="sup-subtitle">
    ZIK est gratuit, sans compte obligatoire et sans pub qui te coupe une manche. Ça ne changera pas.
    Mais le serveur, lui, se paie tous les mois.
  </p>

  <section class="sup-card">
    <h2 class="sup-card-head">Où va l'argent</h2>
    <p>
      ZIK tourne sur un serveur qui coûte <strong>entre 5 et 15 € par mois</strong>, facturé à la consommation.
      Plus il y a de parties, plus la note monte — c'est plutôt bon signe, mais c'est aujourd'hui payé
      de ma poche. Il n'y a personne derrière ZIK à part moi : pas d'entreprise, pas d'investisseur,
      pas de salaire.
    </p>
    <div class="sup-figures">
      <div class="sup-fig">
        <span class="sup-fig-num">600+</span>
        <span class="sup-fig-label">joueurs inscrits</span>
      </div>
      <div class="sup-fig">
        <span class="sup-fig-num">3 000+</span>
        <span class="sup-fig-label">parties jouées</span>
      </div>
      <div class="sup-fig">
        <span class="sup-fig-num">13 000+</span>
        <span class="sup-fig-label">titres au catalogue</span>
      </div>
    </div>
    <p>
      Un don ne t'achète rien : pas de bonus, pas d'avantage en jeu, pas de contenu réservé.
      Tout le monde a exactement le même ZIK. C'est juste un coup de main pour que le serveur
      reste allumé.
    </p>
  </section>

  <div class="sup-cta">
    <a href={KOFI_URL} class="sup-btn" target="_blank" rel="noopener noreferrer">
      Participer aux frais
    </a>
    <span class="sup-cta-note">Paiement sécurisé via Ko-fi · à partir de 1 €</span>
  </div>

  <section class="sup-alt">
    <h2 class="sup-card-head">Aider sans donner un centime</h2>
    <ul class="sup-alt-list">
      <li><strong>Amène du monde.</strong> Un blind test à deux, c'est triste. C'est le vrai besoin du projet.</li>
      <li><strong>Signale les bugs et les titres muets</strong> depuis le jeu — ça prend dix secondes et ça sert à tout le monde.</li>
      <li><strong>Passe sur le <a href="https://discord.gg/Xkr9aUEKYf" target="_blank" rel="noopener noreferrer">Discord</a></strong> pour dire ce qui manque.</li>
    </ul>
  </section>

  {#if SUPPORTERS.length}
    <section class="sup-thanks">
      <h2 class="sup-card-head">Merci</h2>
      <p class="sup-thanks-list">{SUPPORTERS.join(' · ')}</p>
    </section>
  {/if}
</main>

<style>
  .breadcrumb {
    display: flex;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--mid);
    margin-bottom: 24px;
  }
  .breadcrumb a { color: inherit; text-decoration: none; }
  .breadcrumb a:hover { color: var(--text); }

  .sup-root {
    max-width: 780px;
    margin: 0 auto;
    padding: 100px 20px 80px;
  }

  .sup-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(2.2rem, 6vw, 3.2rem);
    font-weight: 800;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    margin: 0 0 12px;
    color: var(--text);
  }

  .sup-subtitle {
    font-size: 1rem;
    line-height: 1.65;
    color: var(--mid);
    margin: 0 0 40px;
    max-width: 60ch;
  }

  .sup-card,
  .sup-alt,
  .sup-thanks {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 4px;
    padding: 28px;
    margin-bottom: 28px;
  }

  .sup-card-head {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 16px;
  }

  .sup-card p,
  .sup-alt-list {
    font-size: 0.94rem;
    line-height: 1.7;
    color: var(--mid);
    margin: 0 0 18px;
  }

  .sup-card p:last-child {
    margin-bottom: 0;
  }

  .sup-card strong,
  .sup-alt-list strong {
    color: var(--text);
    font-weight: 700;
  }

  .sup-figures {
    display: flex;
    flex-wrap: wrap;
    gap: 28px;
    padding: 22px 0;
    margin-bottom: 18px;
    border-top: 1px solid var(--border2);
    border-bottom: 1px solid var(--border2);
  }

  .sup-fig {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sup-fig-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.9rem;
    font-weight: 800;
    line-height: 1;
    color: var(--text);
  }

  .sup-fig-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }

  .sup-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 0 0 40px;
  }

  .sup-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0 42px;
    background: var(--accent);
    color: #0b0b12;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-decoration: none;
    border-radius: 2px;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .sup-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgb(var(--accent-rgb) / 0.35);
  }

  .sup-cta-note {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mid);
  }

  .sup-alt-list {
    padding-left: 20px;
    margin-bottom: 0;
  }

  .sup-alt-list li {
    margin-bottom: 10px;
  }

  .sup-alt-list li:last-child {
    margin-bottom: 0;
  }

  .sup-alt-list a {
    color: var(--accent);
  }

  .sup-thanks-list {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text);
    margin: 0;
  }

  @media (max-width: 600px) {
    .sup-root {
      padding-top: 84px;
    }
  }

  @media (max-width: 640px) {
    .sup-card,
    .sup-alt,
    .sup-thanks {
      padding: 20px;
    }
    .sup-figures {
      gap: 20px;
    }
  }
</style>
